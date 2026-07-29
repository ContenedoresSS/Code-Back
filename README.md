# Code Panel — Backend

Sistema de ejecución remota de código y calificación automática, embebido en **Moodle** vía iframe. Desarrollado como proyecto de **servicio social** para la **UADY** (Yucatán, México).

---

## Qué hace

- Ejecuta código de estudiantes en contenedores Docker efímeros con sandboxing estricto
- Evalúa automáticamente las soluciones contra casos de prueba (públicos y ocultos)
- Gestiona materias, actividades de programación, entregas y calificaciones
- Tres roles: **God** (admin), **Teacher** (profesor), **Student** (alumno)

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 24 (Alpine) |
| Lenguaje | TypeScript 6 (strict) |
| Framework | Express 5 |
| ORM | Prisma 7 + PostgreSQL |
| Ejecución | Docker (`dockerode`) |
| Auth | JWT (access 4h + refresh 7d), bcrypt |
| Validación | Zod 4 |
| CI/CD | GitHub Actions → ghcr.io → SSH al VPS |

---

## Desarrollo local

### Requisitos

- Node.js ≥ 24
- Docker (con socket accesible)
- PostgreSQL

### Setup

```bash
cp .env.example .env   # editar con valores reales
npm install
npm run db:init        # Prisma generate + migrate + seed
npm run dev            # tsx watch con hot reload
```

### Variables de entorno

```
PORT=3000
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
JWT_SECRET=<mínimo 20 caracteres>
JWT_REFRESH_SECRET=<mínimo 20 caracteres>
NODE_ENV=development
```

### Comandos

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor con hot reload |
| `npm run build` | Compila a `dist/` |
| `npm run format` | Formatea con Prettier |
| `npm run format:check` | Verifica formato |
| `npm run db:init` | Prisma generate + migrate + seed |
| `npm run db:migrate` | Aplica migraciones pendientes |
| `npm run db:status` | Estado de migraciones |

---

## Estructura

```
src/
├── app.ts              # Punto de entrada
├── config/             # env (Zod) + Prisma singleton
├── controllers/        # Request/response (9 controladores)
├── services/           # Lógica de negocio
│   ├── execution.service.ts   # Motor de ejecución con Docker
│   ├── evaluation.service.ts  # Motor de calificación automática
│   └── interfaces/            # Interfaces por servicio
├── middlewares/        # auth (JWT), rbac (3 roles), rate limiting
├── routes/             # Rutas bajo /api/v1
├── types/              # Enums, requests, responses, modelos
└── helpers/            # Base64, paginación, params
```

---

## API — `/api/v1`

### Auth
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Registro (con o sin invitación) |
| POST | `/auth/login` | — | Login |
| POST | `/auth/refresh` | — | Refrescar access token |

### Execution (rate‑limited)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/execution/run` | Ejecutar un archivo de código |
| POST | `/execution/run-with-files` | Ejecutar con múltiples archivos |

### Activity
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/activity` | Teacher | Crear actividad |
| GET | `/activity` | Teacher | Listar actividades |
| GET | `/activity/:id` | Teacher | Obtener actividad |
| PUT | `/activity/:id` | Teacher | Actualizar actividad |
| DELETE | `/activity/:id` | Teacher | Eliminar actividad |
| GET | `/activity/:id/workspace` | — | Workspace del estudiante |
| POST | `/activity/:id/submit` | Opcional + rate‑limited | Enviar solución |
| GET | `/activity/:id/test-case` | Teacher | Listar casos de prueba |
| POST | `/activity/:id/test-case` | Teacher | Crear caso de prueba |
| PUT | `/activity/:id/test-case/:testCaseId` | Teacher | Actualizar caso |
| DELETE | `/activity/:id/test-case/:testCaseId` | Teacher | Eliminar caso |

### Otros módulos

| Módulo | Auth | Descripción |
|--------|------|-------------|
| `/invitation` | God | Códigos de invitación (CRUD) |
| `/programming-language` | God | Lenguajes de programación (CRUD) |
| `/user` | Bearer | Perfil, actualizar, cambiar contraseña |
| `/subject` | Teacher | Materias (CRUD) |

---

## Motor de ejecución

1. Recibe archivos de código codificados en Base64
2. Busca el lenguaje en BD (imagen Docker + comando de ejecución)
3. Crea un contenedor efímero con restricciones estrictas:
   - 128 MB RAM, sin swap
   - CPU quota 50000
   - PID limit 30
   - Red deshabilitada
   - Timeout de 10 segundos
4. Transfiere los archivos vía tar stream al contenedor
5. Ejecuta, captura stdout/stderr, destruye el contenedor
6. Retorna resultado con status, output y tiempo de ejecución

Lenguajes soportados: **C++** (gcc 13.2), **Python** (3.11), **Node.js** (20), **Java** (openjdk 21).

---

## Motor de evaluación

1. Itera cada caso de prueba ejecutando el código
2. Clasifica: compile error, runtime error, timeout, wrong answer, accepted
3. Cuenta tests pasados vs totales
4. Calcula calificación: `(passedTests / totalTests) * 100`

---

## Despliegue

```bash
cd /opt/code-panel-back
docker compose -f compose.prod.yaml up -d
docker compose -f compose.prod.yaml exec backend npx prisma migrate deploy
docker compose -f compose.prod.yaml exec backend npx tsx prisma/seed.ts
```

Guía completa en [`DEPLOY.md`](./DEPLOY.md).

---

## Documentación adicional

| Archivo | Contenido |
|---------|-----------|
| [`AGENTS.md`](./AGENTS.md) | Contexto de negocio, arquitectura detallada, convenciones |
| [`DEBT.md`](./DEBT.md) | Análisis de deuda técnica con 26 hallazgos priorizados |
| [`DEPLOY.md`](./DEPLOY.md) | Guía de despliegue agnóstica a plataforma |

---

## Repositorios relacionados

- **Backend** (este repo) — API REST
- [**Frontend**](https://github.com/ContenedoresSS/Code-Panel-Frontend) — Editor de código embebido en Moodle via iframe
- **URL pública** — `https://codepanel.orchfr.duckdns.org`
