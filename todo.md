# RhizomeDB TODO

This document tracks planned improvements and changes to the project.


### HyperView Generalization
- [ ] Expand HyperView concept to support multiple roots
  - Current model: `HyperView(Schema, { id: specific_id })` → single HyperView
  - New model: `HyperView(Schema, { property: constraint })` → HyperView[]
  - Examples:
    - `HyperView(MovieSchema, { releaseYear: { between: [1990, 1999] } })` → multiple movies
    - `HyperView(ActorSchema, { name: "Keanu Reeves" })` → could return 0-to-N matches
  - Result: All HyperView operations return arrays (even if length = 1)

### Queries as HyperView Compositions
- [ ] Add section on Queries as pipelines of HyperView operations
  - Example: "All directors who released a movie starring Keanu Reeves in the 90s"
    1. `HyperView(ActorSchema, { name: "Keanu Reeves" })`
    2. Traverse `appearedIn`, filter by `releaseYear`
    3. `HyperView(MovieSchema, { id: { in: [matched_ids] } })`
    4. Extract directors, apply `DirectorSchema`
  - Key insight: Queries compose HyperViews through graph traversal
  - Each step operates on HyperView[] → filters/transforms → HyperView[]
  - Status: This is still somewhat intuitive, needs more development


## Notes

- Keep examples collapsible with natural language summaries
- Emphasize flexibility over rigid constraints (e.g., targetContext/localContext as conventions)
- Make clear what's proven vs. aspirational
- "Schemas as data" is philosophically central - should be prominent
