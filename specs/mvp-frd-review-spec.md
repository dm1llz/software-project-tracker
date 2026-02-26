# MVP FRD Review Spec

- Owner: David
- Status: Approved
- Last Updated: 2026-02-25
- Depends On: [product-vision.md](./product-vision.md), [data-contracts.md](./data-contracts.md), [ux-review-flow.md](./ux-review-flow.md)
- Open Questions:
  - Should strict and lenient validation modes both be offered after MVP?

## 1. Summary
Build a local-first web application that accepts one JSON schema and multiple FRD JSON files, validates each FRD strictly, and renders valid FRDs in a readable sectioned format.

## 2. Goals and Success Criteria
- Validate each FRD against uploaded schema with strict JSON Schema behavior.
- Process multiple FRD files per review run.
- Show per-file issue details and aggregate review run summary.
- Render valid FRDs into readable sections for human review.
- Keep all operation in browser memory with no persistence in MVP.

Success criteria:
1. User can complete schema upload and FRD review run without command-line tools.
2. Invalid files show path-specific issues for fast correction.
3. Valid files are readable without looking at raw JSON.

## 3. Scope
In scope:
- Upload one schema JSON file.
- Upload multiple FRD JSON files.
- Parse and strict-validate each FRD.
- Show issue list per file.
- Show summary counts for review run.
- Render valid FRDs with schema-driven sections.

Out of scope:
- Data persistence/history between sessions.
- AI-assisted issue fixes.
- Exports (Markdown, HTML, PDF).
- Collaboration/auth/cloud sync.

## 4. Validation Behavior
- Engine: JSON Schema validation using strict mode.
- Supported schema draft in MVP: `2020-12` only.
- If schema `$schema` is missing, treat it as `2020-12` for MVP.
- If schema `$schema` declares any other draft, fail fast and block review run.
- Unknown fields are errors unless schema explicitly allows them.
- Required fields and type mismatches are treated as errors.
- Schema must compile before FRD review run can start.
- Parse failures are separate from schema validation issues.

## 5. Rendering Behavior
- Rendering is schema-driven, not free-form.
- Object nodes render as labeled sections.
- Arrays of objects render in repeated structured blocks.
- Arrays of scalars render as list fields.
- Scalars render as labeled values.
- Nested objects render as nested sections.
- Readable output must not alter FRD data semantics.

## 6. Review Run Flow
1. User uploads one schema file.
2. App parses and compiles schema.
3. User uploads one or more FRD files.
4. App parses and validates each file independently.
5. App returns review run summary and per-file details.
6. Valid files expose readable FRD view.

## 7. UX States
- Empty: no schema selected.
- Ready: schema loaded, waiting for FRD files.
- Running: processing files.
- Complete: summary + per-file results.
- Error: schema parse/compile failure with actionable message.

## 8. Failure Handling
- Invalid schema JSON:
  - Block review run.
  - Show schema parse error with line/column when available.
- Schema compile failure:
  - Block review run.
  - Show compile-time issue details.
- Unsupported schema draft:
  - Block review run.
  - Show expected draft (`2020-12`) and the detected `$schema` value.
- Invalid FRD JSON:
  - Mark file as parse failed.
  - Continue processing remaining files.
- Validation failures:
  - Mark file as failed.
  - Show issue list with keyword, path, and message.
- Duplicate filenames in one review run:
  - Keep separate entries by upload order index.

## 9. Non-Functional Requirements
- Typical run with 20 medium FRD files should complete quickly on local machine.
- UI must remain responsive during review run.
- No outbound network calls required for core review run behavior.

## 10. Acceptance Criteria
1. Given valid schema and valid FRD files, all files return `valid=true` and render readable sections.
2. Given valid schema and invalid FRD files, each file shows one or more issues with JSON pointer path.
3. Given mixed file quality, review run summary correctly reports total, passed, failed, and parse-failed counts.
4. Given invalid schema, app blocks FRD upload flow and displays schema errors.
5. Given duplicate filenames, app displays separate result rows with unique display identifiers.
6. Given no persistence requirement, reloading app clears prior review run state.
7. Given schema with unsupported `$schema`, app blocks run and reports supported draft `2020-12`.

## 11. Dependencies
- Architecture: [architecture-overview.md](./architecture-overview.md)
- Type contracts: [data-contracts.md](./data-contracts.md)
- Screen behavior: [ux-review-flow.md](./ux-review-flow.md)
- Non-goals: [non-goals.md](./non-goals.md)
