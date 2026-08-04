# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/ContenedoresSS/Code-Back/compare/v0.0.15-alpha...HEAD
[0.0.15-alpha]: https://github.com/ContenedoresSS/Code-Back/compare/v0.0.14-alpha...v0.0.15-alpha
[0.0.14-alpha]: https://github.com/ContenedoresSS/Code-Back/compare/v0.0.13-alpha...v0.0.14-alpha
[0.0.13-alpha]: https://github.com/ContenedoresSS/Code-Back/compare/v0.0.12-alpha...v0.0.13-alpha
[0.0.12-alpha]: https://github.com/ContenedoresSS/Code-Back/compare/v0.0.11-alpha...v0.0.12-alpha
[0.0.11-alpha]: https://github.com/ContenedoresSS/Code-Back/compare/v0.0.10-alpha...v0.0.11-alpha
[0.0.10-alpha]: https://github.com/ContenedoresSS/Code-Back/compare/v0.0.9-alpha...v0.0.10-alpha
[0.0.9-alpha]: https://github.com/ContenedoresSS/Code-Back/compare/v0.0.8-alpha...v0.0.9-alpha
[0.0.8-alpha]: https://github.com/ContenedoresSS/Code-Back/compare/v0.0.7-alpha...v0.0.8-alpha
[0.0.7-alpha]: https://github.com/ContenedoresSS/Code-Back/compare/v0.0.6-alpha...v0.0.7-alpha
[0.0.6-alpha]: https://github.com/ContenedoresSS/Code-Back/compare/v0.0.5-alpha...v0.0.6-alpha
[0.0.5-alpha]: https://github.com/ContenedoresSS/Code-Back/compare/v0.0.4-alpha...v0.0.5-alpha
[0.0.4-alpha]: https://github.com/ContenedoresSS/Code-Back/compare/v0.0.3-alpha...v0.0.4-alpha
[0.0.3-alpha]: https://github.com/ContenedoresSS/Code-Back/compare/v0.0.2-alpha...v0.0.3-alpha
[0.0.2-alpha]: https://github.com/ContenedoresSS/Code-Back/compare/v0.0.1-alpha...v0.0.2-alpha
[0.0.1-alpha]: https://github.com/ContenedoresSS/Code-Back/releases/tag/v0.0.1-alpha
