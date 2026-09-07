# Activity Diagram 1 — Create and Embed an Activity

## Metadata

| Field           | Value                                                                      |
| --------------- | -------------------------------------------------------------------------- |
| **Document**    | Activity Diagram — Create and Embed an Activity                            |
| **Author**      | Code Panel — Development Team                                              |
| **Reviewer**    | Carlos Coronado                                                            |
| **Last review** | 2026-09-06                                                                 |
| **Status**      | Pending review                                                             |
| **Source**      | `docs/legacy/Diagramas de actividad .drawio` (page 1), `docs/api/openapi.yaml` |
| **Technology**  | Mermaid `swimlane-beta`                                                    |

## Diagram

> **Rendering note:** this diagram uses the experimental `swimlane-beta` syntax. VS Code's preview does not render it (shows a parse/render error). Open it in [mermaid.live](https://mermaid.live) to view it correctly.

```mermaid
swimlane-beta LR
    subgraph professor["Professor (Code Panel)"]
        P1([Start]) --> P2[Login]
        P2 --> P3[Access a subject]
        P3 --> P4[Select 'Create new activity']
        P4 --> P5[Configure activity metadata - title, language, max attempts]
        P5 --> P6{Provide code via editor or upload?}
        P6 -->|Editor| P7[Write code in the editor]
        P6 -->|Upload| P8[Upload code file]
        P7 --> P9[Define test cases]
        P8 --> P9
        P9 --> P10[Send the activity for validation]
        P11[Copy the generated iframe embed code] --> P12[Open UADY Virtual]
    end
    subgraph system["Code Panel System"]
        S1[Validate consistency and test cases] --> S2{Is it valid?}
        S2 -->|No| P5
        S2 -->|Yes| S3[Save the activity]
        S3 --> S4[Generate iframe embed code]
        S4 --> P11
    end
    subgraph uady["Professor (UADY Virtual)"]
        U1[Access the course] --> U2[Create an activity or resource]
        U2 --> U3[Select 'Embed HTML content']
        U3 --> U4[Paste the iframe HTML snippet]
        U4 --> U5[Save changes]
        U5 --> U6([End])
    end

    P10 --> S1
    P12 --> U1
```

## Notes

- Integration with UADY Virtual uses an **`<iframe>`** (HTML embed). The **LTI protocol is not implemented** and is deferred as future work.
- The flow is faithful to the legacy diagram with updated terminology from the API (`subject`, `activity`, `test case`, `embed`).
- If validation fails, the professor is sent back to reconfigure the activity metadata.