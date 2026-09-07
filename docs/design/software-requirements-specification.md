# Software Requirements Specification (SRS)

## Metadata

| Field           | Value                                                                          |
| --------------- | ------------------------------------------------------------------------------ |
| **Document**    | Software Requirements Specification                                            |
| **Author**      | Code Panel — Development Team                                                  |
| **Reviewer**    | Carlos Coronado                                                                |
| **Last review** | 2026-09-06                                                                     |
| **Status**      | Pending review                                                                 |
| **Source**      | `prisma/schema.prisma`, `docs/api/openapi.yaml`, `docs/agents/` (overview, API reference, DEPLOY) |
| **Related docs**| `entity-relationship-diagram.md`, `use-case-diagram.md`, activity diagrams, `architecture-diagram.md` |

---

## 1. Introduction

### 1.1 Purpose

This document specifies the software requirements for **Code Panel**, a remote code execution and automatic grading platform for the **Universidad Autónoma de Yucatán (UADY)**, developed as a social service project. It integrates with the institution's LMS (Moodle) by embedding a code editor through an **`<iframe>`** in course activities.

### 1.2 Scope

The system allows:

- **Teachers** to create subjects, code activities, editor rules and test cases, and to review student submissions and grades.
- **Students** to enroll in subjects, write and run code in an embedded editor, and submit solutions that are automatically graded.
- **Administrators (God)** to manage invitation codes, users, programming languages and application settings.

### 1.3 Definitions, acronyms and abbreviations

| Term        | Meaning                                                        |
| ----------- | -------------------------------------------------------------- |
| **SRS**     | Software Requirements Specification                            |
| **LTI**     | Learning Tools Interoperability (IMS standard)                 |
| **LMS**     | Learning Management System (Moodle / UADY Virtual)             |
| **iframe**  | HTML inline frame used to embed the editor inside Moodle       |
| **RBAC**    | Role-Based Access Control                                      |
| **JWT**     | JSON Web Token (access / refresh)                              |

### 1.4 Integration note (LTI)

Originally, the platform was planned to integrate with Moodle through the **LTI protocol**. **LTI is deferred to a future version.** The current integration embeds the code editor via an **`<iframe>`** in Moodle activities, and grades are consulted inside the application (there is no automatic grade sync with the LMS yet).

---

## 2. Overall Description

### 2.1 Product perspective

Code Panel is a client-server web system:

- **Frontend** (separate repository): React + TypeScript admin panel and code editor (Monaco), embeddable via iframe in Moodle.
- **Backend** (this repository): REST API (`/api/v1`) built with Node.js/Express, TypeScript, Prisma ORM and PostgreSQL.
- **Execution engine**: Docker-based sandbox that runs untrusted student code in isolated containers.

Deployment is **provider-agnostic** (only requires Docker). The current production topology is documented in `architecture-diagram.md`.

### 2.2 Users and roles

| Role      | How they enter                    | Main capabilities                                            |
| --------- | --------------------------------- | ------------------------------------------------------------ |
| **God**   | Account created directly          | Manage invitations, users, programming languages, app settings; bypasses RBAC |
| **Teacher** | Registration with an invitation code | Create subjects, activities, test cases; review submissions and grades |
| **Student** | Free registration (email)         | Enroll in subjects, run code, submit solutions               |
| **Guest** | No session (anonymous)            | Register, login, run code, view public workspace, submit (optional auth) |

> Guests (users without a session) are treated as actors even though they are not a database role.

### 2.3 Assumptions and dependencies

- Moodle (UADY Virtual) can embed arbitrary HTML/iframe content.
- The host exposes the Docker socket to the backend container for sandboxing.
- A PostgreSQL instance (15+) is reachable by the backend.
- Email delivery is available via an SMTP provider or Resend.

---

## 3. Functional Requirements

Requirements are grouped by module. Each has a unique identifier (`FR-xxx`) and an acceptance criterion.

### 3.1 Authentication (Auth)

| ID       | Requirement | Acceptance criterion |
| -------- | ----------- | -------------------- |
| **FR-001** | The system shall allow registration with or without an invitation code. | A teacher registers with a valid unused invitation code; a student registers freely with an email. |
| **FR-002** | The system shall authenticate users with email and password (bcrypt), returning an access/refresh token pair. | Valid credentials produce tokens; invalid credentials return 401. |
| **FR-003** | The system shall refresh an expired access token using a valid refresh token. | A new access token is issued for a valid refresh token. |
| **FR-004** | The system shall support password recovery: request code, verify code, reset password. | A recovery code is sent by email, verified, and the password is updated. |
| **FR-005** | The system shall restrict registration to allowed email domains when configured. | A registration from a disallowed domain is rejected with a clear error. |

### 3.2 Account management

| ID       | Requirement | Acceptance criterion |
| -------- | ----------- | -------------------- |
| **FR-010** | Authenticated users shall view and update their own profile. | `GET/PATCH /user/me` returns/updates the current user's profile. |
| **FR-011** | Authenticated users shall change their own password. | The current password is validated and a new hash is stored. |

### 3.3 Invitations (God only)

| ID       | Requirement | Acceptance criterion |
| -------- | ----------- | -------------------- |
| **FR-020** | God shall create, list, update and delete single-use invitation codes. | CRUD operations are restricted to the God role; codes are single-use. |
| **FR-021** | An invitation code shall be marked as used once consumed. | Reusing a consumed code is rejected. |

### 3.4 Subjects

| ID       | Requirement | Acceptance criterion |
| -------- | ----------- | -------------------- |
| **FR-030** | Teachers shall create, list, view, update and delete subjects. | CRUD operations restricted to Teacher (and God). |
| **FR-031** | Teachers shall list the students enrolled in a subject. | `GET /subject/:id` (or equivalent) returns enrolled students. |
| **FR-032** | Teachers shall duplicate a subject. | Duplication creates a copy of the subject with its data. |

### 3.5 Enrollments

| ID       | Requirement | Acceptance criterion |
| -------- | ----------- | -------------------- |
| **FR-040** | Students shall enroll in and unenroll from a subject. | An enrollment is unique per student-subject pair; unenrolling removes it. |

### 3.6 Activities

| ID       | Requirement | Acceptance criterion |
| -------- | ----------- | -------------------- |
| **FR-050** | Teachers shall create, list, view, update and delete code activities. | An activity has title, description, language, optional starter code, max attempts and rules. |
| **FR-051** | The system shall enforce the maximum number of attempts per activity (`maxAttempts`; 0 = unlimited). | Exceeding the limit returns a pedagogical rejection (403). |
| **FR-052** | The system shall evaluate an activity with the language set at creation when `allowLanguageChange` is false. | The submission is run against `activity.languageId`. |
| **FR-053** | The system shall expose a public workspace with starter code and public test cases (no auth). | `GET /activity/:id/workspace` returns starter code and non-hidden test cases. |

### 3.7 Test cases

| ID       | Requirement | Acceptance criterion |
| -------- | ----------- | -------------------- |
| **FR-060** | Teachers shall create, list, update and delete test cases for an activity. | Each test case has input, expected output and a hidden flag. |
| **FR-061** | Hidden test cases shall not be exposed in the workspace. | The workspace only returns public cases; hidden ones are used for grading. |

### 3.8 Execution engine

| ID       | Requirement | Acceptance criterion |
| -------- | ----------- | -------------------- |
| **FR-070** | The system shall run a single code file for a supported language. | `POST /execution/run` returns stdout/stderr, status and execution time. |
| **FR-071** | The system shall run multiple code files with a configurable entry point. | `POST /execution/run-with-files` accepts files and an entry point. |
| **FR-072** | Each run shall execute in an isolated, ephemeral container. | Containers are destroyed after the run; resource limits are applied. |
| **FR-073** | Execution shall classify results as success, time limit exceeded, runtime error or compile error. | Status maps to `ExecutionStatus`. |

### 3.9 Submission and grading

| ID       | Requirement | Acceptance criterion |
| -------- | ----------- | -------------------- |
| **FR-080** | Students shall submit a solution for evaluation. | `POST /activity/:id/submit` persists a submission and grades it. |
| **FR-081** | The system shall evaluate a submission against the activity's test cases. | Grade and status are computed from public + hidden cases. |
| **FR-082** | Submissions shall have a status (pending, accepted, wrong answer, time limit exceeded, compile error, runtime error). | Status maps to `SubmissionStatus`. |
| **FR-083** | Students shall see their own submission history for an activity. | The workspace/grades view shows past submissions ordered by recency. |
| **FR-084** | The system shall enforce activity editor rules at grading time (see 3.10). | A rule violation returns a pedagogical rejection (403). |

### 3.10 Activity editor rules

| ID       | Requirement | Acceptance criterion |
| -------- | ----------- | -------------------- |
| **FR-090** | Activities shall support configurable editor rules. | Rules: `allowCopy`, `allowPaste`, `allowFileDownload`, `allowCodeEdit`, `allowFileUpload`, `allowLanguageChange`. |
| **FR-091** | Rules enforced in the frontend (copy, paste, download) shall be applied by the editor. | The editor blocks the corresponding actions. |
| **FR-092** | Rules enforced in the backend (code edit, file upload, language change) shall be validated server-side. | The backend rejects submissions that violate the rules. |
| **FR-093** | Unknown activity fields or rules shall be rejected, not silently ignored. | Malformed activity payloads return 400 (strict validation). |

### 3.11 Grades (teacher view)

| ID       | Requirement | Acceptance criterion |
| -------- | ----------- | -------------------- |
| **FR-100** | Teachers shall view grades per activity. | `GET /activity/:id/grades` returns per-student grades and submission history. |
| **FR-101** | Teachers shall view the full detail of a single submission. | `GET /activity/:id/submissions/:submissionId` returns code, results and grade. |

### 3.12 Programming languages (God only)

| ID       | Requirement | Acceptance criterion |
| -------- | ----------- | -------------------- |
| **FR-110** | God shall create, list, view, update and delete programming languages. | A language defines name, version, Docker image, execution command and file extension. |

### 3.13 Application settings (God only)

| ID       | Requirement | Acceptance criterion |
| -------- | ----------- | -------------------- |
| **FR-120** | God shall view and replace the list of allowed registration email domains. | `GET/PUT` on the settings endpoint updates the allowed domains. |

### 3.14 LTI integration (deferred)

| ID       | Requirement | Acceptance criterion |
| -------- | ----------- | -------------------- |
| **FR-130** | *Future* — the system shall integrate with Moodle via the **LTI protocol** (launch, grade passback). | Marked as **future work**; not implemented in the current version. |

---

## 4. Non-Functional Requirements

| ID        | Category        | Requirement | Acceptance criterion |
| --------- | --------------- | ----------- | -------------------- |
| **NFR-001** | Performance     | A single code execution shall time out after a fixed limit. | Runs exceeding the limit (10 s) are killed and reported as time-limit-exceeded. |
| **NFR-002** | Security        | Untrusted code shall run in a sandboxed container. | Limits: memory (128 MB), CPU quota, PID limit, read-only rootfs, network disabled. |
| **NFR-003** | Security        | Passwords shall be stored hashed. | Passwords are hashed with bcrypt; hashes never stored in plain text. |
| **NFR-004** | Security        | API access shall be protected by RBAC. | God bypasses checks; Teacher/Student are restricted to their capabilities. |
| **NFR-005** | Security        | Execution and submission endpoints shall be rate limited. | 2 requests per 5 minutes per IP; the limit protects the host and is an academic requirement. |
| **NFR-006** | Security        | Secrets must not be committed to the repository. | `.env*` files are ignored; configuration comes from environment variables. |
| **NFR-007** | Availability    | The system shall be deployable as Docker containers, agnostic to the platform. | `compose.prod.yaml` brings up backend + database with the Docker socket mounted. |
| **NFR-008** | Availability    | PostgreSQL shall not be exposed to the public internet. | The database only listens on the internal Docker network. |
| **NFR-009** | Maintainability | The codebase shall use strict typing and avoid `any`. | TypeScript strict mode; new code contains no `any`. |
| **NFR-010** | Maintainability | Business logic shall be covered by automated tests. | Unit/integration tests cover services and helpers. |
| **NFR-011** | Concurrency     | Concurrent executions shall be limited. | A concurrency limiter queues runs beyond the configured maximum. |

---

## 5. External Interface Requirements

- **REST API** under `/api/v1`, JSON payloads, documented in `docs/api/openapi.yaml` and served via Swagger UI.
- **CORS** configured to allow the frontend origins.
- **Moodle integration**: the frontend is embedded in Moodle activities via an `<iframe>` (no LTI in the current version).
- **Docker socket** bind mount for the execution sandbox.
- **Email** via SMTP or Resend (strategy factory) for invitations and password recovery.

---

## 6. Data Requirements

The system persists the following entities (full detail in `entity-relationship-diagram.md`):

- `Role`, `InvitationCode`, `User`
- `ProgrammingLanguage`
- `Subject`, `Enrollment`
- `Activity`, `TestCase`
- `Submission`
- `AppSetting`

Key integrity rules: single-use invitation codes, unique student–subject enrollments, cascading deletes for enrollments/submissions, composite unique key on `(name, version)` for languages.

---

## 7. Future Work / Deferred

The following were originally planned and are **deferred to future versions**:

1. **LTI integration with Moodle** — automatic launch and grade passback (FR-130).
2. **Grades export to CSV/Excel** — grades are currently only consultable in the application (`GET /activity/{id}/grades`); the legacy diagrams described a CSV export/import flow that was not implemented.

---

## 8. Traceability (Requirements ↔ Use Cases)

| Requirement            | Use case(s)                                      |
| ---------------------- | ------------------------------------------------ |
| FR-001 – FR-005        | Register, Login, Refresh token, Forgot password, Reset password |
| FR-010 – FR-011        | Manage own profile, Change password              |
| FR-020 – FR-021        | Manage invitations                               |
| FR-030 – FR-032        | Manage subjects                                  |
| FR-040                 | Enroll in subject                                |
| FR-050 – FR-053        | Manage activities, View activity workspace       |
| FR-060 – FR-061        | Manage test cases                                |
| FR-070 – FR-073        | Run code                                         |
| FR-080 – FR-084        | Submit solution, View own submissions            |
| FR-090 – FR-093        | Manage activities (editor rules)                 |
| FR-100 – FR-101        | View grades                                      |
| FR-110                 | Manage programming languages                     |
| FR-120                 | Manage app settings                              |
| FR-130                 | *Deferred (LTI)*                                 |