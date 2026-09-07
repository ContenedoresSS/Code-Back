# Activity Diagram 2 — Solve an Activity

## Metadata

| Field           | Value                                                                      |
| --------------- | -------------------------------------------------------------------------- |
| **Document**    | Activity Diagram — Solve an Activity                                       |
| **Author**      | Code Panel — Development Team                                              |
| **Reviewer**    | Carlos Coronado                                                            |
| **Last review** | 2026-09-06                                                                 |
| **Status**      | Pending review                                                             |
| **Source**      | `docs/legacy/Diagramas de actividad .drawio` (page 2), `docs/api/openapi.yaml` |
| **Technology**  | Mermaid `swimlane-beta`                                                    |

## Diagram

> **Rendering note:** this diagram uses the experimental `swimlane-beta` syntax. VS Code's preview does not render it (shows a parse/render error). Open it in [mermaid.live](https://mermaid.live) to view it correctly.

```mermaid
swimlane-beta LR
    subgraph student["Student (UADY Virtual)"]
        P1([Start]) --> P2[Login]
        P2 --> P3[Access a course]
        P3 --> P4[Start the activity]
        P5[Modify code in the embedded editor] --> P6[Select 'Run']
    end
    subgraph uady["UADY Virtual"]
        U1[Load iframe with saved data] --> U2[Present editor with restrictions]
        U3[Show expected output]
        U4[Show compiler error]
    end
    subgraph system["Code Panel System"]
        S1[Load activity data - starter code and test cases]
        S2[Provision ephemeral container] --> S3[Run the code with the given input]
        S3 --> S4[Compare output with expected test cases]
        S4 --> S5[Destroy container]
        S5 --> D{Is the code correct?}
    end

    P4 --> U1
    U1 --> S1
    S1 --> U2
    U2 --> P5
    P6 --> S2
    D -->|Yes| U3
    D -->|No| U4
    U3 --> P5
    U4 --> P5
```

## Notes

- Integration with UADY Virtual uses an **`<iframe>`** (HTML embed). The **LTI protocol is not implemented** and is deferred as future work.
- Each execution provisions an isolated, ephemeral container that is destroyed right after the run (`/execution/*` endpoints).
- The iterative loop back to "Modify code" was added (the legacy diagram ended after showing the result); the final grade is produced in the submission flow (Activity Diagram 3).