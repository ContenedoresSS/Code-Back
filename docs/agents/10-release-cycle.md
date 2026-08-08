# Release & Deploy Cycle

> **El deploy no es automático al mergear a `main`.** Lo dispara el **líder del proyecto** creando un tag versionado. Un agente nunca inicia un release por iniciativa propia.
>
> Esta sección es el procedimiento normativo. El contexto operativo del servidor (primer despliegue, reverse proxy, backups, troubleshooting) está en `docs/agents/DEPLOY.md`.

## 1. El ciclo completo

```
┌─ Paso 1 ── main actualizado + verificaciones previas          §2
├─ Paso 2 ── Calcular la nueva versión (SemVer)                 §3
├─ Paso 3 ── Actualizar CHANGELOG.md                            §4
├─ Paso 4 ── Commit y push del CHANGELOG a main                 §5
│               ⏸  APROBACIÓN DEL LÍDER
├─ Paso 5 ── Crear el tag anotado y pushearlo  ← dispara el deploy   §6
└─ Paso 6 ── Verificar que el pipeline y la app quedaron sanos   §7
```

## 2. Paso 1 — `main` actualizado y verificaciones previas

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
- [ ] **¿Hay migraciones de Prisma nuevas desde la última tag?** El pipeline **no** las aplica (§7)
- [ ] No hay trabajo a medio mergear que debería entrar en esta versión

## 3. Paso 2 — Calcular la nueva versión (SemVer)

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

## 4. Paso 3 — Actualizar el CHANGELOG

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

- **En inglés**, igual que los mensajes de commit.
- Orientado al **valor para el usuario**, no un volcado de commits. `Image URL field for subjects to display cover images in frontend` sirve; `fix stuff` no.
- Una línea por cambio, sin punto final, empezando con sustantivo o verbo en tercera persona.
- Sin la versión en `[Unreleased]` no hay release: si esa sección está vacía, o no hay nada que publicar, o alguien olvidó documentar sus cambios (§8).

## 5. Paso 4 — Commit y push del CHANGELOG · ⏸ APROBACIÓN

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for v0.0.20-alpha"
git push origin main
```

- Este commit **va directo a `main`** y es la **única excepción documentada** a la prohibición de trabajar sobre `main` (AGENTS.md §15.16), porque el release ocurre en `main` por definición.
- Sigue siendo obligatoria la aprobación del líder antes de ejecutarlo.
- El mensaje va **en inglés** y en Conventional Commits, siguiendo el precedente del repositorio: `docs: update CHANGELOG for <versión>`.

## 6. Paso 5 — Crear el tag anotado y pushearlo

```bash
git tag -a v0.0.20-alpha -m "v0.0.20-alpha" -m "Added: agent workflow protocol with mandatory TDD" -m "Fixed: VPS deploy rollback"
git push origin v0.0.20-alpha
```

- **El tag se crea anotado (`-a`) y con comentario.** Los tags históricos del repositorio son *lightweight* (sin mensaje propio, heredan el asunto del commit); a partir de ahora se anotan para que la versión lleve su propia descripción.
- El mensaje del tag va **en inglés** y refleja el CHANGELOG de esa versión. Varios `-m` encadenados producen párrafos y funcionan igual en PowerShell y en bash.
- **Push del tag específico, nunca `git push --tags`**, para no publicar tags locales de prueba.
- El tag apunta al commit del CHANGELOG, así que ese commit debe estar pusheado antes (§5).

> ⚠️ **El push del tag es lo que dispara el deploy a producción.** Requiere orden explícita del líder en el mensaje actual. Un agente **nunca** ejecuta este comando por iniciativa propia, ni siquiera si ya preparó todo lo demás.

## 7. Paso 6 — Qué hace GitHub y qué hay que verificar

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

> ⚠️ **El pipeline NO aplica migraciones de Prisma.** El contenedor arranca con `node dist/app.js` (ver `Dockerfile`), sin paso de `migrate deploy`. Si el release incluye migraciones, hay que aplicarlas manualmente en el VPS antes o después del deploy según el caso — procedimiento en `docs/agents/DEPLOY.md` §5.5. Un release con migraciones **sin aplicar** deja la app corriendo contra un esquema viejo.

> ⚠️ **El rollback automático NO funciona** — ver `docs/agents/DEBT.md` **DEBT‑30**. La imagen `:previous` nunca se crea porque el allowlist de `sudo` del usuario `deployer` deniega `docker inspect` y `docker tag` con argumentos, y el error se silencia. Si el healthcheck falla, **la aplicación queda caída** aunque el Deployment de GitHub reporte *"rolled back to previous version"*. Ante un healthcheck rojo, asumir que **no** hubo reversión y actuar manualmente (§8).

## 8. Si el deploy falla

1. **No publicar otra tag a la carrera.** Primero entender qué falló.
2. Revisar, en orden: el log del job que falló, y luego los logs del contenedor en el VPS (`docs/agents/DEPLOY.md` §10).
3. **Asumir que no hubo rollback** (DEBT‑30) y verificar el estado real de la app con `/api/health`.
4. **Reversión manual**: re-desplegar la imagen de la versión anterior por su tag inmutable de `ghcr.io` (`:v0.0.19-alpha`), no por `:latest` — procedimiento en `docs/agents/DEPLOY.md` §9.
5. Si la versión quedó inservible, dejarlo anotado en el CHANGELOG al publicar la corrección.

**La reversión de producción la ejecuta el líder.** Un agente puede diagnosticar, leer logs y redactar los comandos, pero no se conecta al VPS ni ejecuta el rollback.

## 9. Rol del agente en un release

| El agente **sí** puede                                          | El agente **nunca** hace                                   |
| --------------------------------------------------------------- | ---------------------------------------------------------- |
| Listar qué commits entran desde la última tag                   | Decidir que toca hacer un release                          |
| Calcular la versión siguiente y proponerla                      | Saltar MINOR o MAJOR por su cuenta                         |
| Redactar la entrada del CHANGELOG y actualizar los enlaces      | Pushear el tag sin orden explícita                         |
| Redactar el mensaje del tag y del commit                        | Conectarse al VPS o ejecutar el deploy                     |
| Verificar el estado de los runs, el Deployment y `/api/health`  | Crear un GitHub Release o mover un tag existente           |
| Reportar fallos con la salida real de los logs                  | Declarar el deploy exitoso sin haberlo verificado          |

## 10. Estado del CHANGELOG

**El CHANGELOG está alineado con los tags publicados hasta `v0.0.19-alpha`.** Verifica la alineación antes de preparar cualquier release:

```bash
git tag --list --sort=-v:refname | head -1      # última versión publicada
grep -m2 "^## \[" CHANGELOG.md                  # [Unreleased] y la última documentada
```

Ambas deben coincidir. Si no coinciden, hay releases sin documentar y hay que cerrar la brecha antes de publicar la versión siguiente. Aplicar el §4 en cada release es lo que evita que vuelva a abrirse.
