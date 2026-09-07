# Activity Diagram 4 — View Grades

## Metadata

| Field           | Value                                                                      |
| --------------- | -------------------------------------------------------------------------- |
| **Document**    | Activity Diagram — View Grades                                             |
| **Author**      | Code Panel — Development Team                                              |
| **Reviewer**    | Carlos Coronado                                                            |
| **Last review** | 2026-09-06                                                                 |
| **Status**      | Pending review                                                             |
| **Source**      | `docs/legacy/Diagramas de actividad .drawio` (page 4), `docs/api/openapi.yaml` |
| **Technology**  | Mermaid `swimlane-beta`                                                    |

## Diagram

> **Rendering note:** this diagram uses the experimental `swimlane-beta` syntax. VS Code's preview does not render it (shows a parse/render error). Open it in [mermaid.live](https://mermaid.live) to view it correctly.

```mermaid
swimlane-beta LR
    subgraph professor["Professor (Code Panel)"]
        P1([Start]) --> P2[Login]
        P2 --> P3[Access a subject]
        P3 --> P4[Open the activity]
        P4 --> P5[Select 'View grades']
        P6[Review grades on screen] --> P7([End])
    end
    subgraph system["Code Panel System"]
        S1[Query submissions for the activity]
        S2[Build the grades table per student]
        S3[Return grades to the professor's view]
    end

    P5 --> S1
    S1 --> S2
    S2 --> S3
    S3 --> P6
```

## Notes

- **Grades are only viewable inside the application** through `GET /activity/{id}/grades` (teacher view). The legacy flow described **CSV export/import** into Moodle, but that feature was **not implemented** and is not part of the current system.
- Because there is no CSV feature, the "Professor in UADY Virtual" lane from the legacy diagram was removed.
- Integration with UADY Virtual uses an **`<iframe>`** (HTML embed); the **LTI protocol** (which would allow automatic grade sync) is deferred as future work.