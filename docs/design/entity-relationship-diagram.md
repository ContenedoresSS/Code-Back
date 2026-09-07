# Entity-Relationship Diagram

## Metadata

| Field                 | Value                                            |
| --------------------- | ------------------------------------------------ |
| **Document**          | Entity-Relationship Diagram (ERD)                |
| **Author**            | Code Panel — Development Team                    |
| **Reviewer**          | Carlos Coronado                                  |
| **Last review**       | 2026-09-06                                       |
| **Status**            | Pending review                                   |
| **Source**            | `prisma/schema.prisma`                           |
| **Database**          | PostgreSQL                                       |

## Diagram

```mermaid
erDiagram
    APP_SETTINGS {
        string key PK
        json  value
        datetime updatedAt
    }

    ROLES {
        int    id PK
        string name UK
    }

    INVITATION_CODES {
        int      id PK
        string   code UK
        int      role_id FK
        boolean  is_used
        datetime created_at
    }

    USERS {
        string   id PK
        string   email UK
        string   password_hash
        string   name
        string   last_name
        string   identifier UK
        int      role_id FK
        boolean  is_active
        string   reset_token_hash
        datetime reset_token_expires
        datetime created_at
    }

    PROGRAMMING_LANGUAGES {
        int    id PK
        string name
        string editor_identifier
        string version
        string docker_image
        string execution_command
        string file_extension
    }

    SUBJECTS {
        int    id PK
        string user_id FK
        string name
        string image_url
    }

    ENROLLMENTS {
        string   id PK
        string   student_id FK
        int      subject_id FK
        datetime created_at
    }

    ACTIVITIES {
        string   id PK
        string   professor_id FK
        int      language_id FK
        int      subject_id FK
        string   title
        string   description
        json     starter_code
        int      max_attempts
        json     rules
        datetime created_at
    }

    TEST_CASES {
        int      id PK
        string   activity_id FK
        string   input
        string   expected_output
        boolean  is_hidden
    }

    SUBMISSIONS {
        string   id PK
        string   student_id FK
        string   activity_id FK
        int      language_id FK
        json     code_snapshot
        decimal  final_grade
        int      passed_tests
        int      total_tests
        int      execution_time_ms
        string   status
        string   compiler_output
        datetime submitted_at
    }

    ROLES ||--o{ INVITATION_CODES : "has"
    ROLES ||--o{ USERS : "assigns"

    USERS ||--o{ SUBJECTS : "professor of"
    USERS ||--o{ ACTIVITIES : "professor creates"
    USERS ||--o{ ENROLLMENTS : "student enrolls"
    USERS ||--o{ SUBMISSIONS : "student submits"

    SUBJECTS ||--o{ ACTIVITIES : "contains"
    SUBJECTS ||--o{ ENROLLMENTS : "receives enrollments"

    PROGRAMMING_LANGUAGES ||--o{ ACTIVITIES : "used in"
    PROGRAMMING_LANGUAGES ||--o{ SUBMISSIONS : "executed with"

    ACTIVITIES ||--o{ TEST_CASES : "evaluates with"
    ACTIVITIES ||--o{ SUBMISSIONS : "receives"
```

## Notes

- `app_settings` is a standalone entity (global configuration) with no relationships.
- `users` participates in two roles: **professor** (relationship with `subjects` and `activities`) and **student** (relationship with `enrollments` and `submissions`).
- `enrollments` and `submissions` cascade on delete when the related user or activity is removed (`onDelete: Cascade` in the schema).
- `programming_languages` has a composite unique key on `(name, version)`.