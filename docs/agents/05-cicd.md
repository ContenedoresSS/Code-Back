# CI/CD

Tres workflows en GitHub Actions:

## `ci_pr.yml`
- **Disparador**: pull request a `main`
- **Acción**: valida el PR con 4 jobs segmentados
  - `lint-format` — verifica formato con Prettier
  - `typecheck` — compila TypeScript
  - `tests` — ejecuta tests (depende de typecheck)
  - `docker-build` — valida que la imagen Docker compila (solo `linux/amd64`, sin push)
- **Propósito**: asegurar calidad antes del merge

## `cicd_docker.yml`
- **Disparador**: tag `v*` (ej. `v1.2.3`)
- **Acción**: 4 jobs segmentados para eficiencia
  - `lint-and-typecheck` — verifica formato con Prettier y compila TypeScript
  - `tests` — ejecuta tests (depende de lint-and-typecheck)
  - `docker-build` — construye imagen multi-arch sin push (depende de tests)
  - `docker-push` — push a `ghcr.io/<repo>` con tags `:v1.2.3` y `:latest` (depende de docker-build)
- **Propósito**: construir y publicar la imagen Docker

## `cd_deploy_on_vps.yml`
- **Disparador**: se ejecuta automáticamente al completar `cicd_docker.yml` exitosamente
- **Acción**: 5 jobs con healthcheck y rollback automático
  - `create-deployment` — crea GitHub Deployment con status "pending"
  - `deploy-to-vps` — SCP de `compose.prod.yaml` al VPS como `compose.yml`, SSH al VPS, guarda imagen actual como `previous`, pull nueva imagen, restart
  - `health-check` — consulta `/health` con retry (3 intentos, 10s entre cada uno)
  - `rollback` (condicional) — si healthcheck falla, restaura imagen `previous`
  - `update-deployment` — actualiza GitHub Deployment a "success" o "failure"
- **Propósito**: desplegar con verificación y rollback automático

## Flujo de deploy completo

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

## Healthcheck endpoint

- **Ruta**: `GET /api/health`
- **Rate limit**: 10 req/min por IP
- **Respuesta**: `{ status: "ok", timestamp: "...", version: "..." }`
- **Propósito**: smoke test para el pipeline de deploy

## Rollback strategy

- Antes del deploy, la imagen actual se taggea como `previous`
- Si el healthcheck falla, el job `rollback` restaura la imagen `previous`
- El GitHub Deployment se marca como "failure" con descripción "rolled back"

## Docker Compose

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

## Infraestructura del VPS

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
