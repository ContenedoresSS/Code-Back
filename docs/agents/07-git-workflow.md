# Git Workflow

## Estrategia de ramas

- **`main`** — rama de producción, siempre desplegable
- **Feature branches** — ramas temporales para desarrollo (`feat/*`, `fix/*`, `refactor/*`, etc.)

## Naming de branches (Conventional Commits)

```
feat/nombre-feature       # Nueva funcionalidad
fix/bug-especifico        # Corrección de error
refactor/modulo-auth      # Refactorización
docs/actualizar-api       # Documentación
test/agregar-tests        # Tests
chore/actualizar-deps     # Mantenimiento
```

## Proceso paso a paso

1. **Crear rama** desde `main` actualizado:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/nueva-feature
   ```

2. **Trabajar** siguiendo las directivas del proyecto (código, tests, formato)

3. **Formatear código** (automático con pre-commit hook):
   ```bash
   npm run format  # Opcional, el hook lo hace automáticamente
   ```

4. **Commits** siguiendo Conventional Commits:
   ```bash
   git commit -m "feat: agregar validación de email"
   git commit -m "fix: corregir rate limiter"
   ```
   El pre-commit hook (`husky` + `lint-staged`) formatea automáticamente solo los archivos staged.
   El hook `commit-msg` valida que el mensaje siga Conventional Commits.

   **Tipos permitidos**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

5. **Push** a la rama:
   ```bash
   git push origin feat/nueva-feature
   ```

5. **Abrir PR** a `main`:
   - El CI se ejecuta automáticamente (ci_pr.yml)
   - Debe pasar: lint, typecheck, tests, docker-build

6. **Review y aprobación**:
   - Se requiere al menos 1 aprobación
   - Atender comentarios del review

7. **Merge** via **rebase** (historial limpio):
   ```bash
   git checkout main
   git pull origin main
   git rebase feat/nueva-feature
   git push origin main
   ```

8. **Deploy** (cuando el líder decida):
   ```bash
   git tag v0.0.17
   git push origin v0.0.17
   ```

## Reglas de merge

- ✅ Solo **rebase** (no merge commits)
- ✅ Requiere **aprobación** de al menos 1 persona
- ✅ CI debe **pasar completamente**
- ✅ Rama debe estar **actualizada** con `main`

## Excepciones

- Cambios de **documentación urgentes** pueden ir directo a `main`
- Hotfixes críticos pueden saltarse el review (pero deben documentarse)

## Protección de rama `main` (recomendado)

Configurar en GitHub Settings → Branches → Branch protection rules:
- ✅ Require pull request before merging
- ✅ Require status checks to pass (ci_pr.yml)
- ✅ Require branch to be up to date before merging
- ✅ Do not allow force pushes
- ✅ Do not allow merge commits (solo rebase/squash)
