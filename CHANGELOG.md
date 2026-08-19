# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.24-alpha] - 2026-08-19

### Added
- Endpoint to duplicate a subject with its activities and test cases for a new school period (POST /subject/:id/duplicate), without cloning enrollments or submissions

### Changed
- Submission detail endpoint now returns the full `language` object (id, name, editorIdentifier, version, fileExtension) instead of just `languageId`
- Production server URL updated to https://code.oryondev.duckdns.org

### Fixed
- Student subject list (GET /subject) now only returns the subjects the student is enrolled in, instead of all subjects

### Infrastructure
- VPS deploy pipeline temporarily disabled while the server is paused

## [0.0.23-alpha] - 2026-08-19

### Added
- Submission detail endpoint with code snapshot and compiler output (GET /activity/:id/submissions/:submissionId)
- Automatic enrollment of a student in the activity's subject when they submit, without blocking the submission
- Admin-only settings to restrict registration email domains
- Execution sandbox hardening with configurable limits: read-only rootfs, no-new-privileges and container auto-removal via new EXECUTION_* environment variables (closes DEBT-01)
- Concurrency limiter for code execution with a FIFO queue and configurable timeout (EXECUTION_MAX_CONCURRENCY, EXECUTION_QUEUE_TIMEOUT_MS), mapped to HTTP 429 on run and submit endpoints (closes DEBT-02)
- Request input size validation: MAX_REQUEST_BODY cap with 413 response, plus per-file code and stdin size limits (EXECUTION_MAX_CODE_BYTES, EXECUTION_MAX_STDIN_BYTES) returning 400 (closes DEBT-03)

### Changed
- Refactored enrollment and submission services to remove `any` and type catch blocks (`unknown` + narrowing)
- Grouped environment variable schema into typed sections with helpers
- Made the seed script more readable and data-driven

### Fixed
- Activity validation now allows empty starter code file content

### Docs
- Added technical debt summary dashboard to DEBT.md (31 items with status per pillar)

## [0.0.22-alpha] - 2026-08-15

### Added
- Teacher grades view per activity with paginated students, their best score and full submission history (GET /activity/:id/grades)
- Submission responses report whether they were persisted, warning anonymous requests with `saved: false`
- Admin-only user management: list users filtered by role and name (GET /user) and manage a user's password, active status and role (PATCH /user/:id)
- Account active/inactive state, with login and refresh rejected for deactivated accounts (403)

### Changed
- Users table gains an `is_active` column defaulting to true, keeping existing accounts active

### Fixed
- God role can now access any subject, previously returning 404

## [0.0.21-alpha] - 2026-08-15

### Added
- Password recovery flow by email code with request, verification and reset endpoints
- Email delivery through strategy pattern with Resend and native SMTP providers, selected via EMAIL_PROVIDER
- Editable email templates as files under templates/mail, applied on process restart
- Password reset code lifetime configurable via RESET_CODE_TTL_MINUTES
- CORS allowed origins configurable via CORS_ORIGINS environment variable

### Fixed
- CORS wildcard now allows any origin when CORS_ORIGINS is "*"
- Health check endpoint documented at its real path /api/health instead of /api/v1/api/health

### Changed
- Agent and release documentation split into modular reference files under docs/agents/

## [0.0.20-alpha] - 2026-08-05

### Added
- Extensible activity rules system: the six editor rules live in a single `rules` JSON column, driven by a catalog that declares each rule's default and the layer that enforces it
- Four new activity rules teachers can configure: allow code editing, allow language change, allow file upload and allow file download
- Backend enforcement for the rules it owns: a submission is rejected with 403 when it edits the starter code with `allowCodeEdit` off, or adds and removes files with `allowFileUpload` off
- Optional `languageId` on submit, accepted only when the activity has `allowLanguageChange` enabled
- Agent workflow protocol with mandatory TDD, verification gates, playbooks and PR template (AGENTS.md section 15)
- Release and deploy cycle protocol with SemVer, annotated tags and CHANGELOG procedure (AGENTS.md section 16)
- Technical debt entry for the broken automatic rollback in the VPS deploy (DEBT-30)

### Changed
- **Breaking**: activity endpoints replace the flat `allowCopy` and `allowPaste` fields with a `rules` object containing all six rules
- Activity request schemas now reject unknown fields with 400 instead of discarding them silently
- Deploy guide aligned with the release protocol: tag synchronization, annotated tags and CHANGELOG link updates

## [0.0.19-alpha] - 2026-08-05

### Added
- Enrollment endpoints for student-subject management (inscribirse, listar, desinscribir)
- GET /subject/:id/students endpoint for teachers to view enrolled students
- Zod validation for enrollment requests
- OpenAPI documentation for enrollment endpoints
- Comprehensive unit and integration tests for enrollment module

## [0.0.18-alpha] - 2026-08-04

### Changed
- Updated AGENTS.md with IaC and VPS infrastructure documentation
- Updated .env.example with PostgreSQL variables

### Fixed
- Deploy permissions and IaC integration in CD workflow

## [0.0.17-alpha] - 2026-07-31

### Added
- Healthcheck endpoint with rate limit (GET /api/health)
- Husky hooks for pre-commit formatting (lint-staged + prettier)
- Commit message validation with commitlint (Conventional Commits)
- PR validation CI workflow with segmented jobs

### Changed
- Restructured CI/CD workflows with segmented jobs, healthcheck and rollback
- Updated CI/CD documentation with optimized workflow details
- Documented git workflow, branching strategy and conventional commits

### Fixed
- Deployment ID syntax in deploy workflow (Node 24 compatibility)
- Formatting issues in execution controller and subject routes

## [0.0.16-alpha] - 2026-07-28

### Fixed
- Swagger crash in production by switching to dynamic import for swagger config

## [0.0.15-alpha] - 2026-08-04

### Added
- Image URL field for subjects to display cover images in frontend
- Zod validation for subject endpoints (create and update)
- Reusable validation middleware for request body validation
- Comprehensive test suite with unit and integration tests
- OpenAPI 3.1 specification with Swagger UI
- Project documentation (AGENTS.md, DEBT.md, DEPLOY.md)
- Production deployment configuration (compose.prod.yaml)
- Deployment guide with CI/CD workflow documentation

## [0.0.14-alpha] - 2026-06-18

### Added
- Rate limiting for code execution endpoints (2 requests per 5 minutes per IP)

### Fixed
- stdin error in run code endpoint

## [0.0.13-alpha] - 2026-06-12

### Added
- Submission module for student code submissions
- Automatic evaluation system with test cases
- Grade calculation based on passed tests

## [0.0.12-alpha] - 2026-06-11

### Fixed
- Multiple fixes across the application

## [0.0.11-alpha] - 2026-06-05

### Fixed
- God user bypass for test cases resource permissions

## [0.0.10-alpha] - 2026-06-05

### Added
- Endpoint to get student workspace with initial code and public test cases
- CRUD operations for test cases management
- Basic CRUD for activities management
- Subject CRUD operations
- Database schema updates from planning diagram
- User profile setup functionality

### Changed
- Updated seed to initialize new resources (activities, subjects, test cases, workspaces)

### Fixed
- Security improvements for container isolation

## [0.0.9-alpha] - 2026-06-05

### Added
- Multiple files support for code execution
- stdin support for code execution
- Name claim in JWT token

### Fixed
- RBAC middleware implementation
- Image preparation for programming languages CRUD

## [0.0.8-alpha] - 2026-05-14

### Added
- CRUD operations for programming languages
- One-shot code execution endpoint

## [0.0.7-alpha] - 2026-05-07

### Fixed
- CORS configuration for frontend integration

## [0.0.6-alpha] - 2026-04-24

### Added
- CI/CD pipeline for deployment to VPS
- Automated build and publish to GitHub Container Registry

### Fixed
- Added package-lock.json to repository

## [0.0.5-alpha] - 2026-04-24

### Added
- Docker support for containerized deployment
- Multi-stage Dockerfile for optimized builds
- Docker Compose configuration for development

## [0.0.4-alpha] - 2026-04-24

### Added
- CRUD operations and service for invitation codes
- Authentication middlewares (JWT, RBAC)
- Rate limiting middleware

### Fixed
- Bug preventing user retrieval

## [0.0.3-alpha] - 2026-04-21

### Added
- Database seed and initialization commands
- Login functionality with JWT tokens
- Environment variables configuration with Zod validation

### Changed
- Removed username from user model
- Improved environment variables handling

## [0.0.2-alpha] - 2026-04-17

### Added
- Authentication methods: register and login
- VS Code configuration and Prettier linter setup
- Prisma ORM setup with PostgreSQL

## [0.0.1-alpha] - 2026-03-27

### Added
- Base Express project structure
- Initial project setup
- First commit

[Unreleased]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.24-alpha...HEAD
[0.0.24-alpha]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.23-alpha...v0.0.24-alpha
[0.0.23-alpha]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.22-alpha...v0.0.23-alpha
[0.0.22-alpha]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.21-alpha...v0.0.22-alpha
[0.0.21-alpha]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.20-alpha...v0.0.21-alpha
[0.0.20-alpha]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.19-alpha...v0.0.20-alpha
[0.0.19-alpha]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.18-alpha...v0.0.19-alpha
[0.0.18-alpha]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.17-alpha...v0.0.18-alpha
[0.0.17-alpha]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.16-alpha...v0.0.17-alpha
[0.0.16-alpha]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.15-alpha...v0.0.16-alpha
[0.0.15-alpha]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.14-alpha...v0.0.15-alpha
[0.0.14-alpha]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.13-alpha...v0.0.14-alpha
[0.0.13-alpha]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.12-alpha...v0.0.13-alpha
[0.0.12-alpha]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.11-alpha...v0.0.12-alpha
[0.0.11-alpha]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.10-alpha...v0.0.11-alpha
[0.0.10-alpha]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.9-alpha...v0.0.10-alpha
[0.0.9-alpha]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.8-alpha...v0.0.9-alpha
[0.0.8-alpha]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.7-alpha...v0.0.8-alpha
[0.0.7-alpha]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.6-alpha...v0.0.7-alpha
[0.0.6-alpha]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.5-alpha...v0.0.6-alpha
[0.0.5-alpha]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.4-alpha...v0.0.5-alpha
[0.0.4-alpha]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.3-alpha...v0.0.4-alpha
[0.0.3-alpha]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.2-alpha...v0.0.3-alpha
[0.0.2-alpha]: https://github.com/ContenedoresSS/Code-Panel-Backend/compare/v0.0.1-alpha...v0.0.2-alpha
[0.0.1-alpha]: https://github.com/ContenedoresSS/Code-Panel-Backend/releases/tag/v0.0.1-alpha
