# Guía de despliegue — Code Panel Backend

El backend es **agnóstico a la plataforma de despliegue**. Solo requiere Docker. Esta guía cubre desde cero hasta producción en cualquier entorno (VPS, servidor dedicado, VM local).

---

## Tabla de contenidos

1. [Requisitos mínimos](#1-requisitos-mínimos)
2. [Estructura de archivos esperada en el servidor](#2-estructura-de-archivos-esperada-en-el-servidor)
3. [compose.prod.yaml — La pieza central](#3-composeprodyaml--la-pieza-central)
4. [Variables de entorno de producción (.env)](#4-variables-de-entorno-de-producción-env)
5. [Primer despliegue (paso a paso)](#5-primer-despliegue-paso-a-paso)
6. [Reverse proxy y SSL (opcional)](#6-reverse-proxy-y-ssl-opcional)
7. [Conectar el CI/CD (GitHub Actions → VPS)](#7-conectar-el-cicd-github-actions--vps)
8. [Proceso de versionamiento y CHANGELOG](#8-proceso-de-versionamiento-y-changelog)
9. [Actualización manual (sin CI/CD)](#9-actualización-manual-sin-cicd)
10. [Mantenimiento y troubleshooting](#10-mantenimiento-y-troubleshooting)
11. [Migración a otro servidor](#11-migración-a-otro-servidor)
12. [Seguridad básica del host](#12-seguridad-básica-del-host)
13. [Resumen: checklist de primer despliegue](#13-resumen-checklist-de-primer-despliegue)
14. [Frontend deployment](#14-frontend-deployment)

---

## 1. Requisitos mínimos

| Requisito                | Detalle                                                              |
| ------------------------ | -------------------------------------------------------------------- |
| Docker Engine            | ≥ 24                                                                 |
| Docker Compose           | v2 (plugin `docker compose`, no el legacy `docker-compose`)          |
| Socket de Docker         | Accesible desde el contenedor del backend (bind mount)               |
| PostgreSQL               | 15+ (puede ser contenedor en el mismo compose o servicio externo)    |
| RAM                      | Mínimo 512 MB para el backend + overhead por contenedores de ejecución concurrentes |
| Arquitectura             | AMD64 o ARM64 (el CI/CD publica ambas en ghcr.io)                    |

---

## 2. Estructura de archivos esperada en el servidor

```
/opt/code-panel-back/
├── compose.prod.yaml      ← Compose de producción (con DB, socket, volúmenes)
├── .env                   ← Variables de entorno (JWT, DB, etc.)
├── ...                    ← (el resto lo gestiona Docker, no necesita clonar el repo)
```

---

## 3. `compose.prod.yaml` — La pieza central

Este archivo **ya está incluido en el repositorio** (`compose.prod.yaml`). Define todos los servicios necesarios para producción:

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

Este compose:

- Incluye PostgreSQL como servicio interno con healthcheck.
- El backend depende de que la BD esté saludable antes de iniciar.
- Usa variables de entorno del archivo `.env` para todos los secretos.
- El único acople al host es el bind mount del socket de Docker (`/var/run/docker.sock`).
- Expone el backend en el puerto configurado (default: 5555 → 3000 interno).
- Expone PostgreSQL en el puerto configurado (default: 5432).

---

## 4. Variables de entorno de producción (`.env`)

El archivo `.env` **no debe incluirse en el repositorio**. Crea este archivo en el servidor:

```bash
# ── Puerto del backend ──
PORT=5555
NODE_ENV=production

# ── Base de datos (PostgreSQL dentro del compose) ──
POSTGRES_USER=<usuario-postgres>
POSTGRES_PASSWORD=<contraseña-segura>
POSTGRES_DB=<nombre-base-de-datos>
POSTGRES_PORT=5432
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db_postgres:5432/${POSTGRES_DB}"

# ── CORS ──
CORS_ORIGINS="http://localhost:5173,https://codepanel.orchfr.duckdns.org"

# ── JWT ──
JWT_SECRET=<mínimo-20-caracteres>
JWT_REFRESH_SECRET=<mínimo-20-caracteres>
```

**Generar secretos seguros**:
```bash
openssl rand -base64 64   # Para JWT_SECRET
openssl rand -base64 64   # Para JWT_REFRESH_SECRET
openssl rand -base64 32   # Para POSTGRES_PASSWORD
```

**Nota**: El `DATABASE_URL` usa `db_postgres` como host porque ese es el nombre del servicio en el compose. Docker Compose resuelve automáticamente este nombre a la IP del contenedor de PostgreSQL.

Si usas un PostgreSQL externo (no el del compose), ajusta `DATABASE_URL` al host y puerto correspondientes y considera eliminar el servicio `db_postgres` del compose.

---

## 5. Primer despliegue (paso a paso)

### 5.1 Preparar el servidor

```bash
# Verificar que Docker esté instalado
docker --version
docker compose version

# Verificar que el socket de Docker existe
ls -la /var/run/docker.sock
```

### 5.2 Crear directorio y archivos

```bash
mkdir -p /opt/code-panel-back
cd /opt/code-panel-back

# Crear el archivo .env con las variables de la sección 4
nano .env

# Crear el compose.prod.yaml con el contenido de la sección 3
nano compose.prod.yaml
```

### 5.3 Si quieres usar imágenes pre-built desde ghcr.io (recomendado)

```bash
# Iniciar sesión en GitHub Container Registry (necesario si el repo es privado)
echo "<GITHUB_TOKEN>" | docker login ghcr.io -u <tu-usuario> --password-stdin

# Descargar imágenes y levantar
docker compose -f compose.prod.yaml pull
docker compose -f compose.prod.yaml up -d
```

### 5.4 Si prefieres construir la imagen localmente

```bash
# Clonar el repositorio temporalmente para el build
git clone https://github.com/ContenedoresSS/Code-Panel-Backend.git /tmp/code-back
cd /opt/code-panel-back

# Copiar el compose.prod.yaml y Dockerfile desde el repo
cp /tmp/code-back/compose.prod.yaml .
cp /tmp/code-back/Dockerfile .

# Construir y levantar
docker compose -f compose.prod.yaml up -d --build
```

### 5.5 Ejecutar migraciones y seed

```bash
# Aplicar migraciones de Prisma
docker compose -f compose.prod.yaml exec code-panel-back npx prisma migrate deploy

# Ejecutar seed (crea roles, admin, profesor demo, lenguajes)
docker compose -f compose.prod.yaml exec code-panel-back npx tsx prisma/seed.ts
```

### 5.6 Verificar

```bash
# Estado de los contenedores
docker compose -f compose.prod.yaml ps

# Logs del backend (Ctrl+C para salir)
docker compose -f compose.prod.yaml logs -f code-panel-back

# Health check manual (desde el host o desde dentro de la red del compose)
curl http://localhost:3000/tonoto
```

Deberías recibir `{"message":"hola tonoto"}`.

---

## 6. Reverse proxy y SSL (opcional)

El backend expone HTTP en el puerto 3000. Para producción real necesitas un reverse proxy que maneje HTTPS. Esto **no es responsabilidad del backend** — aquí hay tres patrones de referencia.

### 6.1 Opción más simple: Caddy

Caddy obtiene y renueva certificados SSL automáticamente con Let's Encrypt. Ideal si no quieres mantener Nginx + Certbot.

**`compose.prod.yaml`** (agregar este servicio):

```yaml
  caddy:
    image: caddy:2-alpine
    container_name: code_panel_caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - app_network
```

**`Caddyfile`** (crear en `/opt/code-panel-back/Caddyfile`):

```
codepanel.orchfr.duckdns.org {
    reverse_proxy backend:3000
}
```

Agregar los volúmenes al final del compose:
```yaml
volumes:
  pgdata:
  caddy_data:
  caddy_config:
```

### 6.2 Opción clásica: Nginx + Certbot

```bash
# Instalar Nginx y Certbot en el host
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx

# Crear configuración de Nginx
sudo nano /etc/nginx/sites-available/code-panel
```

```nginx
server {
    listen 80;
    server_name codepanel.orchfr.duckdns.org;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Activar el sitio y obtener SSL
sudo ln -s /etc/nginx/sites-available/code-panel /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d codepanel.orchfr.duckdns.org

# La renovación es automática (systemd timer de certbot)
sudo systemctl status certbot.timer
```

### 6.3 Opción cloud: Cloudflare Tunnel

Si estás detrás de CG-NAT o no puedes abrir puertos, Cloudflare Tunnel expone el servicio sin abrir el firewall.

```bash
# Instalar cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# Autenticar y crear túnel
cloudflared tunnel login
cloudflared tunnel create code-panel
cloudflared tunnel route dns code-panel codepanel.orchfr.duckdns.org

# Configurar el túnel (~/.cloudflared/config.yml)
```

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: codepanel.orchfr.duckdns.org
    service: http://localhost:3000
  - service: http_status:404
```

```bash
# Instalar como servicio
sudo cloudflared service install
```

---

## 7. Conectar el CI/CD (GitHub Actions → VPS)

El proyecto tiene dos workflows en `.github/workflows/` que trabajan juntos:

### 7.1 Flujo de CI/CD

1. **CI** (`cicd_docker.yml`): Se dispara al crear un tag `v*`
   - Build multiplataforma (linux/amd64, linux/arm64)
   - Push a `ghcr.io/contenedoresss/code-panel-backend` con tags `:vX.Y.Z` y `:latest`

2. **CD** (`cd_deploy_on_vps.yml`): Se dispara automáticamente cuando el CI termina exitosamente
   - SSH al VPS usando las llaves configuradas
   - `docker compose pull` para obtener la nueva imagen
   - `docker compose up -d --remove-orphans` para desplegar
   - `docker image prune -af` para limpiar imágenes viejas

### 7.2 Generar par de llaves SSH

```bash
# En tu máquina local (NO en el VPS)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/code_panel_deploy
```

Esto genera:
- `~/.ssh/code_panel_deploy` → **llave privada** (va a GitHub Secrets)
- `~/.ssh/code_panel_deploy.pub` → **llave pública** (va al VPS)

### 7.3 Autorizar la llave pública en el VPS

```bash
# Copiar la llave pública al VPS
cat ~/.ssh/code_panel_deploy.pub | ssh usuario@vps "cat >> ~/.ssh/authorized_keys"

# Verificar que funciona
ssh -i ~/.ssh/code_panel_deploy usuario@vps "echo OK"
```

### 7.4 Configurar secrets en GitHub

En el repositorio: **Settings → Secrets and variables → Actions → Repository secrets**:

| Secret         | Valor                                      |
| -------------- | ------------------------------------------ |
| `VPS_HOST`     | IP o hostname del VPS                      |
| `VPS_USER`     | Usuario SSH con acceso al VPS              |
| `VPS_SSH_KEY`  | Contenido completo de `~/.ssh/code_panel_deploy` (la llave privada) |

### 7.5 Verificar el pipeline

Haz un push con un tag `v*`:

```bash
git tag v0.0.15-alpha
git push origin v0.0.15-alpha
```

Esto dispara:
1. **CI** (`cicd_docker.yml`) → build multi‑arch + push a `ghcr.io`
2. **CD** (`cd_deploy_on_vps.yml`) → SSH al VPS → `docker compose pull && up -d` → prune

Los logs aparecen en la pestaña **Actions** del repositorio.

---

## 8. Proceso de versionamiento y CHANGELOG

> El **procedimiento normativo** del ciclo de release está en `docs/agents/10-release-cycle.md`, incluidas las verificaciones previas, el punto de aprobación del líder y las advertencias sobre migraciones y rollback. Esta sección cubre el detalle operativo del versionamiento y el CHANGELOG.

### 8.1 Versionamiento SemVer

Este proyecto utiliza [Semantic Versioning](https://semver.org/lang/es/) (SemVer) con el formato `MAJOR.MINOR.PATCH`:

- **MAJOR**: Cambios incompatibles en la API
- **MINOR**: Nuevas funcionalidades compatibles con versiones anteriores
- **PATCH**: Corrección de errores compatible con versiones anteriores

Para versiones de desarrollo/pre-release, se usa el sufijo `-alpha`:
```
v0.0.14-alpha
```

### 8.2 Flujo de release

1. **Desarrollar features** en ramas y mergear a `main` vía PR (nunca commits directos a `main`)
2. **Sincronizar `main` y los tags** antes de calcular la versión:
   ```bash
   git checkout main
   git fetch origin --tags --force
   git pull --rebase origin main
   git tag --list --sort=-v:refname | head -1   # última versión publicada
   ```
3. **Actualizar CHANGELOG.md** (ver sección 8.3)
4. **Commit y push del CHANGELOG**:
   ```bash
   git add CHANGELOG.md
   git commit -m "docs: update CHANGELOG for v0.0.20-alpha"
   git push origin main
   ```
5. **Crear el tag anotado y pushearlo** — esto dispara el deploy a producción:
   ```bash
   git tag -a v0.0.20-alpha -m "v0.0.20-alpha" -m "Added: ..." -m "Fixed: ..."
   git push origin v0.0.20-alpha
   ```
   El tag se crea **anotado** (`-a`, con comentario propio) y se pushea **individualmente**, nunca con `git push --tags`.
6. **CI/CD se ejecuta automáticamente**:
   - CI (`cicd_docker.yml`): lint + typecheck → tests → build multiplataforma → push a `ghcr.io` con `:vX.Y.Z-alpha` y `:latest`
   - CD (`cd_deploy_on_vps.yml`): SCP del compose → SSH al VPS → `docker compose pull && up -d` → health check
7. **Verificar el resultado**: los dos runs en verde, el Deployment en `success` y `/api/health` respondiendo `200`.

> ⚠️ El pipeline **no aplica migraciones de Prisma** (ver sección 5.5) y el **rollback automático no funciona** (`docs/agents/DEBT.md` DEBT‑30). Si el health check falla, asume que la app quedó caída y revierte manualmente con la sección 9, usando el tag inmutable de la versión anterior.

### 8.3 Mantener el CHANGELOG

El archivo `CHANGELOG.md` sigue el formato [Keep a Changelog](https://keepachangelog.com/).

**Antes de crear un nuevo tag**, actualiza el CHANGELOG:

1. **Agregar cambios no versionados** en la sección `[Unreleased]`:
   ```markdown
   ## [Unreleased]

   ### Added
   - Nueva funcionalidad X
   - Nuevo endpoint Y

   ### Fixed
   - Corrección del bug Z
   ```

2. **Al crear un nuevo tag**, mueve los cambios de `[Unreleased]` a la nueva versión:
   ```markdown
   ## [Unreleased]

   ## [0.0.15-alpha] - 2026-08-03

   ### Added
   - Nueva funcionalidad X
   - Nuevo endpoint Y

   ### Fixed
   - Corrección del bug Z
   ```

3. **Actualizar los dos enlaces del pie del archivo.** Hay que agregar la línea de la versión nueva **y** reapuntar la de `[Unreleased]` a la tag recién creada:
   ```markdown
   [Unreleased]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.20-alpha...HEAD
   [0.0.20-alpha]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.19-alpha...v0.0.20-alpha
   ```
   Olvidar el enlace de `[Unreleased]` deja el comparador apuntando a una versión vieja.

### 8.4 Categorías del CHANGELOG

Usa estas categorías para organizar los cambios:

- **Added**: Nuevas funcionalidades
- **Changed**: Cambios en funcionalidades existentes
- **Deprecated**: Funcionalidades que serán eliminadas
- **Removed**: Funcionalidades eliminadas
- **Fixed**: Corrección de errores
- **Security**: Cambios relacionados con seguridad

### 8.5 Ejemplo completo de release

```bash
# 0. Sincronizar main y los tags, y ver la última versión publicada
git checkout main
git fetch origin --tags --force
git pull --rebase origin main
git tag --list --sort=-v:refname | head -1        # → v0.0.19-alpha

# 1. Actualizar CHANGELOG.md
#    - mover [Unreleased] a ## [0.0.20-alpha] - 2026-08-05
#    - actualizar los dos enlaces del pie (Unreleased y la versión nueva)

# 2. Commit y push del CHANGELOG
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for v0.0.20-alpha"
git push origin main

# 3. Crear el tag anotado (con comentario propio)
git tag -a v0.0.20-alpha -m "v0.0.20-alpha" -m "Added: ..." -m "Fixed: ..."

# 4. Push del tag — esto dispara el deploy a producción
git push origin v0.0.20-alpha

# 5. Verificar
curl -s https://codepanel.orchfr.duckdns.org/api/health
```

El CI/CD se ejecutará automáticamente y desplegará la nueva versión. **Verifica siempre** los dos runs de Actions, el estado del Deployment y el health check: el rollback automático no es confiable (`docs/agents/DEBT.md` DEBT‑30).

---

## 9. Actualización manual (sin CI/CD)

Si alguna vez necesitas actualizar sin pasar por GitHub Actions:

```bash
cd /opt/code-panel-back

# Opción A: usando imágenes pre‑built (recomendado)
docker compose -f compose.prod.yaml pull code-panel-back
docker compose -f compose.prod.yaml up -d code-panel-back

# Opción B: reconstruyendo localmente
docker compose -f compose.prod.yaml up -d --build code-panel-back

# Verificar que arrancó
docker compose -f compose.prod.yaml logs --tail=50 code-panel-back
```

---

## 10. Mantenimiento y troubleshooting

### Logs

```bash
# Todos los servicios
docker compose -f compose.prod.yaml logs -f

# Solo el backend
docker compose -f compose.prod.yaml logs -f code-panel-back

# Últimas 100 líneas
docker compose -f compose.prod.yaml logs --tail=100 code-panel-back
```

### Reiniciar servicios

```bash
# Reiniciar solo el backend (sin tirar la BD)
docker compose -f compose.prod.yaml restart code-panel-back

# Bajar y volver a levantar todo
docker compose -f compose.prod.yaml down
docker compose -f compose.prod.yaml up -d
```

### Limpieza de imágenes viejas

El workflow de CD ya ejecuta `docker image prune -af`. Manualmente:

```bash
# Eliminar imágenes sin uso
docker image prune -af

# Ver espacio en disco
docker system df
df -h
```

### Las imágenes de lenguajes ocupan espacio

El backend descarga imágenes Docker para ejecutar código (gcc, python, node, openjdk). Con 4 lenguajes, pueden ocupar ~2-3 GB. Si el disco se llena:

```bash
# Ver qué imágenes hay y cuánto ocupan
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | sort -k3 -h

# El backend las descargará de nuevo bajo demanda si se eliminan
docker image prune -a
```

### Backup de PostgreSQL

```bash
# Backup completo
docker compose -f compose.prod.yaml exec db_postgres pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup comprimido
docker compose -f compose.prod.yaml exec db_postgres pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restaurar backup

```bash
# Restaurar desde archivo .sql
cat backup.sql | docker compose -f compose.prod.yaml exec -T db_postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}

# Restaurar desde archivo comprimido
gunzip -c backup.sql.gz | docker compose -f compose.prod.yaml exec -T db_postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}
```

### Programar backups automáticos (cron)

```bash
# Agregar al crontab del host (diario a las 3 AM)
crontab -e

# Agregar esta línea:
0 3 * * * docker compose -f /opt/code-panel-back/compose.prod.yaml exec -T db_postgres pg_dump -U code_panel code_panel | gzip > /opt/code-panel-back/backups/backup_$(date +\%Y\%m\%d).sql.gz
```

```bash
mkdir -p /opt/code-panel-back/backups
```

### Error: puerto 3000 ya en uso

```bash
# Ver qué proceso ocupa el puerto
sudo ss -tlnp | grep 3000
```

Si es otro contenedor: `docker compose -f compose.prod.yaml down` y volver a levantar.

### Error: el backend no puede conectarse al socket de Docker

```bash
# Verificar que el socket existe y tiene permisos
ls -la /var/run/docker.sock

# El usuario dentro del contenedor necesita acceso. Si el socket es del grupo docker:
sudo usermod -aG docker $USER

# Verificar desde dentro del contenedor
docker compose -f compose.prod.yaml exec code-panel-back ls -la /var/run/docker.sock
```

### El backend no levanta porque la BD no está lista

El `depends_on` con `condition: service_healthy` resuelve esto. Si aún falla, verifica que PostgreSQL haya terminado de inicializar:

```bash
docker compose -f compose.prod.yaml logs db_postgres
```

---

## 11. Migración a otro servidor

El backend es agnóstico a la plataforma. Migrar es:

```bash
# En el servidor viejo: backup de la BD
cd /opt/code-panel-back
docker compose -f compose.prod.yaml exec -T db_postgres pg_dump -U code_panel code_panel | gzip > backup.sql.gz

# Copiar backup y archivos al nuevo servidor
scp backup.sql.gz usuario@nuevo-vps:/opt/code-panel-back/
scp .env usuario@nuevo-vps:/opt/code-panel-back/
scp compose.prod.yaml usuario@nuevo-vps:/opt/code-panel-back/

# En el servidor nuevo
cd /opt/code-panel-back
docker compose -f compose.prod.yaml up -d
gunzip -c backup.sql.gz | docker compose -f compose.prod.yaml exec -T db_postgres psql -U code_panel -d code_panel
docker compose -f compose.prod.yaml restart code-panel-back
```

---

## 12. Seguridad básica del host

Independiente del backend, todo servidor expuesto debería:

```bash
# Firewall: solo exponer lo necesario
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp       # SSH
sudo ufw allow 80/tcp       # HTTP (necesario para renovar Let's Encrypt)
sudo ufw allow 443/tcp      # HTTPS
sudo ufw enable

# Actualizaciones automáticas de seguridad
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Fail2ban para proteger SSH
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

---

## 13. Resumen: checklist de primer despliegue

- [ ] Docker y Docker Compose instalados en el host
- [ ] `/opt/code-panel-back` creado
- [ ] `compose.prod.yaml` copiado al servidor
- [ ] `.env` configurado con valores reales
- [ ] `docker compose up -d` ejecutado
- [ ] Migraciones aplicadas (`prisma migrate deploy`)
- [ ] Seed ejecutado (`tsx prisma/seed.ts`)
- [ ] `curl http://localhost:3000/tonoto` responde OK
- [ ] Reverse proxy + SSL configurado (opcional pero recomendado)
- [ ] Firewall del host configurado (solo 22, 80, 443 expuestos)
- [ ] Par de llaves SSH generado y configurado para CI/CD
- [ ] Secrets de GitHub Actions configurados
- [ ] Primer deploy vía CI/CD verificado con tag `v*`
- [ ] Backups automáticos programados

---

## 14. Frontend deployment

> This section is kept in English by request. The rest of the deployment guide describes the backend only.

The **frontend** (React admin panel and code editor) lives in a separate repository and is **not covered by `compose.prod.yaml`** here. Two deployment options exist.

### 14.1 Current: Cloudflare Pages

Today the frontend is deployed on **Cloudflare Pages** (static hosting + CDN). There is nothing to configure in this repository for that option.

### 14.2 Alternative: containerized frontend

The frontend **can also be deployed as a container** next to the backend. In that case, add a frontend service to `compose.prod.yaml` (built image or build from the frontend repo) and route it through the same reverse proxy. Nothing in the backend changes.

### 14.3 Frontend to backend communication

- The frontend calls the backend over **HTTPS with CORS** enabled (see `CORS_ORIGINS` in the `.env`).
- The backend is served **behind an Nginx reverse proxy** (SSL termination).
- **PostgreSQL is not exposed** to the internet; it only listens on the internal Docker network.

See [`docs/design/architecture-diagram.md`](../design/architecture-diagram.md) for the full deployment topology.
