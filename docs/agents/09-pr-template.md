# PR Template

En **markdown y en español**, siguiendo esta plantilla exacta. El agente la entrega como texto para que el usuario la pegue; no abre el PR por su cuenta salvo que se le pida.

```markdown
## 📋 Descripción

<Qué resuelve este PR, en 2–4 líneas y en términos de negocio. Por qué era necesario.>

## 🏷️ Tipo de cambio

- [ ] ✨ Feature — funcionalidad nueva
- [ ] 🐛 Fix — corrección de un bug
- [ ] ♻️ Refactor — reorganización sin cambio de comportamiento
- [ ] 🧪 Tests — solo tests
- [ ] 📚 Docs — solo documentación
- [ ] 🗄️ Migración — cambia el esquema de la base de datos

## 🔧 Cambios realizados

### Lógica de negocio
- `src/services/...` — <qué cambió>

### API
- `POST /api/v1/...` — <endpoint nuevo o modificado>

### Base de datos
- <migración y qué modifica · o "Sin cambios">

### Documentación
- `docs/api/openapi.yaml` — <paths y schemas actualizados>

## 🧪 Estrategia de TDD

Se siguió el ciclo RED → GREEN → REFACTOR.

**Tests agregados** (<N> en total):

| Archivo | Caso cubierto |
| ------- | ------------- |
| `tests/services/....test.ts` | <camino feliz> |
| `tests/services/....test.ts` | <error de validación> |
| `tests/services/....test.ts` | <error de autorización> |
| `tests/services/....test.ts` | <recurso no encontrado> |

## ✅ Verificación

| Gate | Comando | Resultado |
| ---- | ------- | --------- |
| Formato | `npm run format:check` | ✅ |
| Typecheck | `npm run build` | ✅ |
| Tests | `npm run test:run` | ✅ <N passed> |
| Contrato de API | `npm run docs:validate` | ✅ / N/A |

## 🔗 Impacto en el frontend

<Endpoints nuevos o modificados y su contrato. Cambios incompatibles, si los hay.
Si no hay impacto: "Ninguno — cambio interno.">

## 🗄️ Migraciones

<Nombre de la migración y qué requiere en producción · o "Ninguna.">

## ⚠️ Deuda técnica

<Lo detectado y no resuelto, con su entrada en docs/agents/DEBT.md · o "Sin hallazgos nuevos.">

## 🔍 Cómo probarlo

1. <Paso concreto y reproducible>
2. <Petición de ejemplo con body si aplica>

## ✔️ Checklist

- [ ] Sin `any` en el código nuevo
- [ ] Todo tipado (parámetros, retornos, bodies)
- [ ] Ningún archivo supera las 400 líneas
- [ ] Tests siguiendo TDD, todos verdes
- [ ] OpenAPI actualizado
- [ ] Commits en Conventional Commits (inglés)
- [ ] Rama actualizada con `main`
```

Reglas de la plantilla:

- Se **borran** las secciones que no aplican, no se dejan vacías.
- Se marca solo la casilla de tipo que corresponde.
- Nunca poner ✅ en un gate que no se corrió: se pone `N/A` con la razón.
