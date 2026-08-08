# Project Overview — Code Panel Backend

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
2. **Profesor** se registra con la invitación → crea una **materia** → crea una **actividad de código** (título, descripción, lenguaje, código inicial, intentos máximos, reglas del editor) → agrega **casos de prueba** (públicos y ocultos).
3. **Alumno** se registra con email → se matricula a la materia → abre la actividad desde Moodle (iframe) → escribe código en el editor → lo **ejecuta** para probar (rate‑limited) → **envía** la solución definitiva.
4. El backend **evalúa automáticamente** el código contra los casos de prueba y devuelve una calificación sobre 100.
5. El profesor revisa las entregas y calificaciones de sus alumnos.

---

## 3. Restricciones de negocio

| Restricción                     | Dónde se aplica                  | Propósito                                                      |
| ------------------------------- | -------------------------------- | -------------------------------------------------------------- |
| **maxAttempts**                 | `Activity.maxAttempts`           | Límite pedagógico de envíos por actividad (0 = ilimitado)      |
| **Rate limiting**               | Endpoints `/execution/*` y submit | 2 peticiones cada 5 min por IP — protege el VPS y es requisito académico |
| **Reglas de la actividad**      | `Activity.rules` (JSONB) + catálogo en `src/config/activity-rules.catalog.ts` | Integridad académica en exámenes. 6 reglas booleanas; cada una declara en qué capa se aplica (ver §3.1) |
| **Casos de prueba ocultos**     | `TestCase.isHidden`              | El workspace muestra solo casos públicos; los ocultos se usan para evaluar |
| **Timeout de ejecución**        | Contenedor Docker (10 s)         | Evita bucles infinitos                                          |
| **Sandboxing del contenedor**   | 128 MB RAM, CPU quota 50k, PID 30, red deshabilitada | Aislamiento y protección del host                      |

---

### 3.1 Reglas de la actividad

Las reglas del editor viven en la columna **`activities.rules` (JSONB)**, no en columnas por regla. La fuente única de verdad es el catálogo `src/config/activity-rules.catalog.ts`, que declara para cada regla su **valor por defecto** y la **capa que la hace cumplir**:

| Regla                 | Default | Se aplica en | Cómo se hace cumplir                                                      |
| --------------------- | ------- | ------------ | ------------------------------------------------------------------------- |
| `allowCopy`           | `true`  | `FRONTEND`   | El editor bloquea el portapapeles; el backend no puede verificarlo        |
| `allowPaste`          | `true`  | `FRONTEND`   | Ídem                                                                      |
| `allowFileDownload`   | `true`  | `FRONTEND`   | El editor oculta el botón de descarga                                     |
| `allowCodeEdit`       | `true`  | `BOTH`       | Editor en `readOnly` + el backend compara la entrega contra `starterCode` |
| `allowFileUpload`     | `true`  | `BOTH`       | Editor sin botón de subida + el backend rechaza archivos nuevos           |
| `allowLanguageChange` | `false` | `BACKEND`    | Si es `false`, la entrega se evalúa con `activity.languageId`             |

Reglas de trabajo sobre este subsistema:

- **Agregar una regla es una línea en el catálogo.** No lleva migración: `resolveActivityRules` completa contra los defaults lo que no esté guardado, así que las actividades existentes siguen siendo válidas.
- **Las reglas `FRONTEND` son disuasión, no control.** Se saltan con devtools. No usarlas como garantía de integridad en un examen; las que protegen de verdad son las `BOTH` y `BACKEND`, porque el backend las verifica.
- Los schemas de `activity` son **estrictos** (`z.strictObject`): un campo o una regla desconocida devuelve 400 en lugar de descartarse en silencio.
- La resolución y la mezcla viven en `src/helpers/activity-rules.helper.ts`, con sus tests. El service nunca lee `activity.rules` en crudo.
- **Sin `starterCode`, `allowCodeEdit` y `allowFileUpload` no se aplican.** No hay referencia contra la que comparar, y rechazar dejaría la actividad inentregable por un error de configuración del profesor. La comparación de contenido normaliza CRLF a LF, porque Monaco puede enviar CRLF en Windows. Todo esto vive en `src/helpers/submission-rules.helper.ts`.
- Una violación de regla devuelve **403**, igual que `maxAttempts`: es una restricción pedagógica, no un request mal formado.

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
│   ├── prisma.ts              ← Singleton de PrismaClient con pg Pool
│   └── swagger.ts             ← Sirve docs/api/openapi.yaml con swagger-ui
├── controllers/               ← Manejan request/response, delegan a servicios
├── services/                  ← Lógica de negocio
│   ├── execution.service.ts   ← ★ Motor de ejecución con Docker
│   ├── evaluation.service.ts  ← ★ Motor de calificación automática
│   ├── interfaces/            ← Interfaces para cada servicio
│   └── ...
├── middlewares/
│   ├── auth.middleware.ts      ← authenticate() y optionalAuthenticate()
│   ├── rbac.middleware.ts      ← rbac(roles[]) — God esquiva todo
│   ├── validate.middleware.ts  ← validate(schema) — valida req.body con Zod → 400
│   └── rateLimiter.middleware.ts ← 2 req / 5 min para ejecución
├── routes/
│   ├── index-v1.routes.ts     ← Agrupa todas las rutas bajo /api/v1
│   └── ...
├── validators/                ← Schemas Zod por recurso (create/update)
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

## 13. Repositorios relacionados

- Este repositorio (`Code-Back`): backend — API REST
- [**Frontend**](https://github.com/ContenedoresSS/Code-Panel-Frontend): editor de código que se embebe en Moodle via iframe — consume esta API
- **URL pública**: `https://codepanel.orchfr.duckdns.org` (dominio dinámico para el frontend)
