# Playbooks

## A — Endpoint / feature nueva

1. Fase 0 — `main` actualizado y rama `feat/...` (AGENTS.md §3)
2. Contexto y plan con la lista de tests (AGENTS.md §4, §6) → **⏸ aprobación**
3. `prisma/schema.prisma` si requiere modelo o campo nuevo → **playbook C**
4. Modelos y tipos: `src/types/enums/`, `src/types/requests/`, `src/types/responses/`
5. Validaciones: `src/validators/<recurso>.validators.ts`
6. Contrato: `src/services/interfaces/<recurso>.service.interface.ts` (JSDoc en español)
7. **Ciclo TDD por caso** (AGENTS.md §7): RED en `tests/services/` → GREEN en `src/services/`
8. **Ciclo TDD** para el controller y la ruta: `src/controllers/` → `src/routes/<recurso>.routes.ts` con `authenticate` → `rbac` → `validate`
9. Registrar el router en `src/routes/index-v1.routes.ts` — **omitir esto es el error más común**
10. Si el service usa modelos de Prisma nuevos → agregarlos al mock de `tests/integration/setup.ts`
11. Gates 1–3 (AGENTS.md §9) + auto-análisis (AGENTS.md §10) → **⏸ aprobación**
12. `docs/api/openapi.yaml` + gate 4 (AGENTS.md §11)
13. Commit en inglés → **⏸ aprobación** → push → comentario de PR (ver `docs/agents/09-pr-template.md`)

Antes de empezar, confirmar en el plan: **¿qué roles pueden llamarlo?** (ver `docs/agents/01-project-overview.md` §1) y **¿lleva rate limit?** (ver `docs/agents/01-project-overview.md` §3).

## B — Bug fix

El TDD para bugs es el mismo ciclo; el RED es la **reproducción**:

1. Fase 0 — rama `fix/...`
2. **RED: escribir el test que reproduce el bug y verlo fallar.** Sin test rojo previo no hay fix: es la única prueba de que el bug existía y de que el arreglo sirve. Pegar la salida del rojo en el reporte.
3. **Diagnosticar la causa raíz, no el síntoma.** Identificar la capa correcta y arreglar ahí: un bug de reglas de negocio se arregla en el service, no parcheando el controller.
4. **GREEN: el fix mínimo** que vuelve verde el test.
5. `npm run test:run` completo para descartar regresiones.
6. **REFACTOR** si el fix dejó el código peor de como estaba.
7. Gates + auto-análisis → aprobación → docs si cambió el contrato → commit `fix:` → push → PR.
8. Si el bug revela un problema de diseño mayor, anotarlo en `docs/agents/DEBT.md` y **no** expandir el fix.

## C — Cambio de esquema (Prisma)

1. Editar `prisma/schema.prisma`.
2. `npm run db:migrate` — genera la migración y la aplica en la BD local.
3. **Commitear la carpeta de migración generada** (`prisma/migrations/<timestamp>_<nombre>/`). Una migración sin versionar rompe el deploy.
4. Actualizar los tipos de `src/types/` afectados y el mock de `tests/integration/setup.ts`.
5. Tests siguiendo TDD para el comportamiento nuevo.
6. Gates.
7. **Reportar el impacto en producción**: el contenedor necesita que la migración se aplique. Si el cambio es **destructivo** (borrar columna o tabla, cambiar tipo, agregar columna `NOT NULL` sin default), **detenerse y avisar antes de generarla** (AGENTS.md §17).

**Prohibido**: `prisma migrate reset`, `prisma db push` y editar a mano una migración ya aplicada.

## D — Refactor

1. Confirmar que hay tests que cubren el comportamiento actual. Si no hay, **escribirlos primero** — ese es el arnés que prueba que el refactor no cambió nada.
2. Refactorizar sin tocar comportamiento observable ni el contrato de la API.
3. Los tests deben pasar **sin modificarse**. Si hubo que cambiar un test, ya no es un refactor: es un cambio de comportamiento → re-aprobar el plan.
4. Gates + auto-análisis → aprobación → commit `refactor:` → push → PR.
