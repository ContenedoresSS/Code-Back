# Code Panel — Backend · Protocolo de Trabajo Optimizado

> **ESTA SECCIÓN ES NORMATIVA Y ESTÁ OPTIMIZADA PARA AHORRO DE TOKENS.**
> Aplica a cualquier agente de IA que modifique código en este repositorio.
>
> **REGLA DE ORO DE CONTEXTO:** EL USUARIO ADMINISTRA EL CONTEXTO. Si una instrucción del usuario limita los archivos a leer, OBEDECE INMEDIATAMENTE. No leas archivos, carpetas, esquemas ni documentos que no te hayan pedido explícitamente.

---

## 1. Reglas no negociables

| #   | Regla                                                                                                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **TDD sin excepciones.** Primero el test que falla, después la implementación.                                                                             |
| 2   | **`any` está prohibido.** En código nuevo o modificado, cero `any`.                                                                                        |
| 3   | **Carga perezosa de contexto.** Prohibido leer todo un módulo (controller + service + routes + tests) a menos que la tarea exija modificar todos ellos.    |
| 4   | **Delegación de Gates a Husky.** El agente NUNCA ejecuta validaciones globales (`build`, `format`, `test:run`). El usuario lo hará manualmente.            |
| 5   | **Tres pausas obligatorias.** El agente se detiene y espera al usuario en: el plan (§4), la implementación revisada (§7) y el commit (§9).                 |
| 6   | **Alcance cerrado.** Se hace lo pedido y nada más. La deuda técnica descubierta se reporta, no se arregla por iniciativa propia ni se leen archivos extra. |

---

## 2. El pipeline simplificado

Asume que el entorno y la rama de Git ya están preparados por el usuario.

    ├─ Fase 1 ── Lazy Context: leer estrictamente lo necesario                     §3
    ├─ Fase 2 ── Clasificar el trabajo y elegir playbook                           §4
    ├─ Fase 3 ── Plan explícito                                                    §4
    │               ⏸  PAUSA 1 — el usuario aprueba el plan
    ├─ Fase 4 ── TDD Local: RED → GREEN → REFACTOR (Solo test específico)          §5
    ├─ Fase 5 ── Estándares de código: tipado estricto, sin any                    §6
    ├─ Fase 6 ── Auto-análisis y reporte (Sin gates globales)                      §7
    │               ⏸  PAUSA 2 — el usuario aprueba la implementación
    ├─ Fase 7 ── OpenAPI (Solo si aplica)                                          §8
    ├─ Fase 8 ── Commit (Mensaje)                                                  §9
    │               ⏸  PAUSA 3 — el usuario aprueba, corre Husky y hace push

---

## 3. Fase 1 — Contexto Bajo Demanda (Lazy Context)

**PROHIBICIONES ABSOLUTAS DE LECTURA (Para proteger la cuota de tokens):**

- NO leas `prisma/schema.prisma` completo. Haz grep o lee solo la definición del modelo específico que vas a tocar.
- NO leas `docs/api/openapi.yaml` completo. Búscalo solo si vas a documentar en la Fase 7.
- NO listes ni leas directorios completos de controllers o routers "para entender".

**Índice de Documentación (`docs/agents/`):**
_Conoce qué recursos existen, pero NO los leas a menos que tu tarea dependa directamente de ellos o el usuario te lo exija._

- `01-project-overview.md` (Arquitectura, reglas de negocio, stack)
- `02-api-reference.md` (Rutas y modelos de BD)
- `03-execution-engines.md` (Motor de ejecución)
- `04-dev-setup.md` (Configuración local)
- `05-cicd.md` (Infraestructura y contenedores)
- `06-code-conventions.md` (Estilos y patrones)
- `07-git-workflow.md` (Flujo de ramas)
- `08-playbooks.md` (Guías paso a paso)
- `09-pr-template.md` (Plantilla de PR)
- `10-release-cycle.md` (Ciclo de despliegue)
- `DEBT.md` (Deuda técnica conocida)
- `DEPLOY.md` (Guía operativa)

**Lo que SÍ debes hacer para iniciar:**

1. Lee **solo** los archivos mencionados en el prompt del usuario.
2. Si el usuario no especificó archivos, deduce el entrypoint y ábrelo.
3. Abre las interfaces o validadores dependientes **solo** cuando la implementación te lo exija.

---

## 4. Fase 2 y 3 — Clasificación y Plan · ⏸ PAUSA 1

Clasifica el cambio y presenta un plan conciso antes de escribir código. **Espera aprobación**.

    Objetivo:        <qué cambia>
    Archivos clave:  <los 1-3 archivos que vas a tocar>
    Plan de TDD:     <lista de 2-3 tests clave a escribir primero>
    Fuera de alcance:<lo que NO vas a tocar para evitar dispersión>

---

## 5. Fase 4 — TDD Aislado: RED → GREEN → REFACTOR

**REGLA ESTRICTA DE TERMINAL:** Para evitar fuga masiva de tokens, **NUNCA corras la suite de pruebas completa** (`npm run test:run`).

1. **RED:** Escribe UN test y ejecútalo AISLADO (ej. `npm run test -- ruta/al/archivo.test.ts`). Obtén la salida roja.
2. **GREEN:** Escribe el código mínimo para pasarlo. Vuelve a correr SOLO ese archivo.
3. **REFACTOR:** Limpia sin romper el verde.

_Si necesitas mockear Prisma, hazlo en `tests/integration/setup.ts`._

---

## 6. Fase 5 — Estándares de código

- **Cero `any`:** Usa `unknown` + estrechamiento, o interfaces estrictas.
- **Errores:** `catch (error: unknown)` siempre.
- **Tamaño:** Si un archivo pasa de 300 líneas, sugiere extraer lógica a `src/helpers/`.
- **Idioma:** Código y commits en inglés. PRs, comentarios y errores de API en español.

---

## 7. Fase 6 — Auto-análisis y Reporte · ⏸ PAUSA 2

**NO ejecutes comandos globales (`build`, `format:check` o `test:run`). El usuario se encargará mediante Husky.**

Reporta honestamente:

1. Evidencia visual del TDD (test rojo inicial, verde final SOLO del archivo afectado).
2. Confirmación de "Cero `any` agregados".
3. Reporte de cualquier deuda técnica encontrada.

**Espera aprobación antes de tocar la documentación.**

---

## 8. Fase 7 — OpenAPI (Solo si aplica)

Si modificaste rutas, payloads o respuestas:

- Abre `docs/api/openapi.yaml` (usa búsqueda, no leas todo).
- Actualiza o añade el endpoint.
- **Tampoco corras `docs:validate`**, el usuario lo revisará.

---

## 9. Fase 8 — Commit · ⏸ PAUSA 3

Presenta el mensaje del commit en inglés usando Conventional Commits (`feat(auth): add strategy pattern for emails`) y **espera confirmación**. El usuario lo copiará, hará el commit (disparando Husky) y hará push.

---

## 10. Prohibiciones Críticas (Seguridad, Infra y Tokens)

NUNCA, bajo ningún motivo:

- Ejecutar comandos que generen logs masivos (`npm run test:run`, `npm run build`, migraciones de Prisma automatizadas).
- Modificar `.env` reales, `Dockerfile`, `workflows` o `compose.yaml`.
- Relajar límites de seguridad (`userId`, `RBAC`, sandbox de evaluación).
