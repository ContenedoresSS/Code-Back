# API Reference — Code Panel Backend

## 6. Base de datos — 8 modelos

| Modelo              | Tabla                    | Propósito                                            |
| ------------------- | ------------------------ | ---------------------------------------------------- |
| `Role`              | `roles`                  | God, Student, Teacher                                |
| `InvitationCode`   | `invitation_codes`       | Códigos de invitación de un solo uso                 |
| `User`              | `users`                  | Usuarios (UUID, email, nombre, hash de contraseña)   |
| `ProgrammingLanguage` | `programming_languages` | C++, Python, Node.js, Java con imagen Docker y comando |
| `Subject`           | `subjects`               | Materias creadas por profesores                      |
| `Enrollment`        | `enrollments`            | Relación muchos-a-muchos estudiante‑materia           |
| `Activity`          | `activities`             | Ejercicios de código con starter code y restricciones |
| `TestCase`          | `test_cases`             | Casos de prueba (input/expected output en Base64)    |
| `Submission`        | `submissions`            | Entregas de estudiantes con calificación y snapshots |

---

## 7. API — Rutas bajo `/api/v1`

### Auth
| Método | Ruta                     | Auth     | Descripción               |
| ------ | ------------------------ | -------- | ------------------------- |
| POST   | `/auth/register`         | Ninguna  | Registro (con o sin invitación) |
| POST   | `/auth/login`            | Ninguna  | Login, devuelve token pair |
| POST   | `/auth/refresh`          | Ninguna  | Refresca access token     |

### Invitation (God only)
| Método | Ruta                     | Auth              | Descripción               |
| ------ | ------------------------ | ----------------- | ------------------------- |
| POST   | `/invitation`            | Bearer (God)      | Crear código               |
| GET    | `/invitation`            | Bearer (God)      | Listar códigos             |
| PUT    | `/invitation/:id`        | Bearer (God)      | Actualizar código          |
| DELETE | `/invitation/:id`        | Bearer (God)      | Eliminar código            |

### Execution (público, rate‑limited)
| Método | Ruta                     | Rate Limit | Descripción                     |
| ------ | ------------------------ | ---------- | ------------------------------- |
| POST   | `/execution/run`         | Sí         | Ejecutar código (un solo archivo) |
| POST   | `/execution/run-with-files` | Sí      | Ejecutar con múltiples archivos   |

### Programming Language (God)
| Método | Ruta                                  | Auth         | Descripción             |
| ------ | ------------------------------------- | ------------ | ----------------------- |
| POST   | `/programming-language`               | Bearer (God) | Crear lenguaje           |
| GET    | `/programming-language`               | Bearer (God) | Listar lenguajes         |
| GET    | `/programming-language/:id`           | Bearer (God) | Obtener uno              |
| PUT    | `/programming-language/:id`           | Bearer (God) | Actualizar               |
| DELETE | `/programming-language/:id`           | Bearer (God) | Eliminar                 |

### User
| Método | Ruta                     | Auth         | Descripción               |
| ------ | ------------------------ | ------------ | ------------------------- |
| GET    | `/user/me`               | Bearer       | Perfil del usuario autenticado |
| PATCH  | `/user/me`               | Bearer       | Actualizar perfil         |
| POST   | `/user/change-password`  | Bearer       | Cambiar contraseña        |

### Subject
| Método | Ruta                     | Auth                | Descripción           |
| ------ | ------------------------ | ------------------- | --------------------- |
| POST   | `/subject`               | Bearer (Teacher)    | Crear materia         |
| GET    | `/subject`               | Bearer (Teacher)    | Listar materias       |
| GET    | `/subject/:id`           | Bearer (Teacher)    | Obtener una           |
| PUT    | `/subject/:id`           | Bearer (Teacher)    | Actualizar            |
| DELETE | `/subject/:id`           | Bearer (Teacher)    | Eliminar              |

### Activity (anidado: test‑cases y submissions)
| Método | Ruta                                      | Auth                    | Descripción                  |
| ------ | ----------------------------------------- | ----------------------- | ---------------------------- |
| POST   | `/activity`                               | Bearer (Teacher)        | Crear actividad               |
| GET    | `/activity`                               | Bearer (Teacher)        | Listar actividades            |
| GET    | `/activity/:id`                           | Bearer (Teacher)        | Obtener actividad             |
| PUT    | `/activity/:id`                           | Bearer (Teacher)        | Actualizar actividad          |
| DELETE | `/activity/:id`                           | Bearer (Teacher)        | Eliminar actividad            |
| GET    | `/activity/:id/workspace`                 | Ninguna (público)       | Workspace del estudiante (código inicial + casos públicos) |
| POST   | `/activity/:id/submit`                    | Opcional + rate‑limited | Enviar solución para evaluación |
| GET    | `/activity/:id/test-case`                 | Bearer (Teacher)        | Listar casos de prueba        |
| POST   | `/activity/:id/test-case`                 | Bearer (Teacher)        | Crear caso de prueba          |
| PUT    | `/activity/:id/test-case/:testCaseId`     | Bearer (Teacher)        | Actualizar caso de prueba     |
| DELETE | `/activity/:id/test-case/:testCaseId`     | Bearer (Teacher)        | Eliminar caso de prueba       |
