# Code Panel — Backend · Protocolo de Trabajo

> **Esta sección es normativa, no informativa.** Aplica a cualquier agente de IA (Claude Code, Copilot, Cursor, etc.) que vaya a **modificar código** en este repositorio.
>
> La metodología del proyecto es **TDD**: el test se escribe antes de la implementación, siempre. No es una recomendación.
>
> Si una instrucción del usuario contradice esta sección, gana la instrucción del usuario — pero el agente debe **decirlo explícitamente** antes de proceder.
>
> **Documentación de referencia** (leer según la tarea, no todo de golpe):
> - `docs/agents/01-project-overview.md` — Roles, flujo de negocio, restricciones, stack, estructura
> - `docs/agents/02-api-reference.md` — Modelos de BD y tabla de rutas
> - `docs/agents/03-execution-engines.md` — Motor de ejecución y evaluación
> - `docs/agents/04-dev-setup.md` — Setup de desarrollo
> - `docs/agents/05-cicd.md` — CI/CD, compose, infraestructura
> - `docs/agents/06-code-conventions.md` — Convenciones y patrones canónicos
> - `docs/agents/07-git-workflow.md` — Flujo de trabajo con Git
> - `docs/agents/08-playbooks.md` — Procedimientos detallados por tipo de tarea
> - `docs/agents/09-pr-template.md` — Plantilla de comentario de PR
> - `docs/agents/10-release-cycle.md` — Ciclo de release y deploy
> - `docs/agents/DEBT.md` — Deuda técnica conocida
> - `docs/agents/DEPLOY.md` — Guía operativa de despliegue

---

## 1. Reglas no negociables

| #   | Regla                                                                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Nunca se trabaja sobre `main`.** Todo cambio vive en una rama nueva creada desde `main` actualizado. Única excepción: hotfix que el usuario ordene explícitamente en el mensaje actual. |
| 2   | **TDD sin excepciones.** Primero el test que falla, después la implementación. Ninguna línea de implementación se escribe sin un test rojo que la justifique. |
| 3   | **`any` está prohibido.** En código nuevo o modificado, cero `any`. Ver §5 para los reemplazos correctos.                                                    |
| 4   | **Leer antes de escribir.** Nunca modificar un archivo sin haberlo leído completo, ni inventar la firma de una función, un campo de Prisma o una ruta.       |
| 5   | **Imitar el código vecino.** Un cambio que introduce un estilo nuevo es un cambio rechazado, aunque el estilo nuevo sea "mejor".                             |
| 6   | **Tres pausas obligatorias.** El agente se detiene y espera al usuario en: el plan (§6), la implementación revisada (§10) y el commit (§12).        |
| 7   | **Los 4 gates son obligatorios.** Nada avanza a aprobación sin correr §9 y pegar la salida real de cada comando.                                          |
| 8   | **Alcance cerrado.** Se hace lo pedido y nada más. La deuda técnica descubierta se **reporta** (§10) y se anota en `docs/agents/DEBT.md`; no se arregla de paso. |
| 9   | **No inventar resultados.** Si un test falla o un paso se omitió, se reporta tal cual, con la salida del comando.                                            |
| 10  | **Commit en inglés, PR en español.** Ver la tabla de idiomas en §5.                                                                                       |

---

## 2. El pipeline completo

```
┌─ Fase 0 ── main actualizado (fetch + pull --rebase) → crear rama              §3
├─ Fase 1 ── Contexto: leer AGENTS.md + corte vertical del módulo              §4
├─ Fase 2 ── Clasificar el trabajo → elegir playbook                           §5
├─ Fase 3 ── Plan explícito                                                    §6
│               ⏸  PAUSA 1 — el usuario aprueba el plan
├─ Fase 4 ── TDD: RED → GREEN → REFACTOR (ciclos cortos)                       §7
├─ Fase 5 ── Estándares de código: tipado estricto, sin any, archivos chicos    §8
├─ Fase 6 ── Gates: format · typecheck · tests                                 §9
├─ Fase 7 ── Auto-análisis de deuda técnica + reporte                          §10
│               ⏸  PAUSA 2 — el usuario aprueba la implementación
├─ Fase 8 ── Documentación: Swagger / OpenAPI + gate docs:validate             §11
│               ⏸  PAUSA 3 — el usuario aprueba el commit
├─ Fase 9 ── Commit (Conventional Commits, en inglés)                          §12
├─ Fase 10 ─ Push de la rama                                                   §13
└─ Fase 11 ─ Comentario de PR en markdown y español                            §14
```

**La documentación de API se actualiza después de la aprobación de la implementación y antes del commit.** El objetivo es que el frontend nunca tenga un contrato desactualizado: si el código entra al repo, su documentación entra en el mismo commit.

El usuario puede colapsar pausas diciéndolo explícitamente (ej. *"aprobado, documenta y commitea"*). El agente **no** las colapsa por iniciativa propia.

---

## 3. Fase 0 — Punto de partida: `main` actualizado y rama nueva

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

Naming de la rama según `docs/agents/07-git-workflow.md` — el tipo debe coincidir con la clasificación de §5:

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

---

## 4. Fase 1 — Contexto obligatorio antes de escribir código

En este orden, siempre:

1. **Leer este `AGENTS.md` completo.** Es la fuente de verdad del protocolo de trabajo.
2. **Leer los documentos de referencia relevantes a la tarea** desde `docs/agents/`:
   - Si la tarea toca **roles, reglas de negocio o flujo**: `01-project-overview.md`
   - Si la tarea toca **endpoints o modelos**: `02-api-reference.md`
   - Si la tarea toca **ejecución o evaluación**: `03-execution-engines.md`
   - Si la tarea es un **cambio de esquema**: `08-playbooks.md` (playbook C)
   - Si la tarea es un **release**: `10-release-cycle.md`
3. **Localizar el módulo afectado** y leer su corte vertical completo. Para el recurso `X`:
   ```
   src/routes/X.routes.ts
   src/controllers/X.controller.ts
   src/services/X.service.ts
   src/services/interfaces/X.service.interface.ts
   src/validators/X.validators.ts        (si existe)
   src/types/requests/*X*.ts  ·  src/types/responses/*X*.ts
   tests/services/X.service.test.ts
   ```
4. **Leer el módulo de referencia.** `subject` es el corte vertical más completo del repo: úsalo como plantilla cuando no exista un ejemplo más cercano.
5. **Si el cambio toca la BD**, leer `prisma/schema.prisma` antes de asumir cualquier campo o relación.
6. **Si el cambio toca un endpoint**, leer su entrada en `docs/api/openapi.yaml` (paths desde la línea ~49, schemas en `components`).
7. **Revisar `docs/agents/DEBT.md`.** Puede que el problema ya esté documentado, con contexto o una decisión tomada.

> ⚠️ **El `CHANGELOG.md` no debe leerse automáticamente.** Solo se consulta durante el ciclo de release (`docs/agents/10-release-cycle.md`).

---

## 5. Fase 2 — Clasificar el trabajo

| Tipo                 | Señal                                        | Playbook            | Prefijo de commit   |
| -------------------- | -------------------------------------------- | ------------------- | ------------------- |
| **Feature**          | Comportamiento nuevo, endpoint nuevo, campo nuevo | `docs/agents/08-playbooks.md` §A | `feat:` |
| **Bug**              | Comportamiento existente incorrecto          | `docs/agents/08-playbooks.md` §B | `fix:` |
| **Cambio de esquema**| Requiere migración de Prisma                 | `docs/agents/08-playbooks.md` §C | `feat:` / `fix:` |
| **Refactor**         | Reorganizar sin cambiar comportamiento       | `docs/agents/08-playbooks.md` §D | `refactor:` |
| **Tests**            | Solo agregar o corregir tests                | §9 directo          | `test:`             |
| **Docs**             | Solo markdown u OpenAPI                      | §9 (gates 1 y 4)    | `docs:`             |
| **Infra**            | Workflows, Docker, compose                   | **Detenerse** §17   | `ci:` / `build:`    |

---

## 6. Fase 3 — Plan explícito · ⏸ PAUSA 1

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

---

## 7. Fase 4 — TDD: RED → GREEN → REFACTOR

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
- **Pegar la evidencia del rojo** en el reporte de §10. Es la prueba de que se siguió TDD.
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
7. ── REFACTOR ──       limpiar, extraer, revisar tamaño de archivos (§8)
```

**Tests — ubicación y patrones:**

- Espejo de `src/`: `tests/services/`, `tests/middlewares/`, `tests/helpers/`, `tests/validators/`, `tests/integration/`.
- Nombre: `<archivo>.test.ts`. Solo `tests/**/*.test.ts` se ejecuta (`vitest.config.ts:7`).
- **Prisma está mockeado globalmente** en `tests/integration/setup.ts` (cargado como `setupFiles` para *todos* los tests): los tests corren **sin base de datos ni Docker**. Si tu service usa un modelo o método de Prisma que no está en ese mock, **agrégalo ahí**.
- Patrón de mock: `vi.hoisted()` + `vi.mock("../../src/config/prisma.js")` + `vi.clearAllMocks()` en `beforeEach` — ver `tests/services/subject.service.test.ts:1-27`.
- Los tests de integración usan `supertest` contra la app Express.
- Nombres de `describe`/`it` **en inglés**, como el resto de la suite: `it("creates subject with provided data")`.
- **Cobertura mínima de casos por endpoint**: camino feliz · error de validación (Zod) · error de autorización o de pertenencia (`userId`) · recurso no encontrado.

---

## 8. Fase 5 — Estándares de código

### Tipado estricto — `any` está prohibido

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

> **Deuda ya registrada:** el código actual tiene **93 usos de `any`** (57 `catch (error: any)`, 25 `as any`, 13 `: any`). Está documentado en `docs/agents/DEBT.md` como **DEBT‑11 (prioridad Alta)** con su plan de remediación, y su saneamiento es **trabajo futuro y aparte**.
>
> **No se hace una migración masiva de `any` dentro de un cambio funcional** — rompería la regla de alcance cerrado y produciría un diff ilegible. Regla práctica: **las líneas que escribes van sin `any`**; las preexistentes del archivo se dejan como están salvo que el usuario pida explícitamente lo contrario.

### Tamaño de archivos y escalabilidad

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

### Idiomas

| Elemento                                   | Idioma      |
| ------------------------------------------ | ----------- |
| Mensajes de commit                         | **Inglés**  |
| Comentario del PR                          | **Español** |
| Nombres de variables, funciones, archivos  | Inglés      |
| Nombres de tests (`describe` / `it`)       | Inglés      |
| JSDoc y comentarios en código              | Español     |
| Mensajes de error de la API                | Español     |

> **Inconsistencia conocida:** los mensajes de los schemas de Zod están en inglés (`"Name is required"`) mientras los errores de service están en español (`"Materia no encontrada"`). Hasta que se decida un estándar, **seguir el idioma que ya usa el módulo que estás tocando** y no mezclar dentro de un mismo archivo.

### Patrones canónicos y diff limpio

Para los patrones canónicos del repo (imports, services, controllers, errores, status codes, validación, paginación, auth, base64) y reglas de diff limpio, consultar `docs/agents/06-code-conventions.md`.

---

## 9. Fase 6 — Gates de verificación

Se corren **en este orden** y se pega la salida real. Un gate rojo significa que el trabajo **no está listo para aprobación**:

| #   | Gate            | Comando                 | Criterio                                             |
| --- | --------------- | ----------------------- | ---------------------------------------------------- |
| 1   | Formato         | `npm run format:check`  | Sin archivos listados. Si falla: `npm run format`     |
| 2   | Typecheck       | `npm run build`         | Cero errores de `tsc`                                 |
| 3   | Tests           | `npm run test:run`      | Todos verdes, **incluidos los que ya existían**       |
| 4   | Contrato de API | `npm run docs:validate` | Sin errores de Redocly — se corre en la Fase 8 (§11) |

Reglas:

- Los gates 1–3 se corren **antes** de pedir la aprobación de la implementación. El gate 4 se corre **después** de actualizar OpenAPI.
- Estos gates son exactamente lo que valida `ci_pr.yml` (más el build de Docker). Verde en local ⇒ verde en CI.
- **No hay ESLint** en el proyecto: no inventar `npm run lint`.
- Prohibido hacer pasar un gate **debilitando la verificación**: no borrar tests, no `.skip`, no relajar `tsconfig`, no `any` para silenciar a `tsc`, no tocar `vitest.config.ts` para excluir archivos.
- Si un gate falla por algo **preexistente en `main`** y ajeno al cambio: no arreglarlo, reportarlo (§17).

---

## 10. Fase 7 — Auto-análisis de deuda técnica · ⏸ PAUSA 2

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

---

## 11. Fase 8 — Documentación de API (Swagger / OpenAPI)

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
4. `config/swagger.ts` sirve este mismo archivo con swagger-ui, así que no hay un segundo lugar que actualizar. Si el cambio afecta cómo se sirve la documentación (no su contenido), eso es **infra**: detenerse (§17).

---

## 12. Fase 9 — Commit · ⏸ PAUSA 3

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

- **En inglés**, siempre. El comentario del PR va en español (§14); no mezclar.
- Imperativo (`add`, no `added` ni `adds`). Máximo ~72 caracteres en el asunto.
- **El código y su documentación de OpenAPI van en el mismo commit.**
- Un commit por unidad lógica de cambio. No mezclar un fix con un refactor.
- Prohibido `--no-verify`. Si el hook rechaza el mensaje, se corrige el mensaje.
- El hook `pre-commit` (lint-staged) reformatea los archivos staged automáticamente: es esperado, no es un error.

---

## 13. Fase 10 — Push

```bash
git push -u origin <nombre-de-la-rama>
```

- Solo se hace push de **la rama de trabajo**. Nunca `git push origin main`.
- Nunca `--force` ni `--force-with-lease` sin orden explícita del usuario.
- El agente **no crea tags y no despliega**. El deploy lo decide el líder creando un tag (ver `docs/agents/10-release-cycle.md`).

---

## 14. Fase 11 — Comentario del PR

Usar la plantilla de `docs/agents/09-pr-template.md`. En **markdown y en español**. El agente la entrega como texto para que el usuario la pegue; no abre el PR por su cuenta salvo que se le pida.

---

## 15. Playbooks

Los procedimientos detallados por tipo de tarea están en `docs/agents/08-playbooks.md`:

| Playbook | Contenido |
|----------|-----------|
| **A — Feature nueva** | Endpoint o campo nuevo, con TDD completo |
| **B — Bug fix** | Reproducción, diagnóstico de causa raíz, fix mínimo |
| **C — Cambio de esquema** | Migraciones de Prisma, impacto en producción |
| **D — Refactor** | Reorganizar sin cambiar comportamiento, tests como arnés |

Antes de empezar cualquier tarea, consultar el playbook correspondiente. La clasificación inicial está en §5.

---

## 16. Prohibiciones absolutas

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

**Seguridad del sandbox** — son requisitos de seguridad y académicos (`docs/agents/01-project-overview.md` §3), no parámetros ajustables:

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

---

## 17. Cuándo detenerse y preguntar

Detenerse, explicar y esperar respuesta cuando:

1. **Falta una regla de negocio.** Ej.: qué rol puede hacer algo, cómo se recalcula una calificación, si un límite aplica retroactivamente. No inventar reglas pedagógicas.
2. **No se pueden enumerar los casos de prueba** del plan. Significa que el requerimiento no está claro.
3. **El cambio requiere una migración destructiva** (playbook C, paso 7 en `docs/agents/08-playbooks.md`).
4. **El fix correcto rompe el contrato de la API.** El frontend en Moodle consume estos endpoints; un cambio incompatible se coordina, no se decide.
5. **Los gates fallan por algo preexistente en `main`.** Reportar el fallo, no arreglarlo dentro de este cambio.
6. **El alcance real es mayor al pedido.** Reportar el hallazgo, proponer entregarlo aparte.
7. **Cumplir "sin `any`" exigiría refactorizar código preexistente** más allá del cambio.
8. **El árbol de trabajo tiene cambios sin commitear** que no son del agente.
9. **El cambio toca infraestructura, dependencias o cualquier punto de §16.**
10. **Hay dos interpretaciones razonables del pedido** que llevan a implementaciones distintas.

En todos los casos: **avanzar con todo lo que no dependa de la respuesta**, y detenerse solo en la parte bloqueada — dejando claro qué quedó pendiente y por qué.
