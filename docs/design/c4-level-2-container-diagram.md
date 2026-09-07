# C4 Model — Level 2: Container Diagram

## Metadata

| Field              | Value                                                       |
| ------------------ | ----------------------------------------------------------- |
| **Document**       | C4 Model — Level 2 (Container)                              |
| **Author**         | Code Panel — Development Team                               |
| **Reviewer**       | Carlos Coronado                                             |
| **Last review**    | 2026-09-06                                                  |
| **Status**         | Pending review                                              |
| **Source**         | `docs/temp/Diagrama C4 - Contenedores.drawio` (Nivel 2)     |
| **Technology**     | Mermaid `C4Container`                                       |

## Diagram

```mermaid
C4Container
    title Container diagram for Code Panel

    Person(professor, "Professor", "Designs activities and supervises academic progress")
    Person(student, "Student", "Learns by programming and solves exercises in UADY Virtual")
    System_Ext(uadyVirtual, "UADY Virtual (Moodle)", "Learning management system (LMS)")
    System_Ext(mailProvider, "Mail Provider", "SaaS email delivery (Resend) / SMTP")

    System_Boundary(codePanel, "Code Panel") {
        Container(editor, "Frontend — Code Editor", "React / TypeScript / Monaco", "Web code editor for the embedded view")
        Container(adminPanel, "Frontend — Admin Panel", "React / TypeScript", "View for creating and managing resources")
        Container(backend, "Backend — Orchestrator and Grader", "Node.js / Express", "Handles LTI launches, validates users, manages the container lifecycle, evaluates activities and syncs grades")
        Container(execution, "Execution Engine", "Docker daemon", "Governs containers")
        ContainerDb(database, "Database", "PostgreSQL", "Stores exercises, code templates, settings, test cases and users")
    }

    Rel(professor, adminPanel, "Manages resources; main interaction point with the system")
    Rel(professor, uadyVirtual, "Embeds views in activities")
    Rel(student, uadyVirtual, "Accesses the course. Solves activities")
    Rel(uadyVirtual, editor, "Loads embedded view using LTI")
    Rel(editor, backend, "Sends code to execute")
    Rel(adminPanel, backend, "Manages resources (e.g. templates, settings)")
    Rel(backend, uadyVirtual, "Assigns grades")
    Rel(backend, execution, "Requests code execution in a secure environment (uses Docker socket)")
    Rel(backend, database, "Saves and queries information")
    Rel(backend, mailProvider, "Sends transactional emails (invitations, password resets)")
```

## Notes

- Containers match the original diagram: two **frontends** (code editor for the embedded view, admin panel for resource management), the **backend orchestrator and grader** (single entry point for the API), the **execution engine** and the **database**.
- The **Execution Engine** talks to the host Docker daemon through `/var/run/docker.sock` (mounted in `compose.prod.yaml`) to run untrusted student code in isolated, ephemeral containers with resource limits.
- The **Database** (PostgreSQL) is only reached through Prisma (no direct SQL in the API layer).
- **UADY Virtual** loads the code editor view through the **LTI protocol** and receives grades back from the backend.
- The **Mail Provider** is an external SaaS (Resend) or a configurable SMTP server, resolved at runtime by a strategy factory; it was not part of the original diagram but is part of the deployed system.
- The original diagram also documents a **non-LTI variant** (embed via `<iframe>` and grades exported as CSV), kept for reference in `docs/temp`.
- Component details (controllers, services, repositories) are out of scope for this level and belong to Level 3 (Component diagram).