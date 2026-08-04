# Deuda Técnica — Code Panel Backend

Análisis ordenado por pilares críticos del negocio, del más al menos prioritario. Cada hallazgo incluye: problema, impacto, recomendación y referencia a los archivos involucrados.

---

## Pilar 0 — Seguridad y confiabilidad del sandbox (riesgo directo al VPS)

### DEBT‑01: Los contenedores Docker pueden quedar huérfanos

- **Archivos**: `src/services/execution.service.ts:62-118`
- **Problema**: Si el proceso Node se cae entre `createContainer` y el `finally`, el contenedor queda corriendo. El `finally` con `remove({ force: true })` silencia errores (`catch (e) {}`) y no hay un mecanismo externo de reconciliación.
- **Impacto**: Fuga de recursos en el VPS. Acumulación de contenedores zombie que consumen RAM y CPU.
- **Recomendación**:
  1. Agregar `readOnly: true` al HostConfig para evitar escrituras en el FS del contenedor.
  2. Agregar `SecurityOpt: ["no-new-privileges:true"]`.
  3. Registrar IDs de contenedores activos y ejecutar un job periódico de limpieza (`docker ps -aq --filter status=exited`).
  4. Usar `AutoRemove: true` (actualmente está en `false`) para que Docker limpie automáticamente al finalizar.
  5. No silenciar errores del `finally`.

### DEBT‑02: Sin límite de contenedores concurrentes

- **Archivos**: `src/services/execution.service.ts:55-56`
- **Problema**: Nada impide que 1000 requests lancen 1000 contenedores simultáneamente. El rate limit por IP mitiga parcialmente, pero es trivial de evadir con proxies.
- **Impacto**: DoS trivial contra el VPS derribando el host. Agotamiento de RAM/CPU del VPS.
- **Recomendación**:
  1. Implementar un semáforo global con límite de contenedores concurrentes (ej. `p-limit` con `concurrency = 5`).
  2. Cola de ejecución con FIFO y timeout.

### DEBT‑03: Sin validación de tamaño de entrada

- **Archivos**: `src/controllers/execution.controller.ts:14-18`, `src/controllers/submission.controller.ts:14-16`
- **Problema**: No hay límite en el tamaño de `code`, `stdin`, o `files`. Un atacante puede enviar archivos gigantes (varios GB en Base64) que saturan memoria y disco.
- **Impacto**: DoS por agotamiento de memoria del proceso Node. Posible llenado del disco del VPS con tars enormes.
- **Recomendación**:
  1. Limitar `express.json()` con `limit: '1mb'`.
  2. Validar tamaño máximo de cada `file.content` (decodificado) antes de procesarlo.
  3. Validar `stdin` a máximo 64 KB decodificado.

---

## Pilar 1 — Inyección de dependencias y acoplamiento

### DEBT‑04: Servicios como singletons acoplados estáticamente

- **Archivos**: Todos los services (`src/services/*.ts`), todos los controllers (`src/controllers/*.ts`)
- **Problema**: Cada servicio se exporta como `export default new MiServicio()` y se importa directamente. Los servicios referencian a otros servicios mediante imports directos (ej. `submission.service.ts` importa `evaluationService`, `activity.service.ts` es importado por `test-case.service.ts`). No hay contenedor de DI.
- **Impacto**:
  - **Imposible testear unitariamente**: no se puede mockear `executionService` dentro de `evaluationService`.
  - **Acoplamiento fuerte**: cambiar la firma de un servicio rompe a todos sus consumidores.
  - **Dificulta escalar**: no se puede reemplazar `executionService` por otra implementación (ej. Kubernetes jobs en vez de Docker local).
- **Recomendación**:
  1. Usar `tsyringe` como contenedor ligero de DI (sintaxis `@injectable()`, `@inject()`).
  2. Todas las dependencias se reciben por constructor, no por import directo.
  3. Los singletons se registran en un módulo central y se resuelven desde el contenedor.

```typescript
// Antes (actual)
import executionService from "./execution.service.js";
export class EvaluationService {
  async evaluate(...) {
    const result = await executionService.runCodeWithFiles(...);
  }
}

// Después (con DI)
@injectable()
export class EvaluationService implements IEvaluationService {
  constructor(
    @inject("IExecutionService") private executionService: IExecutionService
  ) {}
}
```

### DEBT‑05: Patrón de exportación inconsistente

- **Archivos**: `src/controllers/activity.controller.ts:10`, `src/services/activity.service.ts:10`
- **Problema**: Casi todos los servicios se exportan como `export default new Xxx()`, pero `ActivityService` se instancia manualmente en su controller con `const activityService = new ActivityService()`. Todos los servicios se exportan como default singleton excepto `ActivityService`.
- **Impacto**: Confusión sobre cuál es el patrón canónico. Posibles múltiples instancias de `ActivityService`.
- **Recomendación**: Uniformizar antes de migrar a DI.

---

## Pilar 2 — Manejo de errores (hoy no hay)

### DEBT‑06: Sin manejo centralizado de errores

- **Archivos**: Los 9 controllers (`src/controllers/*.ts`), `src/app.ts`
- **Problema**: Cada controller tiene su propio `try/catch` con lógica de status code duplicada. Formatos de respuesta inconsistentes: algunos devuelven `{ error }`, otros `{ success: false, error }`, otros `{ message }`. No hay clases de error de dominio.
- **Impacto**: ~300 líneas de boilerplate repetido. Cliente recibe formatos distintos según el endpoint. Imposible agregar logging o monitoreo transversal de errores.
- **Recomendación**:
  1. Crear jerarquía de errores de dominio:

```typescript
// src/common/errors/app-error.ts
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;
}
export class NotFoundError extends AppError { ... }       // 404
export class ValidationError extends AppError { ... }     // 400
export class UnauthorizedError extends AppError { ... }   // 401
export class ForbiddenError extends AppError { ... }      // 403
export class ConflictError extends AppError { ... }       // 409
export class BusinessError extends AppError { ... }       // 422
```

  2. Middleware global de errores en Express:

```typescript
// src/common/error-handler.middleware.ts
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, code: err.errorCode });
  }
  console.error("[Unhandled]", err);
  return res.status(500).json({ error: "Error interno del servidor" });
};
```

  3. Eliminar todos los `try/catch` de controllers. Los servicios lanzan `AppError`, el middleware responde.

### DEBT‑07: Errores de BD silenciados bajo "Invalid credentials"

- **Archivos**: `src/services/user.service.ts:23-30`
- **Problema**: `findByAnyIdentifierAndRole` captura cualquier error y lanza "Invalid credentials". Si la BD está caída, el usuario recibe "Invalid credentials" en vez de un 503.
- **Impacto**: Imposible diagnosticar fallos de infraestructura. Peor experiencia de usuario.
- **Recomendación**: Dejar que los errores de Prisma/BD se propaguen. El error handler global los convertirá a 503.

---

## Pilar 3 — Validación de requests (hoy ausente)

### DEBT‑08: Request body sin validación en runtime

- **Archivos**: Todos los controllers (`src/controllers/*.ts`), tipos en `src/types/requests/`
- **Problema**: El body se castea con `as` (ej. `const data: CreateActivityRequest = req.body`). Si vienen campos extra, tipos incorrectos, o falta `title`, el código sigue adelante y falla con errores oscuros de Prisma.
- **Impacto**: Errores 500 difíciles de debuggear. Vulnerabilidad a mass-assignment. El cliente no recibe mensajes de validación útiles.
- **Recomendación**:
  1. Crear schemas Zod para cada request. Ejemplo:

```typescript
// src/validators/activity.validators.ts
export const createActivitySchema = z.object({
  subjectId: z.number().int().positive(),
  languageId: z.number().int().positive(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  starterCode: z.array(codeFileSchema).optional(),
  maxAttempts: z.number().int().min(0).optional(),
  allowCopy: z.boolean().optional(),
  allowPaste: z.boolean().optional(),
});
```

  2. Middleware de validación:

```typescript
export const validate = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(formatZodErrors(result.error));
  }
  req.body = result.data; // Tipado inferido
  next();
};
```

### DEBT‑09: Base64 solo validado con regex, no decodificado

- **Archivos**: `src/helpers/base64-validator.helper.ts`
- **Problema**: `isBase64` solo verifica que el string se parezca a Base64. No intenta decodificarlo. Un string con caracteres válidos pero corrupción interna pasa la validación y falla después en `Buffer.from(content, "base64")`.
- **Impacto**: Errores 500 en el motor de ejecución sin mensaje claro.
- **Recomendación**: Además del regex, intentar `Buffer.from(str, "base64").toString("base64") === str`. O usar `atob`/`btoa` del estándar.

---

## Pilar 4 — Testing

### ~~DEBT‑10: Cero tests~~ ✅ RESUELTO

- **Resuelto en**: Sesión de testing completa con Vitest + supertest
- **Solución implementada**:
  - Framework: Vitest 4.x con cobertura V8
  - 187 tests distribuidos en 19 archivos
  - **Unit tests**: Helpers (base64, pagination, param), Services (token, evaluation, user, invitation, auth, subject, activity, test-case, submission), Middlewares (auth, rbac)
  - **Integration tests**: Endpoints HTTP completos (auth, subject, activity, submission) con supertest
  - **Edge cases**: ReDoS en base64, valores extremos en paginación, IDs flotantes, roles con case incorrecto, RBAC con array vacío
  - **Fix aplicado**: Regex de `isBase64` corregido para aceptar base64 sin padding (RFC 4648)
  - **Comandos disponibles**:
    - `npm test` — Modo watch
    - `npm run test:run` — Ejecución única
    - `npm run test:coverage` — Con reporte de cobertura
- **Nota**: Los tests congelan el comportamiento actual del sistema, permitiendo refactorizaciones seguras (ej. migración a DI).

---

## Pilar 5 — Mantenibilidad y consistencia del código

### DEBT‑11: Tipos `any` por todo el código

- **Archivos**: 
  - Controllers: `(req as any).user`, `(req as any).role` (6+ controladores)
  - Services: `tx: any`, `data: any`, `error: any`, `(data.starterCode as any)`
  - Express augmentation: `src/types/global/express.d.ts` importa `role.enum.ts` (extensión `.ts` en vez de `.js`)
- **Problema**: La declaración de aumento de Express existe pero no funciona porque:
  1. Importa con extensión `.ts` en vez de `.js` (violación de ESM + `verbatimModuleSyntax`)
  2. No está siendo reconocida por el compilador, forzando `as any` en todas partes
- **Impacto**: Se pierde totalmente el tipado de TypeScript en la capa más crítica (request context). Errores en producción por casteos incorrectos.
- **Recomendación**:
  1. Corregir `express.d.ts`: cambiar `.ts` por `.js`.
  2. Verificar que `tsconfig.json` incluya `src/types/global` (actualmente está en `typeRoots` pero no en `include`).
  3. Agregar `"include": ["src/**/*.ts", "src/types/global/**/*.d.ts"]` al tsconfig.
  4. Eliminar todos los `as any` y usar `req.user`/`req.role` tipados correctamente.

### DEBT‑12: Estilos inconsistentes en controladores

- **Archivos**: Los 9 controllers
- **Problema**: Tres estilos distintos en un mismo proyecto:
  | Estilo | Archivos |
  |--------|----------|
  | `async metodo() {}` | `auth.controller.ts`, `invitation.controller.ts`, `programming-language.controller.ts` |
  | `public async metodo() {}` | `activity.controller.ts`, `subject.controller.ts` |
  | `public metodo = async () => {}` | `user.controller.ts`, `execution.controller.ts` (parcial) |
- **Impacto**: Confunde a nuevos desarrolladores. Algunos estilos (arrow functions) no hacen bind correcto del `this`.
- **Recomendación**: Estandarizar en `public async metodo(req: Request, res: Response): Promise<void>` en todos los controladores.

### DEBT‑13: Interfaces con implementación parcial

- **Archivos**: `src/services/interfaces/`
- **Problema**: Solo 6 de 9 servicios tienen interfaz. `InvitationService`, `ProgrammingLanguageService`, `AuthService`, `UserService` no la tienen. Los que sí la tienen, no siempre se usan (los controllers importan la implementación concreta, no la interfaz).
- **Impacto**: Las interfaces existen pero no cumplen su propósito de desacoplamiento. Es código muerto que da falsa sensación de arquitectura limpia.
- **Recomendación**: O bien eliminar las interfaces no usadas, o bien migrar a DI para que tengan utilidad real.

### DEBT‑14: Código muerto

- **Archivos**:
  - `src/services/execution.service.ts:45` — variable `executionCommand` definida y nunca usada (se usa `finalCommand`).
  - `src/services/auth.service.ts:56-61` — método privado `consumeInvitation` nunca invocado (se usa `invitationService.validateAndConsume`).
  - `src/controllers/user.controller.ts:45` — filtra `undefined` de updateData pero Prisma ya ignora `undefined`.
- **Impacto**: Confusión al leer el código. Posibles bugs si alguien asume que se usa.

### DEBT‑15: El seed tiene su propio singleton de Prisma (duplicación)

- **Archivos**: `prisma/seed.ts:8-14` vs `src/config/prisma.ts`
- **Problema**: El seed replica la lógica del singleton de PrismaClient en vez de importarla. Si cambia la configuración de Prisma, hay que acordarse de cambiar dos archivos.
- **Recomendación**: El seed debe importar `prisma` desde `src/config/prisma.ts` (ajustando el path relativo).

---

## Pilar 6 — Observabilidad

### DEBT‑16: Sin logging estructurado

- **Archivos**: Todo el proyecto
- **Problema**: Solo se usa `console.log` y `console.error`. Sin niveles (info, warn, error, debug), sin correlation IDs, sin timestamps estructurados.
- **Impacto**: Imposible hacer troubleshooting en producción. No se puede medir latencia por request. No hay trazabilidad entre requests.
- **Recomendación**:
  1. Agregar `pino` (más rápido y ligero que winston para Node).
  2. Middleware de request ID (UUID por request, propagado via `X-Request-Id`).
  3. Log de entrada/salida de cada request con duración y status code.

### DEBT‑17: Sin health check ni readiness probe

- **Archivos**: `src/app.ts`
- **Problema**: No hay endpoint `/health` que verifique conexión a BD y a Docker. No hay `/ready`. Docker compose no puede saber si el contenedor está sano.
- **Impacto**: Si la BD se cae, el orquestador no lo sabe y sigue enviando tráfico. Reinicios innecesarios o falta de reinicios.
- **Recomendación**: Agregar `GET /health` y `GET /ready` con chequeos de BD y Docker socket.

---

## Pilar 7 — Base de datos

### DEBT‑18: El seed usa conexión directa de pg en lugar del singleton

- **Archivos**: `prisma/seed.ts:8-14`
- **Problema**: Duplica lógica de conexión (ver DEBT‑15). Pero además crea un nuevo Pool sin cerrar.
- **Recomendación**: Usar el singleton de `src/config/prisma.ts`.

### DEBT‑19: Faltan índices en la BD

- **Archivos**: `prisma/schema.prisma`
- **Problema**: Solo hay un índice personalizado (`@@index([studentId, activityId])` en Submission). Las búsquedas por `userId`, `professorId`, `subjectId`, `languageId`, `roleId` se hacen con sequential scan.
- **Impacto**: Conforme crezcan los datos, las queries serán lentas.
- **Recomendación**: Agregar índices en:
  - `Subject.userId` (mis materias)
  - `Activity.professorId` (mis actividades)
  - `Activity.subjectId` (actividades de una materia)
  - `InvitationCode.roleId` (filtrado por rol)
  - `Enrollment.studentId` (mis inscripciones)

---

## Pilar 8 — Rate limiting y abuso

### DEBT‑20: Rate limit desalineado con lo documentado

- **Archivos**: `src/middlewares/rateLimiter.middleware.ts:4`, `AGENTS.md:182`
- **Problema**: El código permite **10** ejecuciones cada 5 minutos. El AGENTS.md documenta **2**. La diferencia es 5x.
- **Impacto**: Si 2 es el requisito académico real, se está permitiendo 5 veces más tráfico del debido, exponiendo el VPS.
- **Recomendación**: Cambiar `max: 10` a `max: 2` para alinearse con el requisito de negocio documentado.

### DEBT‑21: Sin rate limiting en login

- **Archivos**: `src/routes/auth.routes.ts`
- **Problema**: `POST /auth/login` no tiene rate limiting. Un atacante puede hacer fuerza bruta contra contraseñas sin límite.
- **Impacto**: Riesgo de compromiso de cuentas, especialmente con contraseñas débiles (aunque se usa bcrypt, sigue siendo un vector).
- **Recomendación**: Agregar rate limiting al endpoint de login: 5 intentos por IP cada 15 minutos.

---

## Pilar 9 — Estructura del proyecto y DX

### DEBT‑22: Tipos desorganizados entre múltiples carpetas

- **Archivos**: `src/types/dtos/invitations/`, `src/types/requests/`, `src/types/responses/`, `src/types/models/`
- **Problema**: Las invitaciones tienen carpeta `dtos/invitations/` con 3 archivos. El resto usa `requests/` y `responses/` con nombres planos. No hay consistencia en el criterio de organización.
- **Impacto**: Difícil predecir dónde está un tipo. La carpeta `dtos` es redundante con `requests`.
- **Recomendación**: Unificar en una sola convención. O todo bajo `requests/` y `responses/`, o migrar a feature-folders (`src/modules/auth/`, `src/modules/activity/`, etc.).

### DEBT‑23: Variables de CORS hardcodeadas

- **Archivos**: `src/app.ts:10-16`
- **Problema**: Los orígenes permitidos están hardcodeados. Si cambia el dominio del frontend, hay que modificar código y redeploy.
- **Recomendación**: `CORS_ORIGINS="http://localhost:5173,https://codepanel.orchfr.duckdns.org"` en `.env` y parsearlo en `env.config.ts`.

---

## Pilar 10 — Funcionalidades faltantes del negocio

### DEBT‑24: ¿Cómo se matriculan los estudiantes a las materias?

- **Archivos**: `src/routes/subject.routes.ts`, `src/controllers/subject.controller.ts`
- **Problema**: No hay endpoint para que un estudiante se matricule en una materia. Existe el modelo `Enrollment` en la BD pero sin endpoints expuestos.
- **Impacto**: El flujo de negocio está incompleto. Los estudiantes no pueden unirse a materias.
- **Recomendación**: Agregar endpoints:
  - `POST /subject/:id/enroll` (Student)
  - `DELETE /subject/:id/enroll` (desmatricularse)
  - `GET /subject/me` (mis materias como estudiante)

### DEBT‑25: Sin endpoint de consulta de entregas

- **Archivos**: `src/routes/activity.routes.ts`
- **Problema**: No hay forma de que un profesor vea las entregas de sus alumnos, ni que un alumno vea su historial. Solo existe el POST para enviar.
- **Impacto**: La función de "revisar entregas" del negocio no está implementada.
- **Recomendación**: Agregar:
  - `GET /activity/:id/submissions` (Teacher — ve entregas de todos los alumnos)
  - `GET /activity/:id/my-submissions` (Student — ve su historial de entregas)

### DEBT‑26: Workspace es público sin ninguna autenticación

- **Archivos**: `src/routes/activity.routes.ts:14`
- **Problema**: `GET /activity/:id/workspace` no requiere auth. Cualquiera que conozca un UUID de actividad puede ver los casos de prueba públicos y el código inicial.
- **Impacto**: Riesgo bajo ahora (solo casos públicos), pero si en el futuro se agrega información sensible al workspace, quedará expuesta.
- **Recomendación**: Agregar al menos `optionalAuthenticate` y loguear accesos anónimos. Idealmente requerir auth si `isHidden` es false (aprovechar para filtrar).

---

## Pilar 11 — Documentación de API (Swagger/OpenAPI)

### DEBT‑27: OpenAPI spec es standalone, debe migrar a auto‑generación (Fase 2)

- **Archivos**: `docs/api/openapi.yaml`, `src/config/swagger.ts`
- **Problema**: El spec OpenAPI 3.1 se mantiene manualmente en un archivo YAML. Puede desincronizarse de los tipos y la lógica real del código con el tiempo.
- **Impacto**: Riesgo de que el contrato documentado no refleje el comportamiento real de la API. El frontend consumiría documentación incorrecta.
- **Plan de migración**: Cuando se implemente la validación Zod para requests (DEBT‑08), migrar la generación del spec a `@asteasolutions/zod-to-openapi`. Los schemas Zod serán la fuente única de verdad tanto para validación en runtime como para documentación.
- **Dependencia**: DEBT‑08 debe resolverse primero.
- **Endpoint del contrato**: `GET /docs/openapi.json` — disponible en todos los entornos. `GET /docs` (Swagger UI) — solo en desarrollo.

---

## Pilar 12 — CI/CD y despliegue

### DEBT‑28: VPS no usa compose.prod.yaml del repositorio

- **Archivos**: `.github/workflows/cd_deploy_on_vps.yml`, `compose.prod.yaml`
- **Problema**: El workflow de CD ejecuta `docker compose pull` y `docker compose up -d` sin especificar un archivo compose. El VPS probablemente tiene su propio `compose.yaml` o `docker-compose.yml` local que no está versionado. Mientras tanto, el repositorio tiene `compose.prod.yaml` como punto único de verdad para producción.
- **Impacto**: 
  - El compose del VPS puede desincronizarse del repositorio.
  - Nuevos desarrolladores no saben qué compose se usa en producción.
  - Cambios en la infraestructura requieren SSH manual al VPS en lugar de un PR.
- **Recomendación**:
  1. Configurar el VPS para usar `compose.prod.yaml` del repositorio (o un symlink/copia sincronizada).
  2. Actualizar el workflow CD para usar `docker compose -f compose.prod.yaml`.
  3. Hacer que el repositorio sea la fuente única de verdad para la configuración de despliegue.
  4. Documentar el proceso de sincronización del compose al VPS.

---

## Pilar 13 — Gestión de archivos y medios

### DEBT‑29: Subida directa de imágenes para materias

- **Archivos**: `src/routes/subject.routes.ts`, `src/services/subject.service.ts`
- **Problema**: Actualmente las materias solo aceptan una URL de imagen (`imageUrl`). Los profesores deben subir la imagen a un servicio externo (Imgur, S3, etc.) y luego pegar la URL. Esto es incómodo y propenso a enlaces rotos.
- **Impacto**:
  - Mala experiencia de usuario para profesores.
  - Dependencia de servicios externos que pueden caer o cambiar sus políticas.
  - URLs que se rompen con el tiempo, dejando materias sin imagen.
- **Recomendación**:
  1. Implementar endpoint de subida de imágenes con `multipart/form-data`.
  2. Almacenar imágenes en el sistema de archivos del VPS (ej. `/uploads/subjects/`) o en un servicio de almacenamiento (S3, Cloudflare R2).
  3. Validar tipo de archivo (solo JPEG, PNG, WebP) y tamaño máximo (ej. 5 MB).
  4. Generar thumbnails automáticos para optimizar carga en el frontend.
  5. Agregar endpoint para eliminar imágenes no utilizadas.
  6. Considerar CDN para servir las imágenes eficientemente.

---

## Resumen de prioridades

| Prioridad | DEBTs | Pilar | Acción sugerida |
|-----------|-------|-------|-----------------|
| **Crítica** | 01, 02, 03 | Sandbox | Corregir fugas de contenedores y DoS |
| **Alta** | 08, 09, 20 | Validación + Rate limit | Zod schemas y corregir límite a 2 |
| **Alta** | 06, 07 | Error handling | AppError + middleware global |
| **Alta** | 04, 05 | DI + acoplamiento | tsyringe, desacoplar servicios |
| **Alta** | 11 | Tipos `any` | Arreglar express.d.ts y eliminar casteos |
| **Media** | 12, 13, 14, 15 | Consistencia | Uniformizar estilos, limpiar código muerto |
| **Media** | 16, 17 | Observabilidad | pino, health check |
| **Media** | 19, 21 | BD + auth | Índices, rate limit en login |
| **Media** | 24, 25, 26 | Negocio | Endpoints de enrollment y submissions |
| **Media** | 28 | CI/CD | Configurar VPS para usar compose.prod.yaml |
| **Media** | 29 | Archivos | Implementar subida directa de imágenes para materias |
| **Baja** | 18, 22, 23 | DX | Organizar tipos, CORS en env |
| **Seguimiento** | 27 | OpenAPI | Migrar a zod-to-openapi cuando se implemente DEBT‑08 |
