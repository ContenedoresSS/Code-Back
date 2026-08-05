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

## 3.1 Reglas de la actividad

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
  - `deploy-to-vps` — SCP de `compose.prod.yaml` al VPS como `compose.yml`, SSH al VPS, guarda imagen actual como `previous`, pull nueva imagen, restart
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

- **Ruta**: `GET /api/health`
- **Rate limit**: 10 req/min por IP
- **Respuesta**: `{ status: "ok", timestamp: "...", version: "..." }`
- **Propósito**: smoke test para el pipeline de deploy

### Rollback strategy

- Antes del deploy, la imagen actual se taggea como `previous`
- Si el healthcheck falla, el job `rollback` restaura la imagen `previous`
- El GitHub Deployment se marca como "failure" con descripción "rolled back"

### Docker Compose

El proyecto tiene dos archivos de compose para diferentes entornos:

**`compose.yaml`** — Desarrollo local
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

**`compose.prod.yaml`** — Producción (IaC)
```yaml
services:
  db_postgres:
    image: postgres:16-alpine
    container_name: postgres_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  code-panel-back:
    image: ghcr.io/contenedoresss/code-panel-backend:latest
    container_name: code-panel-back
    restart: unless-stopped
    env_file: .env
    ports:
      - "${PORT:-5555}:3000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      db_postgres:
        condition: service_healthy

volumes:
  postgres_data:
    driver: local
```

El workflow de deploy copia automáticamente `compose.prod.yaml` al VPS como `compose.yml` en cada deploy (IaC).

### Infraestructura del VPS

**Directorio**: `/opt/code-panel-back/`
- `compose.yml` — Copiado automáticamente desde `compose.prod.yaml` del repo
- `.env` — Variables de entorno (NO versionado, configurado manualmente)

**Variables de entorno del VPS** (`.env`):
```bash
# ── PostgreSQL ──
POSTGRES_USER=<usuario>
POSTGRES_PASSWORD=<contraseña>
POSTGRES_DB=<nombre_base_datos>

# ── Application ──
HOST_PORT=5555
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db_postgres:5432/${POSTGRES_DB}
JWT_SECRET=<mínimo 20 caracteres>
JWT_REFRESH_SECRET=<mínimo 20 caracteres>
```

**Usuario de deploy**: `deployer`
- No está en el grupo `docker`
- Tiene permisos `sudo` limitados (NOPASSWD) a:
  - `/usr/bin/docker compose pull`
  - `/usr/bin/docker compose up -d --remove-orphans`
  - `/usr/bin/docker compose up -d`
  - `/usr/bin/docker compose down`
  - `/usr/bin/docker inspect`
  - `/usr/bin/docker tag`
  - `/usr/bin/docker image inspect`
  - `/usr/bin/docker image prune -af`
  - `/usr/bin/docker image prune -f`

**Deuda técnica**:
- Puerto 5432 de PostgreSQL expuesto públicamente (idealmente debería ser interno)

---

## 12. Convenciones de código

- **Módulos**: ESM (`"type": "module"` en package.json). Imports con extensión `.js`.
- **Formato**: Prettier — 100 chars de ancho, double quotes, semicolons, trailing commas `es5`, 2 espacios de indentación, LF.
- **TypeScript**: strict mode, `NodeNext` module resolution, `verbatimModuleSyntax` (requiere `import type` explícito).
- **Arquitectura**: MVC + Service Layer. Los servicios son clases exportadas como **singletons** (`export default new MiServicio()`). Los controladores son clases con métodos estáticos (también exportados como singleton).
- **Validación**: Zod en dos niveles — variables de entorno en `config/env.config.ts`, y bodies de request con schemas en `src/validators/` aplicados con `validate(schema)` en la definición de la ruta. La adopción es **parcial**: hoy solo `subject` tiene validators; todo módulo nuevo o modificado debe incluirlos.
- **Linting**: **no hay ESLint** en el proyecto. El único chequeo de estilo es Prettier (`format:check`); el typecheck lo da `tsc` vía `npm run build`.
- **Errores**: Se lanzan como `Error` con mensaje descriptivo; no hay manejo centralizado de errores todavía. Los servicios envuelven el error (`throw new Error("Error al crear el curso: ...")`) y re-lanzan sin envolver los errores de negocio reconocibles; el controlador mapea el mensaje a status HTTP (404 si el mensaje contiene "no encontrada", 400 en el resto).

---

## 13. Repositorios relacionados

- Este repositorio (`Code-Back`): backend — API REST
- [**Frontend**](https://github.com/ContenedoresSS/Code-Panel-Frontend): editor de código que se embebe en Moodle via iframe — consume esta API
- **URL pública**: `https://codepanel.orchfr.duckdns.org` (dominio dinámico para el frontend)

---

## 14. Flujo de trabajo con Git

### Estrategia de ramas

- **`main`** — rama de producción, siempre desplegable
- **Feature branches** — ramas temporales para desarrollo (`feat/*`, `fix/*`, `refactor/*`, etc.)

### Naming de branches (Conventional Commits)

```
feat/nombre-feature       # Nueva funcionalidad
fix/bug-especifico        # Corrección de error
refactor/modulo-auth      # Refactorización
docs/actualizar-api       # Documentación
test/agregar-tests        # Tests
chore/actualizar-deps     # Mantenimiento
```

### Proceso paso a paso

1. **Crear rama** desde `main` actualizado:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/nueva-feature
   ```

2. **Trabajar** siguiendo las directivas del proyecto (código, tests, formato)

3. **Formatear código** (automático con pre-commit hook):
   ```bash
   npm run format  # Opcional, el hook lo hace automáticamente
   ```

4. **Commits** siguiendo Conventional Commits:
   ```bash
   git commit -m "feat: agregar validación de email"
   git commit -m "fix: corregir rate limiter"
   ```
   El pre-commit hook (`husky` + `lint-staged`) formatea automáticamente solo los archivos staged.
   El hook `commit-msg` valida que el mensaje siga Conventional Commits.

   **Tipos permitidos**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

5. **Push** a la rama:
   ```bash
   git push origin feat/nueva-feature
   ```

5. **Abrir PR** a `main`:
   - El CI se ejecuta automáticamente (ci_pr.yml)
   - Debe pasar: lint, typecheck, tests, docker-build

6. **Review y aprobación**:
   - Se requiere al menos 1 aprobación
   - Atender comentarios del review

7. **Merge** via **rebase** (historial limpio):
   ```bash
   git checkout main
   git pull origin main
   git rebase feat/nueva-feature
   git push origin main
   ```

8. **Deploy** (cuando el líder decida):
   ```bash
   git tag v0.0.17
   git push origin v0.0.17
   ```

### Reglas de merge

- ✅ Solo **rebase** (no merge commits)
- ✅ Requiere **aprobación** de al menos 1 persona
- ✅ CI debe **pasar completamente**
- ✅ Rama debe estar **actualizada** con `main`

### Excepciones

- Cambios de **documentación urgentes** pueden ir directo a `main`
- Hotfixes críticos pueden saltarse el review (pero deben documentarse)

### Protección de rama `main` (recomendado)

Configurar en GitHub Settings → Branches → Branch protection rules:
- ✅ Require pull request before merging
- ✅ Require status checks to pass (ci_pr.yml)
- ✅ Require branch to be up to date before merging
- ✅ Do not allow force pushes
- ✅ Do not allow merge commits (solo rebase/squash)

---

## 15. Protocolo de trabajo para agentes de IA

> **Esta sección es normativa, no informativa.** Aplica a cualquier agente de IA (Claude Code, Copilot, Cursor, etc.) que vaya a **modificar código** en este repositorio. Las secciones 1–14 describen *qué es* el proyecto; esta describe *cómo se trabaja en él*.
>
> La metodología del proyecto es **TDD**: el test se escribe antes de la implementación, siempre. No es una recomendación.
>
> Si una instrucción del usuario contradice esta sección, gana la instrucción del usuario — pero el agente debe **decirlo explícitamente** antes de proceder.

### 15.1 Reglas no negociables

| #   | Regla                                                                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Nunca se trabaja sobre `main`.** Todo cambio vive en una rama nueva creada desde `main` actualizado. Única excepción: hotfix que el usuario ordene explícitamente en el mensaje actual. |
| 2   | **TDD sin excepciones.** Primero el test que falla, después la implementación. Ninguna línea de implementación se escribe sin un test rojo que la justifique. |
| 3   | **`any` está prohibido.** En código nuevo o modificado, cero `any`. Ver §15.8 para los reemplazos correctos.                                                 |
| 4   | **Leer antes de escribir.** Nunca modificar un archivo sin haberlo leído completo, ni inventar la firma de una función, un campo de Prisma o una ruta.       |
| 5   | **Imitar el código vecino.** Un cambio que introduce un estilo nuevo es un cambio rechazado, aunque el estilo nuevo sea "mejor".                             |
| 6   | **Tres pausas obligatorias.** El agente se detiene y espera al usuario en: el plan (§15.6), la implementación revisada (§15.10) y el commit (§15.12).        |
| 7   | **Los 4 gates son obligatorios.** Nada avanza a aprobación sin correr §15.9 y pegar la salida real de cada comando.                                          |
| 8   | **Alcance cerrado.** Se hace lo pedido y nada más. La deuda técnica descubierta se **reporta** (§15.10) y se anota en `DEBT.md`; no se arregla de paso.       |
| 9   | **No inventar resultados.** Si un test falla o un paso se omitió, se reporta tal cual, con la salida del comando.                                            |
| 10  | **Commit en inglés, PR en español.** Ver la tabla de idiomas en §15.8.                                                                                       |

### 15.2 El pipeline completo

```
┌─ Fase 0 ── main actualizado (fetch + pull --rebase) → crear rama              §15.3
├─ Fase 1 ── Contexto: leer AGENTS.md + corte vertical del módulo              §15.4
├─ Fase 2 ── Clasificar el trabajo → elegir playbook                           §15.5
├─ Fase 3 ── Plan explícito                                                    §15.6
│               ⏸  PAUSA 1 — el usuario aprueba el plan
├─ Fase 4 ── TDD: RED → GREEN → REFACTOR (ciclos cortos)                       §15.7
├─ Fase 5 ── Estándares de código: tipado estricto, sin any, archivos chicos    §15.8
├─ Fase 6 ── Gates: format · typecheck · tests                                 §15.9
├─ Fase 7 ── Auto-análisis de deuda técnica + reporte                          §15.10
│               ⏸  PAUSA 2 — el usuario aprueba la implementación
├─ Fase 8 ── Documentación: Swagger / OpenAPI + gate docs:validate             §15.11
│               ⏸  PAUSA 3 — el usuario aprueba el commit
├─ Fase 9 ── Commit (Conventional Commits, en inglés)                          §15.12
├─ Fase 10 ─ Push de la rama                                                   §15.13
└─ Fase 11 ─ Comentario de PR en markdown y español                            §15.14
```

**La documentación de API se actualiza después de la aprobación de la implementación y antes del commit.** El objetivo es que el frontend nunca tenga un contrato desactualizado: si el código entra al repo, su documentación entra en el mismo commit.

El usuario puede colapsar pausas diciéndolo explícitamente (ej. *"aprobado, documenta y commitea"*). El agente **no** las colapsa por iniciativa propia.

### 15.3 Fase 0 — Punto de partida: `main` actualizado y rama nueva

Antes de cualquier otra cosa, verificar que el árbol de trabajo está limpio:

```bash
git status
```

Si hay cambios sin commitear que no son tuyos, **detenerse y preguntar**. Nunca descartar trabajo del usuario.

Luego, siempre en este orden:

```bash
git checkout main
git fetch origin
git pull --rebase origin main
git checkout -b <tipo>/<nombre-kebab>
```

Naming de la rama según §14 — el tipo debe coincidir con la clasificación de §15.5:

```
feat/agregar-filtro-por-materia
fix/rate-limit-no-aplica-en-submit
refactor/extraer-validaciones-activity
docs/documentar-endpoint-workspace
test/cubrir-evaluation-service
chore/limpiar-artefactos-compilados
```

Reglas:

- La rama se crea **antes** de escribir código, no después.
- Si el usuario ordenó un **hotfix directo a `main`**, confirmarlo por escrito en el reporte antes de commitear, y documentarlo en el mensaje del commit.
- Si ya estás en una rama de trabajo previa y el cambio es continuación de la misma tarea, no crear otra: confirmarlo con el usuario.

### 15.4 Fase 1 — Contexto obligatorio antes de escribir código

En este orden, siempre:

1. **Leer este `AGENTS.md` completo.** Es la fuente de verdad del dominio y las convenciones.
2. **Localizar el módulo afectado** y leer su corte vertical completo. Para el recurso `X`:
   ```
   src/routes/X.routes.ts
   src/controllers/X.controller.ts
   src/services/X.service.ts
   src/services/interfaces/X.service.interface.ts
   src/validators/X.validators.ts        (si existe)
   src/types/requests/*X*.ts  ·  src/types/responses/*X*.ts
   tests/services/X.service.test.ts
   ```
3. **Leer el módulo de referencia.** `subject` es el corte vertical más completo del repo: úsalo como plantilla cuando no exista un ejemplo más cercano.
4. **Si el cambio toca la BD**, leer `prisma/schema.prisma` antes de asumir cualquier campo o relación.
5. **Si el cambio toca un endpoint**, leer su entrada en `docs/api/openapi.yaml` (paths desde la línea ~49, schemas en `components`).
6. **Revisar `DEBT.md`.** Puede que el problema ya esté documentado, con contexto o una decisión tomada.

### 15.5 Fase 2 — Clasificar el trabajo

| Tipo                 | Señal                                        | Playbook            | Prefijo de commit   |
| -------------------- | -------------------------------------------- | ------------------- | ------------------- |
| **Feature**          | Comportamiento nuevo, endpoint nuevo, campo nuevo | §15.15-A       | `feat:`             |
| **Bug**              | Comportamiento existente incorrecto          | §15.15-B            | `fix:`              |
| **Cambio de esquema**| Requiere migración de Prisma                 | §15.15-C            | `feat:` / `fix:`    |
| **Refactor**         | Reorganizar sin cambiar comportamiento       | §15.15-D            | `refactor:`         |
| **Tests**            | Solo agregar o corregir tests                | §15.9 directo       | `test:`             |
| **Docs**             | Solo markdown u OpenAPI                      | §15.9 (gates 1 y 4) | `docs:`             |
| **Infra**            | Workflows, Docker, compose                   | **Detenerse** §15.17| `ci:` / `build:`    |

### 15.6 Fase 3 — Plan explícito · ⏸ PAUSA 1

Antes de tocar un solo archivo, el agente presenta este plan y **espera aprobación**:

```
Objetivo:        <qué cambia en términos de comportamiento observable>
Clasificación:   <feature | bug | esquema | refactor | tests | docs>
Rama:            <tipo>/<nombre-kebab>

Plan de TDD:
  Test 1: <caso> → <archivo de test>
  Test 2: <caso> → <archivo de test>
  ...        (camino feliz, validación, autorización, no encontrado)

Archivos a crear/modificar:
  - ruta/al/archivo.ts   → <qué cambia y por qué>

Migración:       <sí/no — si sí, qué cambia en el esquema y si es destructivo>
OpenAPI:         <sí/no — qué paths y schemas se tocan>
Riesgos:         <qué se puede romper; contratos que consume el frontend>
Fuera de alcance: <lo que NO se va a hacer>
```

Reglas del plan:

- **Los tests se enumeran en el plan, no se improvisan.** Si no puedes listar los casos, no entendiste el requerimiento: pregunta.
- Si el plan supera **~8 archivos**, dividirlo y proponer entregarlo por partes.
- Si durante la implementación el plan cambia de forma material (aparece una migración, hay que tocar otro módulo), **detenerse y re-aprobar**. No expandir el alcance en silencio.
- Para un cambio trivial y local (un typo, un mensaje de error), el plan puede ser una sola frase — pero se sigue enunciando.

### 15.7 Fase 4 — TDD: RED → GREEN → REFACTOR

El ciclo, en **iteraciones cortas** (un caso de prueba a la vez, no los diez de golpe):

| Paso            | Qué se hace                                                                 | Cómo se verifica                            |
| --------------- | --------------------------------------------------------------------------- | ------------------------------------------- |
| **1. RED**      | Escribir **un** test que describa el comportamiento deseado y que **falle** | Correr el test y **ver el rojo**            |
| **2. GREEN**    | Escribir el **mínimo** código que lo hace pasar                             | Correr el test y ver el verde               |
| **3. REFACTOR** | Limpiar sin cambiar comportamiento                                          | El test sigue verde **sin haberlo tocado**  |
| **4. Repetir**  | Siguiente caso del plan                                                     | —                                           |

Comandos:

```bash
npm run test -- tests/services/subject.service.test.ts   # watch, durante el ciclo
npm run test:run                                          # suite completa, al cerrar
```

**Reglas duras del ciclo:**

- **Ver el rojo es obligatorio.** Un test que nunca falló no prueba nada: pudo pasar desde el principio por accidente. Si escribiste el test y pasó de inmediato, el test está mal — arréglalo antes de seguir.
- **Pegar la evidencia del rojo** en el reporte de §15.10. Es la prueba de que se siguió TDD.
- **Nada de implementación adelantada.** No escribir código "que va a hacer falta después". Si no hay test que lo exija, no se escribe.
- **Prohibido volver verde debilitando el test**: no `.skip`, no borrar aserciones, no relajar expectativas, no adaptar el test al bug.
- El **REFACTOR** no cambia comportamiento. Si tuviste que modificar un test, no era refactor.

**Orden de TDD para un endpoint nuevo** — la estructura de tipos y validación se crea primero porque el test la necesita para compilar; la lógica no:

```
1. Modelos y tipos      src/types/requests/ · src/types/responses/ · src/types/enums/
2. Validaciones Zod     src/validators/<recurso>.validators.ts
3. Contrato del service src/services/interfaces/<recurso>.service.interface.ts
4. ── RED ──            tests/services/<recurso>.service.test.ts   → falla
5. ── GREEN ──          src/services/<recurso>.service.ts          → verde
6. ── RED/GREEN ──      controller → route → index-v1.routes.ts
7. ── REFACTOR ──       limpiar, extraer, revisar tamaño de archivos (§15.8)
```

**Tests — ubicación y patrones:**

- Espejo de `src/`: `tests/services/`, `tests/middlewares/`, `tests/helpers/`, `tests/validators/`, `tests/integration/`.
- Nombre: `<archivo>.test.ts`. Solo `tests/**/*.test.ts` se ejecuta (`vitest.config.ts:7`).
- **Prisma está mockeado globalmente** en `tests/integration/setup.ts` (cargado como `setupFiles` para *todos* los tests): los tests corren **sin base de datos ni Docker**. Si tu service usa un modelo o método de Prisma que no está en ese mock, **agrégalo ahí**.
- Patrón de mock: `vi.hoisted()` + `vi.mock("../../src/config/prisma.js")` + `vi.clearAllMocks()` en `beforeEach` — ver `tests/services/subject.service.test.ts:1-27`.
- Los tests de integración usan `supertest` contra la app Express.
- Nombres de `describe`/`it` **en inglés**, como el resto de la suite: `it("creates subject with provided data")`.
- **Cobertura mínima de casos por endpoint**: camino feliz · error de validación (Zod) · error de autorización o de pertenencia (`userId`) · recurso no encontrado.

### 15.8 Fase 5 — Estándares de código

#### Tipado estricto — `any` está prohibido

Cero `any` en código nuevo o modificado. Reemplazos obligatorios:

| Prohibido                              | Correcto                                                                 | Por qué                                                     |
| -------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `catch (error: any)`                   | `catch (error: unknown)` + estrechamiento (ver abajo)                    | `unknown` obliga a comprobar antes de usar                  |
| `(req as any).user` / `.role`          | `req.user` / `req.role`                                                  | `types/global/express.d.ts` ya los declara — el cast es innecesario |
| `const whereClause: any = {...}`       | `Prisma.SubjectWhereInput` (tipos generados por Prisma)                  | Prisma genera los tipos de filtro; usarlos                  |
| `: any` en parámetros o retornos       | La interfaz concreta de `src/types/`                                     | Si no existe, créala                                        |
| `as any` para silenciar a `tsc`        | Arreglar el tipo real                                                    | Un cast que calla al compilador esconde un bug              |

Estrechamiento de errores — patrón para código nuevo:

```ts
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`Error al crear el curso: ${message}`);
}
```

Otras reglas de tipado:

- **Todo se tipa explícitamente**: parámetros, retornos de funciones públicas, bodies de request, respuestas. No depender de la inferencia en fronteras de módulo.
- `import type` explícito para tipos (`verbatimModuleSyntax` lo exige).
- Preferir `unknown` sobre `any`, uniones concretas sobre `string`, y enums de `src/types/enums/` sobre literales sueltos.
- Nunca relajar `tsconfig.json` para que algo compile.

> **Deuda ya registrada:** el código actual tiene **93 usos de `any`** (57 `catch (error: any)`, 25 `as any`, 13 `: any`). Está documentado en `DEBT.md` como **DEBT‑11 (prioridad Alta)** con su plan de remediación, y su saneamiento es **trabajo futuro y aparte**.
>
> **No se hace una migración masiva de `any` dentro de un cambio funcional** — rompería la regla de alcance cerrado y produciría un diff ilegible. Regla práctica: **las líneas que escribes van sin `any`**; las preexistentes del archivo se dejan como están salvo que el usuario pida explícitamente lo contrario.

#### Tamaño de archivos y escalabilidad

Archivos de miles de líneas no son mantenibles. Umbrales (el archivo más grande hoy es `activity.service.ts` con 242 líneas):

| Líneas    | Acción                                                                        |
| --------- | ----------------------------------------------------------------------------- |
| **< 250** | Normal                                                                        |
| **250–400** | Señal de alerta: mencionarlo en el reporte y proponer cómo dividirlo         |
| **> 400** | **Se divide.** No se entrega un archivo de más de 400 líneas sin justificarlo |

Cómo dividir, en orden de preferencia:

1. **Extraer helpers** puros a `src/helpers/` (formato, parseo, cálculos sin estado).
2. **Separar por subdominio**: si un service acumula responsabilidades de otro recurso, ese recurso merece su propio service (`test-case` y `submission` ya están separados de `activity` por esta razón).
3. **Extraer validaciones** al validator de Zod: si el service valida forma de datos, eso va en `validators/`.
4. **Nunca** dividir por división arbitraria (`activity.service.part2.ts`). La división sigue una responsabilidad, no un conteo de líneas.

Principios de escalabilidad exigibles:

- **Una responsabilidad por archivo.** Un service es dueño de un recurso.
- **Respetar la dirección de las capas.** El controller no toca `prisma`; el service no toca `req`/`res`. Toda la lógica de negocio y de autorización por pertenencia vive en el service.
- **No duplicar lógica.** Si el mismo cálculo aparece dos veces, va a un helper — y el helper lleva su propio test.
- **Sin números mágicos.** Límites y constantes con nombre, o desde configuración.

#### Patrones canónicos del repo

Verificados contra el código actual. Imitarlos:

| Elemento           | Regla                                                                                | Referencia                       |
| ------------------ | ------------------------------------------------------------------------------------ | -------------------------------- |
| Imports            | ESM con extensión `.js`, incluso en TS                                               | `from "../services/x.service.js"`|
| Service            | `export class XService implements IXService` + `export default new XService()`        | `subject.service.ts:9,141`       |
| Interface          | Un archivo en `services/interfaces/`, métodos con JSDoc **en español**               | `subject.service.interface.ts`   |
| Controller         | Clase con métodos `public async`, `try/catch` por método, `export default new X()`   | `subject.controller.ts:9,106`    |
| Errores en service | Envolver: `throw new Error("Error al <acción>: ...")`; re-lanzar sin envolver los de negocio | `subject.service.ts:81-86`  |
| Errores en controller | Mapear mensaje → status: `"no encontrada"` → 404, resto → 400                     | `subject.controller.ts:57-62`    |
| Status codes       | POST → 201 · GET/PUT → 200 · DELETE → 204 sin body                                   | `subject.controller.ts`          |
| Validación         | Schema Zod en `validators/`, aplicado con `validate(schema)` **en la ruta**           | `subject.routes.ts:14`           |
| Params numéricos   | `parseIdParam()` + chequeo `isNaN` → 400                                             | `subject.controller.ts:48-53`    |
| Paginación         | `getPaginationParams(req)` → `{skip, take}`; devolver `PaginationData<T>`             | `subject.service.ts:26-65`       |
| Auth en rutas      | `router.use(authenticate)` al inicio; `rbac([UserRole.X])` por ruta                  | `subject.routes.ts:11-21`        |
| Base64             | Input/output de test cases y código viaja en Base64                                  | `helpers/base64-validator.helper.ts` |
| Formato            | Prettier: 100 cols, double quotes, semicolons, 2 espacios, LF                        | `.prettierrc`                    |

#### Idiomas

| Elemento                                   | Idioma      |
| ------------------------------------------ | ----------- |
| Mensajes de commit                         | **Inglés**  |
| Comentario del PR                          | **Español** |
| Nombres de variables, funciones, archivos  | Inglés      |
| Nombres de tests (`describe` / `it`)       | Inglés      |
| JSDoc y comentarios en código              | Español     |
| Mensajes de error de la API                | Español     |

> **Inconsistencia conocida:** los mensajes de los schemas de Zod están en inglés (`"Name is required"`) mientras los errores de service están en español (`"Materia no encontrada"`). Hasta que se decida un estándar, **seguir el idioma que ya usa el módulo que estás tocando** y no mezclar dentro de un mismo archivo.

#### Diff limpio

- No reformatear código ajeno al cambio. El diff debe contener solo líneas relevantes.
- No renombrar archivos, variables o rutas "de paso".
- No dejar `console.log`, código comentado ni `TODO` sin dueño.
- Comentar solo donde el *por qué* no sea obvio. El repo comenta poco; el código nuevo también.

### 15.9 Fase 6 — Gates de verificación

Se corren **en este orden** y se pega la salida real. Un gate rojo significa que el trabajo **no está listo para aprobación**:

| #   | Gate            | Comando                 | Criterio                                             |
| --- | --------------- | ----------------------- | ---------------------------------------------------- |
| 1   | Formato         | `npm run format:check`  | Sin archivos listados. Si falla: `npm run format`     |
| 2   | Typecheck       | `npm run build`         | Cero errores de `tsc`                                 |
| 3   | Tests           | `npm run test:run`      | Todos verdes, **incluidos los que ya existían**       |
| 4   | Contrato de API | `npm run docs:validate` | Sin errores de Redocly — se corre en la Fase 8 (§15.11) |

Reglas:

- Los gates 1–3 se corren **antes** de pedir la aprobación de la implementación. El gate 4 se corre **después** de actualizar OpenAPI.
- Estos gates son exactamente lo que valida `ci_pr.yml` (más el build de Docker). Verde en local ⇒ verde en CI.
- **No hay ESLint** en el proyecto: no inventar `npm run lint`.
- Prohibido hacer pasar un gate **debilitando la verificación**: no borrar tests, no `.skip`, no relajar `tsconfig`, no `any` para silenciar a `tsc`, no tocar `vitest.config.ts` para excluir archivos.
- Si un gate falla por algo **preexistente en `main`** y ajeno al cambio: no arreglarlo, reportarlo (§15.18).

### 15.10 Fase 7 — Auto-análisis de deuda técnica · ⏸ PAUSA 2

Antes de pedir aprobación, el agente **revisa su propio trabajo** con esta checklist y reporta los hallazgos con honestidad. Encontrar un problema aquí y decirlo vale más que entregar algo aparentemente limpio:

- [ ] ¿Quedó algún `any` en el código que escribí?
- [ ] ¿Algún archivo pasó de 250 líneas? ¿De 400?
- [ ] ¿Hay lógica duplicada que debería ser un helper?
- [ ] ¿Está todo tipado, incluidos retornos y bodies?
- [ ] ¿Los tests cubren los 4 casos mínimos (feliz, validación, autorización, no encontrado)?
- [ ] ¿Vi el rojo antes del verde en cada ciclo?
- [ ] ¿El controller quedó libre de `prisma`? ¿El service libre de `req`/`res`?
- [ ] ¿La validación Zod está en la ruta y no dispersa en el controller?
- [ ] ¿El diff tiene solo líneas relevantes al cambio?
- [ ] ¿Quedó algo a medias, algún caso sin cubrir, alguna suposición sin confirmar?

Luego entrega el **reporte de implementación** y espera aprobación:

```
## Resumen
<2–4 líneas: qué cambió en términos de comportamiento>

## Evidencia de TDD
Test rojo inicial:
  <salida real del test fallando>
Estado final:
  <N passed>

## Archivos
- src/...  (nuevo|modificado)  → <qué>  [N líneas]

## Gates
- format:check   ✅ / ❌ <salida>
- build          ✅ / ❌ <salida>
- test:run       ✅ / ❌ <N passed, M failed>

## Auto-análisis de deuda técnica
<hallazgos de la checklist; "sin hallazgos" solo si de verdad no hay>

## Migración
<ninguna | archivo generado + qué implica para producción>

## Impacto en el frontend
<endpoints nuevos o modificados; cambios de contrato; breaking changes>

## Pendiente de tu aprobación
Al aprobar: actualizo Swagger/OpenAPI y te presento el commit.
```

Si el usuario pide cambios, se vuelve a la Fase 4 (con TDD) y se repite desde aquí.

### 15.11 Fase 8 — Documentación de API (Swagger / OpenAPI)

Se ejecuta **solo después de la Pausa 2**, y es **obligatoria** si el cambio tocó rutas, requests o responses. El frontend consume este contrato: código en el repo sin documentación actualizada es un cambio incompleto.

1. Editar `docs/api/openapi.yaml`:
   - El path bajo `paths:` (los existentes empiezan en la línea ~49), con `summary`, `tags`, `security`, parámetros, request body y **todas** las respuestas posibles (200/201/204, 400, 401, 403, 404, 429 si tiene rate limit).
   - Los schemas nuevos bajo `components:`, reutilizando los existentes con `$ref` cuando aplique.
   - Mantener el estilo del archivo: es un único documento con paths en línea, no fragmentado.
2. Verificar que el `tag` del endpoint exista en la lista de `tags:` (línea ~24).
3. Correr el gate 4:
   ```bash
   npm run docs:validate
   ```
4. `config/swagger.ts` sirve este mismo archivo con swagger-ui, así que no hay un segundo lugar que actualizar. Si el cambio afecta cómo se sirve la documentación (no su contenido), eso es **infra**: detenerse (§15.17).

### 15.12 Fase 9 — Commit · ⏸ PAUSA 3

El agente **presenta el mensaje del commit y espera el visto bueno** antes de ejecutarlo.

**Conventional Commits, en inglés**, validado por el hook `commit-msg`:

```
<tipo>(<alcance opcional>): <descripción en imperativo, minúscula, sin punto final>
```

Tipos permitidos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

Ejemplos válidos:

```
feat(subject): add search filter to subject listing
fix(submission): enforce max attempts before evaluating code
refactor(activity): extract test case mapping to helper
test(evaluation): cover time limit exceeded scenario
docs(api): document workspace endpoint responses
```

Reglas:

- **En inglés**, siempre. El comentario del PR va en español (§15.14); no mezclar.
- Imperativo (`add`, no `added` ni `adds`). Máximo ~72 caracteres en el asunto.
- **El código y su documentación de OpenAPI van en el mismo commit.**
- Un commit por unidad lógica de cambio. No mezclar un fix con un refactor.
- Prohibido `--no-verify`. Si el hook rechaza el mensaje, se corrige el mensaje.
- El hook `pre-commit` (lint-staged) reformatea los archivos staged automáticamente: es esperado, no es un error.

### 15.13 Fase 10 — Push

```bash
git push -u origin <nombre-de-la-rama>
```

- Solo se hace push de **la rama de trabajo**. Nunca `git push origin main`.
- Nunca `--force` ni `--force-with-lease` sin orden explícita del usuario.
- El agente **no crea tags y no despliega**. El deploy lo decide el líder creando un tag (§11, §14).

### 15.14 Fase 11 — Comentario del PR

En **markdown y en español**, siguiendo esta plantilla exacta. El agente la entrega como texto para que el usuario la pegue; no abre el PR por su cuenta salvo que se le pida.

```markdown
## 📋 Descripción

<Qué resuelve este PR, en 2–4 líneas y en términos de negocio. Por qué era necesario.>

## 🏷️ Tipo de cambio

- [ ] ✨ Feature — funcionalidad nueva
- [ ] 🐛 Fix — corrección de un bug
- [ ] ♻️ Refactor — reorganización sin cambio de comportamiento
- [ ] 🧪 Tests — solo tests
- [ ] 📚 Docs — solo documentación
- [ ] 🗄️ Migración — cambia el esquema de la base de datos

## 🔧 Cambios realizados

### Lógica de negocio
- `src/services/...` — <qué cambió>

### API
- `POST /api/v1/...` — <endpoint nuevo o modificado>

### Base de datos
- <migración y qué modifica · o "Sin cambios">

### Documentación
- `docs/api/openapi.yaml` — <paths y schemas actualizados>

## 🧪 Estrategia de TDD

Se siguió el ciclo RED → GREEN → REFACTOR.

**Tests agregados** (<N> en total):

| Archivo | Caso cubierto |
| ------- | ------------- |
| `tests/services/....test.ts` | <camino feliz> |
| `tests/services/....test.ts` | <error de validación> |
| `tests/services/....test.ts` | <error de autorización> |
| `tests/services/....test.ts` | <recurso no encontrado> |

## ✅ Verificación

| Gate | Comando | Resultado |
| ---- | ------- | --------- |
| Formato | `npm run format:check` | ✅ |
| Typecheck | `npm run build` | ✅ |
| Tests | `npm run test:run` | ✅ <N passed> |
| Contrato de API | `npm run docs:validate` | ✅ / N/A |

## 🔗 Impacto en el frontend

<Endpoints nuevos o modificados y su contrato. Cambios incompatibles, si los hay.
Si no hay impacto: "Ninguno — cambio interno.">

## 🗄️ Migraciones

<Nombre de la migración y qué requiere en producción · o "Ninguna.">

## ⚠️ Deuda técnica

<Lo detectado y no resuelto, con su entrada en DEBT.md · o "Sin hallazgos nuevos.">

## 🔍 Cómo probarlo

1. <Paso concreto y reproducible>
2. <Petición de ejemplo con body si aplica>

## ✔️ Checklist

- [ ] Sin `any` en el código nuevo
- [ ] Todo tipado (parámetros, retornos, bodies)
- [ ] Ningún archivo supera las 400 líneas
- [ ] Tests siguiendo TDD, todos verdes
- [ ] OpenAPI actualizado
- [ ] Commits en Conventional Commits (inglés)
- [ ] Rama actualizada con `main`
```

Reglas de la plantilla:

- Se **borran** las secciones que no aplican, no se dejan vacías.
- Se marca solo la casilla de tipo que corresponde.
- Nunca poner ✅ en un gate que no se corrió: se pone `N/A` con la razón.

### 15.15 Playbooks

#### A — Endpoint / feature nueva

1. Fase 0 — `main` actualizado y rama `feat/...` (§15.3)
2. Contexto y plan con la lista de tests (§15.4, §15.6) → **⏸ aprobación**
3. `prisma/schema.prisma` si requiere modelo o campo nuevo → **playbook C**
4. Modelos y tipos: `src/types/enums/`, `src/types/requests/`, `src/types/responses/`
5. Validaciones: `src/validators/<recurso>.validators.ts`
6. Contrato: `src/services/interfaces/<recurso>.service.interface.ts` (JSDoc en español)
7. **Ciclo TDD por caso** (§15.7): RED en `tests/services/` → GREEN en `src/services/`
8. **Ciclo TDD** para el controller y la ruta: `src/controllers/` → `src/routes/<recurso>.routes.ts` con `authenticate` → `rbac` → `validate`
9. Registrar el router en `src/routes/index-v1.routes.ts` — **omitir esto es el error más común**
10. Si el service usa modelos de Prisma nuevos → agregarlos al mock de `tests/integration/setup.ts`
11. Gates 1–3 (§15.9) + auto-análisis (§15.10) → **⏸ aprobación**
12. `docs/api/openapi.yaml` + gate 4 (§15.11)
13. Commit en inglés → **⏸ aprobación** → push → comentario de PR (§15.12–15.14)

Antes de empezar, confirmar en el plan: **¿qué roles pueden llamarlo?** (§1) y **¿lleva rate limit?** (§3).

#### B — Bug fix

El TDD para bugs es el mismo ciclo; el RED es la **reproducción**:

1. Fase 0 — rama `fix/...`
2. **RED: escribir el test que reproduce el bug y verlo fallar.** Sin test rojo previo no hay fix: es la única prueba de que el bug existía y de que el arreglo sirve. Pegar la salida del rojo en el reporte.
3. **Diagnosticar la causa raíz, no el síntoma.** Identificar la capa correcta y arreglar ahí: un bug de reglas de negocio se arregla en el service, no parcheando el controller.
4. **GREEN: el fix mínimo** que vuelve verde el test.
5. `npm run test:run` completo para descartar regresiones.
6. **REFACTOR** si el fix dejó el código peor de como estaba.
7. Gates + auto-análisis → aprobación → docs si cambió el contrato → commit `fix:` → push → PR.
8. Si el bug revela un problema de diseño mayor, anotarlo en `DEBT.md` y **no** expandir el fix.

#### C — Cambio de esquema (Prisma)

1. Editar `prisma/schema.prisma`.
2. `npm run db:migrate` — genera la migración y la aplica en la BD local.
3. **Commitear la carpeta de migración generada** (`prisma/migrations/<timestamp>_<nombre>/`). Una migración sin versionar rompe el deploy.
4. Actualizar los tipos de `src/types/` afectados y el mock de `tests/integration/setup.ts`.
5. Tests siguiendo TDD para el comportamiento nuevo.
6. Gates.
7. **Reportar el impacto en producción**: el contenedor necesita que la migración se aplique. Si el cambio es **destructivo** (borrar columna o tabla, cambiar tipo, agregar columna `NOT NULL` sin default), **detenerse y avisar antes de generarla** (§15.18).

**Prohibido**: `prisma migrate reset`, `prisma db push` y editar a mano una migración ya aplicada.

#### D — Refactor

1. Confirmar que hay tests que cubren el comportamiento actual. Si no hay, **escribirlos primero** — ese es el arnés que prueba que el refactor no cambió nada.
2. Refactorizar sin tocar comportamiento observable ni el contrato de la API.
3. Los tests deben pasar **sin modificarse**. Si hubo que cambiar un test, ya no es un refactor: es un cambio de comportamiento → re-aprobar el plan.
4. Gates + auto-análisis → aprobación → commit `refactor:` → push → PR.

### 15.16 Prohibiciones absolutas

Nunca, sin aprobación explícita del usuario en el mensaje actual:

**Git y despliegue**

- Trabajar o commitear directo sobre `main` (salvo hotfix ordenado explícitamente)
- Hacer `git commit` sin la aprobación de la Pausa 3, o `git push` de algo no commiteado con aprobación
- `git push origin main`, `--force`, `git tag`, o cualquier cosa que dispare un deploy
- `--no-verify` o cualquier forma de saltarse los hooks de husky
- `git reset --hard`, `git checkout --`, `git clean` o cualquier comando que descarte trabajo del usuario

**Producción e infraestructura**

- Modificar `.github/workflows/**`, `Dockerfile`, `compose.prod.yaml` o `compose.yaml`
- Modificar `.env` (nunca), o escribir valores reales en `.env.example` / `.env.prod.example`
- Imprimir, loguear o copiar secretos, tokens, `JWT_SECRET`, credenciales de BD o contenido de `.env`
- Conectarse al VPS o correr comandos contra la BD de producción

**Seguridad del sandbox** — son requisitos de seguridad y académicos (§3), no parámetros ajustables:

- Relajar los límites del contenedor de ejecución (128 MB RAM, CPU quota 50000, PID limit 30, red deshabilitada, timeout de 10 s)
- Subir o eliminar el rate limit de `/execution/*` y de submit (2 req / 5 min)
- Exponer casos de prueba con `isHidden: true` en respuestas al estudiante — `/workspace` devuelve **solo** casos públicos
- Debilitar `authenticate`, `rbac` o la validación de pertenencia por `userId`

**Calidad**

- Usar `any` en código nuevo o modificado
- Escribir implementación antes del test
- Borrar o `.skip`-ear tests que fallan; relajar `tsconfig.json` o `vitest.config.ts`
- Entregar un archivo de más de 400 líneas sin justificación

**Higiene del repo**

- Editar `dist/`, `node_modules/`, `coverage/` o `package-lock.json` a mano
- Agregar, actualizar o eliminar dependencias de `package.json`

### 15.17 Cuándo detenerse y preguntar

Detenerse, explicar y esperar respuesta cuando:

1. **Falta una regla de negocio.** Ej.: qué rol puede hacer algo, cómo se recalcula una calificación, si un límite aplica retroactivamente. No inventar reglas pedagógicas.
2. **No se pueden enumerar los casos de prueba** del plan. Significa que el requerimiento no está claro.
3. **El cambio requiere una migración destructiva** (playbook C, paso 7).
4. **El fix correcto rompe el contrato de la API.** El frontend en Moodle consume estos endpoints; un cambio incompatible se coordina, no se decide.
5. **Los gates fallan por algo preexistente en `main`.** Reportar el fallo, no arreglarlo dentro de este cambio.
6. **El alcance real es mayor al pedido.** Reportar el hallazgo, proponer entregarlo aparte.
7. **Cumplir "sin `any`" exigiría refactorizar código preexistente** más allá del cambio.
8. **El árbol de trabajo tiene cambios sin commitear** que no son del agente.
9. **El cambio toca infraestructura, dependencias o cualquier punto de §15.16.**
10. **Hay dos interpretaciones razonables del pedido** que llevan a implementaciones distintas.

En todos los casos: **avanzar con todo lo que no dependa de la respuesta**, y detenerse solo en la parte bloqueada — dejando claro qué quedó pendiente y por qué.

---

## 16. Ciclo de release y deploy

> **El deploy no es automático al mergear a `main`.** Lo dispara el **líder del proyecto** creando un tag versionado. Un agente nunca inicia un release por iniciativa propia.
>
> Esta sección es el procedimiento normativo. El contexto operativo del servidor (primer despliegue, reverse proxy, backups, troubleshooting) está en `DEPLOY.md`.

### 16.1 El ciclo completo

```
┌─ Paso 1 ── main actualizado + verificaciones previas          §16.2
├─ Paso 2 ── Calcular la nueva versión (SemVer)                 §16.3
├─ Paso 3 ── Actualizar CHANGELOG.md                            §16.4
├─ Paso 4 ── Commit y push del CHANGELOG a main                 §16.5
│               ⏸  APROBACIÓN DEL LÍDER
├─ Paso 5 ── Crear el tag anotado y pushearlo  ← dispara el deploy   §16.6
└─ Paso 6 ── Verificar que el pipeline y la app quedaron sanos   §16.7
```

### 16.2 Paso 1 — `main` actualizado y verificaciones previas

El release se prepara **sobre `main`**, con todos los cambios ya mergeados:

```bash
git checkout main
git fetch origin --tags --force
git pull --rebase origin main
git status                                    # el árbol debe estar limpio
git tag --list --sort=-v:refname | head -1    # última versión publicada
git log $(git describe --tags --abbrev=0)..HEAD --oneline   # qué entra en este release
```

`git fetch --tags --force` no es opcional: sin él se calcula la versión siguiente a partir de una lista local desactualizada y se crea un tag duplicado o retrasado.

Checklist previo:

- [ ] Estoy en `main`, actualizado con `origin/main`
- [ ] El árbol de trabajo está limpio (nada sin commitear)
- [ ] El último run de CI en `main` está **verde**
- [ ] Sé exactamente qué commits entran en el release
- [ ] **¿Hay migraciones de Prisma nuevas desde la última tag?** El pipeline **no** las aplica (§16.7)
- [ ] No hay trabajo a medio mergear que debería entrar en esta versión

### 16.3 Paso 2 — Calcular la nueva versión (SemVer)

Formato del tag, tal como lo usa el repositorio: **`vMAJOR.MINOR.PATCH-alpha`**

| Componente | Se incrementa cuando                                    |
| ---------- | ------------------------------------------------------- |
| **MAJOR**  | Hay cambios incompatibles en la API                     |
| **MINOR**  | Se agrega funcionalidad retrocompatible                 |
| **PATCH**  | Correcciones retrocompatibles                           |

Reglas del proyecto:

- **Por defecto se toma la próxima inmediata: +1 en PATCH.** Ejemplo: si la última es `v0.0.19-alpha`, la nueva es `v0.0.20-alpha`.
- El salto de **MINOR** o **MAJOR** lo decide el líder explícitamente; el agente no lo propone solo.
- El sufijo **`-alpha`** se conserva mientras el proyecto siga en pre-release. Quitarlo es una decisión del líder.
- El prefijo `v` es obligatorio: el workflow `cicd_docker.yml` se dispara con el patrón `v*`.
- **Nunca reutilizar ni mover un tag ya pusheado.** Si una versión salió mal, se publica la siguiente.

### 16.4 Paso 3 — Actualizar el CHANGELOG

**El CHANGELOG se actualiza antes de crear el tag, siempre.** `CHANGELOG.md` sigue [Keep a Changelog](https://keepachangelog.com/) y es la fuente de verdad de qué trae cada versión.

1. **Mover el contenido de `[Unreleased]` a una sección nueva** con la versión y la fecha en formato `YYYY-MM-DD`, dejando `[Unreleased]` vacío arriba:

   ```markdown
   ## [Unreleased]

   ## [0.0.20-alpha] - 2026-08-05

   ### Added
   - Protocolo de trabajo para agentes con TDD obligatorio

   ### Fixed
   - Rollback del deploy a VPS
   ```

2. **Usar las categorías de Keep a Changelog**: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`. El repositorio ha usado en la práctica solo `Added`, `Changed` y `Fixed`.

3. **Actualizar los dos enlaces del pie del archivo** — es el paso que más se olvida:

   ```markdown
   [Unreleased]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.20-alpha...HEAD
   [0.0.20-alpha]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.19-alpha...v0.0.20-alpha
   ```

   Hay que **agregar** la línea de la versión nueva **y reapuntar** la de `[Unreleased]` a la tag recién creada.

Reglas de redacción:

- **En inglés**, igual que los mensajes de commit (§15.8).
- Orientado al **valor para el usuario**, no un volcado de commits. `Image URL field for subjects to display cover images in frontend` sirve; `fix stuff` no.
- Una línea por cambio, sin punto final, empezando con sustantivo o verbo en tercera persona.
- Sin la versión en `[Unreleased]` no hay release: si esa sección está vacía, o no hay nada que publicar, o alguien olvidó documentar sus cambios (§16.8).

### 16.5 Paso 4 — Commit y push del CHANGELOG · ⏸ APROBACIÓN

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for v0.0.20-alpha"
git push origin main
```

- Este commit **va directo a `main`** y es la **única excepción documentada** a la prohibición de §15.16, porque el release ocurre en `main` por definición.
- Sigue siendo obligatoria la aprobación del líder antes de ejecutarlo (§15.12).
- El mensaje va **en inglés** y en Conventional Commits, siguiendo el precedente del repositorio: `docs: update CHANGELOG for <versión>`.

### 16.6 Paso 5 — Crear el tag anotado y pushearlo

```bash
git tag -a v0.0.20-alpha -m "v0.0.20-alpha" -m "Added: agent workflow protocol with mandatory TDD" -m "Fixed: VPS deploy rollback"
git push origin v0.0.20-alpha
```

- **El tag se crea anotado (`-a`) y con comentario.** Los tags históricos del repositorio son *lightweight* (sin mensaje propio, heredan el asunto del commit); a partir de ahora se anotan para que la versión lleve su propia descripción.
- El mensaje del tag va **en inglés** y refleja el CHANGELOG de esa versión. Varios `-m` encadenados producen párrafos y funcionan igual en PowerShell y en bash.
- **Push del tag específico, nunca `git push --tags`**, para no publicar tags locales de prueba.
- El tag apunta al commit del CHANGELOG, así que ese commit debe estar pusheado antes (§16.5).

> ⚠️ **El push del tag es lo que dispara el deploy a producción.** Requiere orden explícita del líder en el mensaje actual. Un agente **nunca** ejecuta este comando por iniciativa propia, ni siquiera si ya preparó todo lo demás.

### 16.7 Paso 6 — Qué hace GitHub y qué hay que verificar

```
git push origin v0.0.20-alpha
        ↓
cicd_docker.yml          lint+typecheck → tests → build multi-arch → push a ghcr.io
                         tags publicados: :v0.0.20-alpha y :latest
        ↓ (solo si terminó en success)
cd_deploy_on_vps.yml     create-deployment → deploy-to-vps (scp compose + ssh)
                         → health-check (3 intentos, 10 s) → [rollback] → update-deployment
```

Verificaciones obligatorias después del push (el agente **reporta lo que ve**, no asume que salió bien):

- [ ] Run de `cicd_docker.yml` en verde
- [ ] Run de `cd_deploy_on_vps.yml` en verde
- [ ] El Deployment de GitHub quedó en `success`
- [ ] `curl https://codepanel.orchfr.duckdns.org/api/health` responde `200` y la `version` esperada

> ⚠️ **El pipeline NO aplica migraciones de Prisma.** El contenedor arranca con `node dist/app.js` (ver `Dockerfile`), sin paso de `migrate deploy`. Si el release incluye migraciones, hay que aplicarlas manualmente en el VPS antes o después del deploy según el caso — procedimiento en `DEPLOY.md` §5.5. Un release con migraciones **sin aplicar** deja la app corriendo contra un esquema viejo.

> ⚠️ **El rollback automático NO funciona** — ver `DEBT.md` **DEBT‑30**. La imagen `:previous` nunca se crea porque el allowlist de `sudo` del usuario `deployer` deniega `docker inspect` y `docker tag` con argumentos, y el error se silencia. Si el healthcheck falla, **la aplicación queda caída** aunque el Deployment de GitHub reporte *"rolled back to previous version"*. Ante un healthcheck rojo, asumir que **no** hubo reversión y actuar manualmente (§16.8).

### 16.8 Si el deploy falla

1. **No publicar otra tag a la carrera.** Primero entender qué falló.
2. Revisar, en orden: el log del job que falló, y luego los logs del contenedor en el VPS (`DEPLOY.md` §10).
3. **Asumir que no hubo rollback** (DEBT‑30) y verificar el estado real de la app con `/api/health`.
4. **Reversión manual**: re-desplegar la imagen de la versión anterior por su tag inmutable de `ghcr.io` (`:v0.0.19-alpha`), no por `:latest` — procedimiento en `DEPLOY.md` §9.
5. Si la versión quedó inservible, dejarlo anotado en el CHANGELOG al publicar la corrección.

**La reversión de producción la ejecuta el líder.** Un agente puede diagnosticar, leer logs y redactar los comandos, pero no se conecta al VPS ni ejecuta el rollback (§15.16).

### 16.9 Rol del agente en un release

| El agente **sí** puede                                          | El agente **nunca** hace                                   |
| --------------------------------------------------------------- | ---------------------------------------------------------- |
| Listar qué commits entran desde la última tag                   | Decidir que toca hacer un release                          |
| Calcular la versión siguiente y proponerla                      | Saltar MINOR o MAJOR por su cuenta                         |
| Redactar la entrada del CHANGELOG y actualizar los enlaces      | Pushear el tag sin orden explícita                         |
| Redactar el mensaje del tag y del commit                        | Conectarse al VPS o ejecutar el deploy                     |
| Verificar el estado de los runs, el Deployment y `/api/health`  | Crear un GitHub Release o mover un tag existente           |
| Reportar fallos con la salida real de los logs                  | Declarar el deploy exitoso sin haberlo verificado          |

### 16.10 Estado del CHANGELOG

**El CHANGELOG está alineado con los tags publicados hasta `v0.0.19-alpha`.** Verifica la alineación antes de preparar cualquier release:

```bash
git tag --list --sort=-v:refname | head -1      # última versión publicada
grep -m2 "^## \[" CHANGELOG.md                  # [Unreleased] y la última documentada
```

Ambas deben coincidir. Si no coinciden, hay releases sin documentar y hay que cerrar la brecha antes de publicar la versión siguiente. Aplicar el §16.4 en cada release es lo que evita que vuelva a abrirse.
