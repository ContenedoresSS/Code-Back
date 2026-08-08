# Code Conventions

- **Módulos**: ESM (`"type": "module"` en package.json). Imports con extensión `.js`.
- **Formato**: Prettier — 100 chars de ancho, double quotes, semicolons, trailing commas `es5`, 2 espacios de indentación, LF.
- **TypeScript**: strict mode, `NodeNext` module resolution, `verbatimModuleSyntax` (requiere `import type` explícito).
- **Arquitectura**: MVC + Service Layer. Los servicios son clases exportadas como **singletons** (`export default new MiServicio()`). Los controladores son clases con métodos estáticos (también exportados como singleton).
- **Validación**: Zod en dos niveles — variables de entorno en `config/env.config.ts`, y bodies de request con schemas en `src/validators/` aplicados con `validate(schema)` en la definición de la ruta. La adopción es **parcial**: hoy solo `subject` tiene validators; todo módulo nuevo o modificado debe incluirlos.
- **Linting**: **no hay ESLint** en el proyecto. El único chequeo de estilo es Prettier (`format:check`); el typecheck lo da `tsc` vía `npm run build`.
- **Errores**: Se lanzan como `Error` con mensaje descriptivo; no hay manejo centralizado de errores todavía. Los servicios envuelven el error (`throw new Error("Error al crear el curso: ...")`) y re-lanzan sin envolver los errores de negocio reconocibles; el controlador mapea el mensaje a status HTTP (404 si el mensaje contiene "no encontrada", 400 en el resto).

## Patrones canónicos del repo

Verificados contra el código actual. Imitarlos:

| Elemento           | Regla                                                                                | Referencia                       |
| ------------------ | ------------------------------------------------------------------------------------ | -------------------------------- |
| Imports            | ESM con extensión `.js`, incluso en TS                                               | `from "../services/x.service.js"`|
| Service            | `export class XService implements IXService` + `export default new XService()`        | `subject.service.ts:9,141`       |
| Interface          | Un archivo en `services/interfaces/`, métodos con JSDoc **en español**               | `subject.service.interface.ts`   |
| Controller         | Clase con métodos `public async`, `try/catch` por método, `export default new X()`   | `subject.controller.ts:9,106`    |
| Errores en service | Envolver: `throw new Error("Error al <acción>: ...")`; re-lanzar sin envolver los de negocio | `subject.service.ts:81-86`  |
| Errores en controller | Mapear mensaje → status: `"no encontrada"` → 404, resto → 400                     | `subject.controller.ts:57-62`    |
| Status codes       | POST → 201 · GET/PUT → 200 · DELETE → 204 sin body                                   | `subject.controller.ts`          |
| Validación         | Schema Zod en `validators/`, aplicado con `validate(schema)` **en la ruta**           | `subject.routes.ts:14`           |
| Params numéricos   | `parseIdParam()` + chequeo `isNaN` → 400                                             | `subject.controller.ts:48-53`    |
| Paginación         | `getPaginationParams(req)` → `{skip, take}`; devolver `PaginationData<T>`             | `subject.service.ts:26-65`       |
| Auth en rutas      | `router.use(authenticate)` al inicio; `rbac([UserRole.X])` por ruta                  | `subject.routes.ts:11-21`        |
| Base64             | Input/output de test cases y código viaja en Base64                                  | `helpers/base64-validator.helper.ts` |
| Formato            | Prettier: 100 cols, double quotes, semicolons, 2 espacios, LF                        | `.prettierrc`                    |

## Idiomas

| Elemento                                   | Idioma      |
| ------------------------------------------ | ----------- |
| Mensajes de commit                         | **Inglés**  |
| Comentario del PR                          | **Español** |
| Nombres de variables, funciones, archivos  | Inglés      |
| Nombres de tests (`describe` / `it`)       | Inglés      |
| JSDoc y comentarios en código              | Español     |
| Mensajes de error de la API                | Español     |

> **Inconsistencia conocida:** los mensajes de los schemas de Zod están en inglés (`"Name is required"`) mientras los errores de service están en español (`"Materia no encontrada"`). Hasta que se decida un estándar, **seguir el idioma que ya usa el módulo que estás tocando** y no mezclar dentro de un mismo archivo.

## Diff limpio

- No reformatear código ajeno al cambio. El diff debe contener solo líneas relevantes.
- No renombrar archivos, variables o rutas "de paso".
- No dejar `console.log`, código comentado ni `TODO` sin dueño.
- Comentar solo donde el *por qué* no sea obvio. El repo comenta poco; el código nuevo también.
