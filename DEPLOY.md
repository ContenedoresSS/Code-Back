# Guía de despliegue — Code Panel Backend

El backend es **agnóstico a la plataforma de despliegue**. Solo requiere Docker. Esta guía cubre desde cero hasta producción en cualquier entorno (VPS, servidor dedicado, VM local).

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

Este archivo **debe incluirse en el repositorio** (hoy no existe). Define todos los servicios necesarios para producción:

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: code_panel_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app_network

  backend:
    image: ghcr.io/carloosaz/code-back:latest
    container_name: containers_back
    restart: unless-stopped
    ports:
      - "${PORT:-3000}:${PORT:-3000}"
    env_file:
      - .env
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock # Unico requisito del host
    depends_on:
      db:
        condition: service_healthy
    networks:
      - app_network

volumes:
  pgdata:
    driver: local

networks:
  app_network:
    driver: bridge
```

Este compose:

- Incluye PostgreSQL como servicio interno.
- Expone solo el backend (la BD no es accesible desde fuera del compose).
- El healthcheck del backend depende del healthcheck de PostgreSQL.
- Usa una red interna (`app_network`) para que los servicios se comuniquen.
- El único acople al host es el bind mount del socket de Docker (`/var/run/docker.sock`).

---

## 4. Variables de entorno de producción (`.env`)

```bash
# ── Puerto ──
PORT=3000
NODE_ENV=production

# ── Base de datos (PostgreSQL dentro del compose) ──
POSTGRES_USER=code_panel
POSTGRES_PASSWORD=<contraseña-segura>
POSTGRES_DB=code_panel
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}"

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

Si usas un PostgreSQL externo (no el del compose), ajusta `DATABASE_URL` al host y puerto correspondientes y quita el servicio `db` del compose.

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
git clone https://github.com/carloosaz/code-back.git /tmp/code-back
cd /opt/code-panel-back

# Construir y levantar
docker compose -f compose.prod.yaml up -d --build
```

### 5.5 Ejecutar migraciones y seed

```bash
# Aplicar migraciones de Prisma
docker compose -f compose.prod.yaml exec backend npx prisma migrate deploy

# Ejecutar seed (crea roles, admin, profesor demo, lenguajes)
docker compose -f compose.prod.yaml exec backend npx tsx prisma/seed.ts
```

### 5.6 Verificar

```bash
# Estado de los contenedores
docker compose -f compose.prod.yaml ps

# Logs del backend (Ctrl+C para salir)
docker compose -f compose.prod.yaml logs -f backend

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

El workflow `cd_deploy_on_vps.yml` ya existe en el repo. Para que funcione, necesitas configurar 3 secrets en GitHub y autorizar la llave SSH en el VPS.

### 7.1 Generar par de llaves SSH

```bash
# En tu máquina local (NO en el VPS)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/code_panel_deploy
```

Esto genera:
- `~/.ssh/code_panel_deploy` → **llave privada** (va a GitHub Secrets)
- `~/.ssh/code_panel_deploy.pub` → **llave pública** (va al VPS)

### 7.2 Autorizar la llave pública en el VPS

```bash
# Copiar la llave pública al VPS
cat ~/.ssh/code_panel_deploy.pub | ssh usuario@vps "cat >> ~/.ssh/authorized_keys"

# Verificar que funciona
ssh -i ~/.ssh/code_panel_deploy usuario@vps "echo OK"
```

### 7.3 Configurar secrets en GitHub

En el repositorio: **Settings → Secrets and variables → Actions → Repository secrets**:

| Secret         | Valor                                      |
| -------------- | ------------------------------------------ |
| `VPS_HOST`     | IP o hostname del VPS                      |
| `VPS_USER`     | Usuario SSH con acceso al VPS              |
| `VPS_SSH_KEY`  | Contenido completo de `~/.ssh/code_panel_deploy` (la llave privada) |

### 7.4 Verificar el pipeline

Haz un push con un tag `v*`:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Esto dispara:
1. **CI** (`cicd_docker.yml`) → build multi‑arch + push a `ghcr.io`
2. **CD** (`cd_deploy_on_vps.yml`) → SSH al VPS → `docker compose pull && up -d` → prune

Los logs aparecen en la pestaña **Actions** del repositorio.

---

## 8. Actualización manual (sin CI/CD)

Si alguna vez necesitas actualizar sin pasar por GitHub Actions:

```bash
cd /opt/code-panel-back

# Opción A: usando imágenes pre‑built (recomendado)
docker compose -f compose.prod.yaml pull backend
docker compose -f compose.prod.yaml up -d backend

# Opción B: reconstruyendo localmente
docker compose -f compose.prod.yaml up -d --build backend

# Verificar que arrancó
docker compose -f compose.prod.yaml logs --tail=50 backend
```

---

## 9. Mantenimiento y troubleshooting

### Logs

```bash
# Todos los servicios
docker compose -f compose.prod.yaml logs -f

# Solo el backend
docker compose -f compose.prod.yaml logs -f backend

# Últimas 100 líneas
docker compose -f compose.prod.yaml logs --tail=100 backend
```

### Reiniciar servicios

```bash
# Reiniciar solo el backend (sin tirar la BD)
docker compose -f compose.prod.yaml restart backend

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
docker compose -f compose.prod.yaml exec db pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup comprimido
docker compose -f compose.prod.yaml exec db pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restaurar backup

```bash
# Restaurar desde archivo .sql
cat backup.sql | docker compose -f compose.prod.yaml exec -T db psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}

# Restaurar desde archivo comprimido
gunzip -c backup.sql.gz | docker compose -f compose.prod.yaml exec -T db psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}
```

### Programar backups automáticos (cron)

```bash
# Agregar al crontab del host (diario a las 3 AM)
crontab -e

# Agregar esta línea:
0 3 * * * docker compose -f /opt/code-panel-back/compose.prod.yaml exec -T db pg_dump -U code_panel code_panel | gzip > /opt/code-panel-back/backups/backup_$(date +\%Y\%m\%d).sql.gz
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
docker compose -f compose.prod.yaml exec backend ls -la /var/run/docker.sock
```

### El backend no levanta porque la BD no está lista

El `depends_on` con `condition: service_healthy` resuelve esto. Si aún falla, verifica que PostgreSQL haya terminado de inicializar:

```bash
docker compose -f compose.prod.yaml logs db
```

---

## 10. Migración a otro servidor

El backend es agnóstico a la plataforma. Migrar es:

```bash
# En el servidor viejo: backup de la BD
cd /opt/code-panel-back
docker compose -f compose.prod.yaml exec -T db pg_dump -U code_panel code_panel | gzip > backup.sql.gz

# Copiar backup y archivos al nuevo servidor
scp backup.sql.gz usuario@nuevo-vps:/opt/code-panel-back/
scp .env usuario@nuevo-vps:/opt/code-panel-back/
scp compose.prod.yaml usuario@nuevo-vps:/opt/code-panel-back/

# En el servidor nuevo
cd /opt/code-panel-back
docker compose -f compose.prod.yaml up -d
gunzip -c backup.sql.gz | docker compose -f compose.prod.yaml exec -T db psql -U code_panel -d code_panel
docker compose -f compose.prod.yaml restart backend
```

---

## 11. Seguridad básica del host

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

## 12. Resumen: checklist de primer despliegue

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
