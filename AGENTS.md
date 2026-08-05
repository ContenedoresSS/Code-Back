# Code Panel — Backend

Sistema de ejecución remota de código y calificación automática para la **UADY** (Yucatán), desarrollado como proyecto de **servicio social**. Se integra con **Moodle** embebiendo el frontend del editor de código mediante un **iframe** en las actividades del LMS.

El backend se despliega con **Docker** sobre un **VPS en Oracle Cloud**.

---

## 1. Usuarios y roles

| Rol       | Cómo ingresa                | Qué puede hacer                                                        |
| --------- | --------------------------- | ---------------------------------------------------------------------- |
| **God**   | Cuenta creada directamente  | Administrar códigos de invitación, lenguajes de programación, todo     |
| **Teacher** | Código de invitación     | Crear materias, actividades, casos de prueba; revisar entregas         |
| **Student** | Registro libre (email)   | Matricularse a materias, escribir/ejecutar código, enviar soluciones   |

- El rol **God** esquiva todas las verificaciones de RBAC.
- Solo los **Teacher** requieren código de invitación para registrarse; los estudiantes se registran libremente.

---

## 2. Flujo de negocio principal

1. **God** crea códigos de invitación para profesores.
2. **Profesor** se registra con la invitación → crea una **materia** → crea una **actividad de código** (título, descripción, lenguaje, código inicial, intentos máximos, flags copy/paste) → agrega **casos de prueba** (públicos y ocultos).
3. **Alumno** se registra con email → se matricula a la materia → abre la actividad desde Moodle (iframe) → escribe código en el editor → lo **ejecuta** para probar (rate‑limited) → **envía** la solución definitiva.
4. El backend **evalúa automáticamente** el código contra los casos de prueba y devuelve una calificación sobre 100.
5. El profesor revisa las entregas y calificaciones de sus alumnos.

---

## 3. Restricciones de negocio

| Restricción                     | Dónde se aplica                  | Propósito                                                      |
| ------------------------------- | -------------------------------- | -------------------------------------------------------------- |
| **maxAttempts**                 | `Activity.maxAttempts`           | Límite pedagógico de envíos por actividad (0 = ilimitado)      |
| **Rate limiting**               | Endpoints `/execution/*` y submit | 2 peticiones cada 5 min por IP — protege el VPS y es requisito académico |
| **allowCopy / allowPaste**      | `Activity.allowCopy` / `allowPaste` | Integridad académica en exámenes; el frontend bloquea copiar/pegar |
| **Casos de prueba ocultos**     | `TestCase.isHidden`              | El workspace muestra solo casos públicos; los ocultos se usan para evaluar |
| **Timeout de ejecución**        | Contenedor Docker (10 s)         | Evita bucles infinitos                                          |
| **Sandboxing del contenedor**   | 128 MB RAM, CPU quota 50k, PID 30, red deshabilitada | Aislamiento y protección del host                      |

---

## 4. Stack tecnológico

| Capa             | Tecnología                              |
| ---------------- | --------------------------------------- |
| Runtime          | Node.js 24 (Alpine en producción)       |
| Lenguaje         | TypeScript 6 (strict mode)              |
| Framework HTTP   | Express 5                               |
| ORM              | Prisma 7 + pg Pool adapter             |
| Base de datos    | PostgreSQL (hosted, conexión SSL)       |
| Ejecución de código | Docker (via `dockerode`)             |
| Validación       | Zod 4                                   |
| Autenticación    | JWT (access 4 h + refresh 7 d), bcrypt |
| CI/CD            | GitHub Actions → ghcr.io → SSH al VPS  |

---

## 5. Estructura del proyecto

```
src/
├── app.ts                     ← Punto de entrada (Express + CORS + rutas)
├── config/
│   ├── env.config.ts          ← Validación de variables de entorno con Zod
│   └── prisma.ts              ← Singleton de PrismaClient con pg Pool
├── controllers/               ← Manejan request/response, delegan a servicios
├── services/                  ← Lógica de negocio
│   ├── execution.service.ts   ← ★ Motor de ejecución con Docker
│   ├── evaluation.service.ts  ← ★ Motor de calificación automática
│   ├── interfaces/            ← Interfaces para cada servicio
│   └── ...
├── middlewares/
│   ├── auth.middleware.ts      ← authenticate() y optionalAuthenticate()
│   ├── rbac.middleware.ts      ← rbac(roles[]) — God esquiva todo
│   └── rateLimiter.middleware.ts ← 2 req / 5 min para ejecución
├── routes/
│   ├── index-v1.routes.ts     ← Agrupa todas las rutas bajo /api/v1
│   └── ...
├── types/
│   ├── enums/                 ← ExecutionStatus, SubmissionStatus, UserRole
│   ├── requests/              ← Interfaces de request body
│   ├── responses/             ← Interfaces de respuesta
│   ├── models/                ← Modelos de dominio (CodeFile, TokenPayload)
│   ├── dtos/                  ← DTOs específicos (invitations)
│   ├── shared/                ← Tipos compartidos (PaginationData)
│   └── global/express.d.ts    ← Aumenta Request con user y role
└── helpers/                   ← Utilidades (Base64, paginación, params)
```

---

## 6. Base de datos — 8 modelos

| Modelo              | Tabla                    | Propósito                                            |
| ------------------- | ------------------------ | ---------------------------------------------------- |
| `Role`              | `roles`                  | God, Student, Teacher                                |
| `InvitationCode`   | `invitation_codes`       | Códigos de invitación de un solo uso                 |
| `User`              | `users`                  | Usuarios (UUID, email, nombre, hash de contraseña)   |
| `ProgrammingLanguage` | `programming_languages` | C++, Python, Node.js, Java con imagen Docker y comando |
| `Subject`           | `subjects`               | Materias creadas por profesores                      |
| `Enrollment`        | `enrollments`            | Relación muchos-a-muchos estudiante‑materia           |
| `Activity`          | `activities`             | Ejercicios de código con starter code y restricciones |
| `TestCase`          | `test_cases`             | Casos de prueba (input/expected output en Base64)    |
| `Submission`        | `submissions`            | Entregas de estudiantes con calificación y snapshots |

---

## 7. API — Rutas bajo `/api/v1`

### Auth
| Método | Ruta                     | Auth     | Descripción               |
| ------ | ------------------------ | -------- | ------------------------- |
| POST   | `/auth/register`         | Ninguna  | Registro (con o sin invitación) |
| POST   | `/auth/login`            | Ninguna  | Login, devuelve token pair |
| POST   | `/auth/refresh`          | Ninguna  | Refresca access token     |

### Invitation (God only)
| Método | Ruta                     | Auth              | Descripción               |
| ------ | ------------------------ | ----------------- | ------------------------- |
| POST   | `/invitation`            | Bearer (God)      | Crear código               |
| GET    | `/invitation`            | Bearer (God)      | Listar códigos             |
| PUT    | `/invitation/:id`        | Bearer (God)      | Actualizar código          |
| DELETE | `/invitation/:id`        | Bearer (God)      | Eliminar código            |

### Execution (público, rate‑limited)
| Método | Ruta                     | Rate Limit | Descripción                     |
| ------ | ------------------------ | ---------- | ------------------------------- |
| POST   | `/execution/run`         | Sí         | Ejecutar código (un solo archivo) |
| POST   | `/execution/run-with-files` | Sí      | Ejecutar con múltiples archivos   |

### Programming Language (God)
| Método | Ruta                                  | Auth         | Descripción             |
| ------ | ------------------------------------- | ------------ | ----------------------- |
| POST   | `/programming-language`               | Bearer (God) | Crear lenguaje           |
| GET    | `/programming-language`               | Bearer (God) | Listar lenguajes         |
| GET    | `/programming-language/:id`           | Bearer (God) | Obtener uno              |
| PUT    | `/programming-language/:id`           | Bearer (God) | Actualizar               |
| DELETE | `/programming-language/:id`           | Bearer (God) | Eliminar                 |

### User
| Método | Ruta                     | Auth         | Descripción               |
| ------ | ------------------------ | ------------ | ------------------------- |
| GET    | `/user/me`               | Bearer       | Perfil del usuario autenticado |
| PATCH  | `/user/me`               | Bearer       | Actualizar perfil         |
| POST   | `/user/change-password`  | Bearer       | Cambiar contraseña        |

### Subject
| Método | Ruta                     | Auth                | Descripción           |
| ------ | ------------------------ | ------------------- | --------------------- |
| POST   | `/subject`               | Bearer (Teacher)    | Crear materia         |
| GET    | `/subject`               | Bearer (Teacher)    | Listar materias       |
| GET    | `/subject/:id`           | Bearer (Teacher)    | Obtener una           |
| PUT    | `/subject/:id`           | Bearer (Teacher)    | Actualizar            |
| DELETE | `/subject/:id`           | Bearer (Teacher)    | Eliminar              |

### Activity (anidado: test‑cases y submissions)
| Método | Ruta                                      | Auth                    | Descripción                  |
| ------ | ----------------------------------------- | ----------------------- | ---------------------------- |
| POST   | `/activity`                               | Bearer (Teacher)        | Crear actividad               |
| GET    | `/activity`                               | Bearer (Teacher)        | Listar actividades            |
| GET    | `/activity/:id`                           | Bearer (Teacher)        | Obtener actividad             |
| PUT    | `/activity/:id`                           | Bearer (Teacher)        | Actualizar actividad          |
| DELETE | `/activity/:id`                           | Bearer (Teacher)        | Eliminar actividad            |
| GET    | `/activity/:id/workspace`                 | Ninguna (público)       | Workspace del estudiante (código inicial + casos públicos) |
| POST   | `/activity/:id/submit`                    | Opcional + rate‑limited | Enviar solución para evaluación |
| GET    | `/activity/:id/test-case`                 | Bearer (Teacher)        | Listar casos de prueba        |
| POST   | `/activity/:id/test-case`                 | Bearer (Teacher)        | Crear caso de prueba          |
| PUT    | `/activity/:id/test-case/:testCaseId`     | Bearer (Teacher)        | Actualizar caso de prueba     |
| DELETE | `/activity/:id/test-case/:testCaseId`     | Bearer (Teacher)        | Eliminar caso de prueba       |

---

## 8. Motor de ejecución de código (`execution.service.ts`)

El corazón del sistema. Flujo interno:

1. Recibe `languageId`, archivos (Base64), `stdin` (Base64 opcional).
2. Busca el lenguaje en BD → obtiene imagen Docker y comando de ejecución.
3. Si la imagen no existe localmente, la descarga del registry.
4. Crea un contenedor **efímero** con restricciones estrictas:
   - 128 MB RAM, sin swap
   - CPU quota 50000
   - PID limit 30
   - Red deshabilitada
   - WorkingDir `/app`
5. Empaqueta los archivos de código y stdin en un **tar stream** y los copia al contenedor.
6. Arranca el contenedor y espera máximo **10 segundos** (SIGKILL si excede).
7. Lee los logs (stdout/stderr), destruye el contenedor.
8. Retorna: `status` (SUCCESS / TIME_LIMIT_EXCEEDED / COMPILE_ERROR / RUNTIME_ERROR), `stdout`, `stderr`, `timeMs`.

---

## 9. Motor de evaluación (`evaluation.service.ts`)

1. Recibe casos de prueba y archivos de código.
2. Itera cada caso de prueba, ejecutando el código con `executionService.runCodeWithFiles`.
3. Clasifica el resultado:
   - **COMPILE_ERROR / RUNTIME_ERROR** → aborta, calificación 0.
   - **TIME_LIMIT_EXCEEDED** → aborta, calificación 0.
   - **SUCCESS** → compara `stdout` con `expectedOutput` (decodificado de Base64).
4. Cuenta tests pasados vs totales.
5. Calcula `finalGrade = (passedTests / totalTests) * 100` (redondeado a 2 decimales).

---

## 10. Setup de desarrollo

### Requisitos
- Node.js ≥ 24
- Docker (con socket accesible: Windows `//./pipe/docker_engine`, Linux `/var/run/docker.sock`)
- PostgreSQL (la URL viene de `.env`)

### Variables de entorno (`.env`)

```
PORT=3000
DATABASE_URL="postgresql://usuario:contraseña@host:puerto/basededatos?sslmode=require"
JWT_SECRET=<mínimo 20 caracteres>
JWT_REFRESH_SECRET=<mínimo 20 caracteres>
NODE_ENV=development
```

### Comandos

| Comando                | Descripción                                      |
| ---------------------- | ------------------------------------------------ |
| `npm run dev`          | Inicia el servidor con tsx watch + hot reload    |
| `npm run build`        | Compila TypeScript a `dist/`                     |
| `npm run format`       | Formatea el código con Prettier                  |
| `npm run format:check` | Verifica formato sin modificar                   |
| `npm run db:init`      | Prisma generate + migrate dev + seed             |
| `npm run db:migrate`   | Aplica migraciones pendientes                    |
| `npm run db:status`    | Muestra estado de migraciones                    |

---

## 11. CI/CD

Tres workflows en GitHub Actions:

### `ci_pr.yml`
- **Disparador**: pull request a `main`
- **Acción**: valida el PR con 4 jobs segmentados
  - `lint-format` — verifica formato con Prettier
  - `typecheck` — compila TypeScript
  - `tests` — ejecuta tests (depende de typecheck)
  - `docker-build` — valida que la imagen Docker compila (solo `linux/amd64`, sin push)
- **Propósito**: asegurar calidad antes del merge

### `cicd_docker.yml`
- **Disparador**: tag `v*` (ej. `v1.2.3`)
- **Acción**: 4 jobs segmentados para eficiencia
  - `lint-and-typecheck` — verifica formato con Prettier y compila TypeScript
  - `tests` — ejecuta tests (depende de lint-and-typecheck)
  - `docker-build` — construye imagen multi-arch sin push (depende de tests)
  - `docker-push` — push a `ghcr.io/<repo>` con tags `:v1.2.3` y `:latest` (depende de docker-build)
- **Propósito**: construir y publicar la imagen Docker

### `cd_deploy_on_vps.yml`
- **Disparador**: se ejecuta automáticamente al completar `cicd_docker.yml` exitosamente
- **Acción**: 5 jobs con healthcheck y rollback automático
  - `create-deployment` — crea GitHub Deployment con status "pending"
  - `deploy-to-vps` — SSH al VPS, guarda imagen actual como `previous`, pull nueva imagen, restart
  - `health-check` — consulta `/health` con retry (3 intentos, 10s entre cada uno)
  - `rollback` (condicional) — si healthcheck falla, restaura imagen `previous`
  - `update-deployment` — actualiza GitHub Deployment a "success" o "failure"
- **Propósito**: desplegar con verificación y rollback automático

### Flujo de deploy completo

```
PR a main → CI valida (ci_pr.yml) → Review + Merge
                                          ↓
                                    main actualizado
                                          ↓
                              Líder decide deployar
                                          ↓
                              Crear tag v0.0.17
                                          ↓
                              cicd_docker.yml (build + push)
                                          ↓
                              cd_deploy_on_vps.yml
                                          ↓
                              ┌───────────────────────────┐
                              │ 1. Crear Deployment       │
                              │ 2. Deploy a VPS           │
                              │ 3. Health check           │
                              │ 4. [Rollback si falla]    │
                              │ 5. Actualizar status      │
                              └───────────────────────────┘
```

**Importante**: El deploy NO es automático al mergear a `main`. El líder del proyecto decide cuándo deployar creando un tag versionado.

### Healthcheck endpoint

- **Ruta**: `GET /health`
- **Rate limit**: 10 req/min por IP
- **Respuesta**: `{ status: "ok", timestamp: "...", version: "..." }`
- **Propósito**: smoke test para el pipeline de deploy

### Rollback strategy

- Antes del deploy, la imagen actual se taggea como `previous`
- Si el healthcheck falla, el job `rollback` restaura la imagen `previous`
- El GitHub Deployment se marca como "failure" con descripción "rolled back"

### Docker Compose local

```yaml
services:
  containers_back:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: containers_back
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env
```

El contenedor necesita acceso al socket de Docker del host para crear contenedores de ejecución.

---

## 12. Convenciones de código

- **Módulos**: ESM (`"type": "module"` en package.json). Imports con extensión `.js`.
- **Formato**: Prettier — 100 chars de ancho, double quotes, semicolons, trailing commas `es5`, 2 espacios de indentación, LF.
- **TypeScript**: strict mode, `NodeNext` module resolution, `verbatimModuleSyntax` (requiere `import type` explícito).
- **Arquitectura**: MVC + Service Layer. Los servicios son clases exportadas como **singletons** (`export default new MiServicio()`). Los controladores son clases con métodos estáticos (también exportados como singleton).
- **Validación**: Zod para variables de entorno y probablemente para requests en el futuro.
- **Errores**: Se lanzan como `Error` con mensaje descriptivo; no hay manejo centralizado de errores todavía.

---

## 13. Repositorios relacionados

- Este repositorio (`Code-Back`): backend — API REST
- [**Frontend**](https://github.com/ContenedoresSS/Code-Panel-Frontend): editor de código que se embebe en Moodle via iframe — consume esta API
- **URL pública**: `https://codepanel.orchfr.duckdns.org` (dominio dinámico para el frontend)
