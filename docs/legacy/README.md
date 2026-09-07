# Legacy / Historical Documentation

This folder is **not part of the active documentation**.

Everything stored here is kept for **historical reference only**. The documents in this directory:

- May be **outdated** or no longer reflect the current system.
- Should **not** be used as a source of truth for requirements, architecture or design.
- Can be removed once the active documentation in `../design/` fully replaces them.

## Current content

| File                                   | Notes                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| `c4-diagrams-legacy-preliminary.drawio` | Original draw.io source (C4 levels 1 and 2, including the non-LTI variant). Superseded by the Mermaid diagrams in `../design/`. |
| `Diagramas de actividad .drawio`       | Original activity diagrams (creation, solving, submission and grades upload, with CSV). Superseded by the Mermaid activity diagrams in `../design/`. |

## Active documentation

The up-to-date diagrams live in [`docs/design/`](../design/):

- `entity-relationship-diagram.md`
- `c4-level-1-system-context.md`
- `c4-level-2-container-diagram.md`
- `activity-diagram-1-create-activity.md`
- `activity-diagram-2-solve-activity.md`
- `activity-diagram-3-submit-activity.md`
- `activity-diagram-4-view-grades.md`
- `use-case-diagram.md`
- `architecture-diagram.md`
- `software-requirements-specification.md`

If you find a file here that still contains useful information, move it into `../design/` and update it **before** relying on it.