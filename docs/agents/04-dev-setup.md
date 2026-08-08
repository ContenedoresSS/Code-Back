# Development Setup

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
