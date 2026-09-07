# Architecture Diagram

## Metadata

| Field           | Value                                                                          |
| --------------- | ------------------------------------------------------------------------------ |
| **Document**    | Architecture Diagram (deployment)                                              |
| **Author**      | Code Panel — Development Team                                                  |
| **Reviewer**    | Carlos Coronado                                                                |
| **Last review** | 2026-09-06                                                                     |
| **Status**      | Pending review                                                                 |
| **Source**      | `docs/agents/DEPLOY.md`, `compose.prod.yaml`, current production topology      |
| **Technology**  | Mermaid `architecture-beta`                                                    |

## Diagram

> **Rendering note:** this diagram uses the experimental `architecture-beta` syntax. VS Code's preview does not render it (shows a parse/render error). Open it in [mermaid.live](https://mermaid.live) to view it correctly.

```mermaid
architecture-beta
    group cloudflare(cloud)[Cloudflare]
        service frontend_pages(internet)[Frontend - Cloudflare Pages] in cloudflare

    group vps(server)[VPS - Production Host]
        service nginx(internet)[Reverse Proxy and SSL] in vps
        service backend(server)[Code Panel - Backend API] in vps
        service postgres(database)[PostgreSQL] in vps
        service docker_engine(disk)[Docker Engine - Execution Sandbox] in vps

    group external(cloud)[External Systems]
        service uady(cloud)[UADY Virtual - Moodle] in external
        service mail(internet)[Mail Provider - Resend or SMTP] in external

    service users(internet)[Users - Professors and Students]

    users:R --> L:frontend_pages
    frontend_pages:R --> L:nginx
    nginx:R --> L:backend
    backend:R --> L:postgres
    backend:B --> T:docker_engine
    backend:R --> L:mail
    backend:R --> L:uady
```

## Notes

- **Current deployment:** the **frontend runs on Cloudflare Pages** and the **backend on a VPS** inside Docker Compose (`compose.prod.yaml`), exactly as documented in `docs/agents/DEPLOY.md`.
- The frontend reaches the backend over **HTTPS with CORS**; the backend sits **behind a reverse proxy** (SSL), and **PostgreSQL is not exposed** — it lives on the internal Docker network.
- The **Docker Engine** provides the execution sandbox for running untrusted student code (bind mount of `/var/run/docker.sock`).
- The system is **deployment-agnostic**; this topology is the one in production today, and can be moved to other providers with minimal changes.