# Architecture Overview

- Owner: David
- Status: Draft
- Last Updated: 2026-02-25
- Depends On: [mvp-frd-review-spec.md](./mvp-frd-review-spec.md), [data-contracts.md](./data-contracts.md)
- Open Questions:
  - Do we want worker-based file processing in MVP or only if performance requires it?

## 1. Technology Baseline
- Frontend framework: React
- Build tool: Vite
- Language: TypeScript
- Validation library: Ajv (strict JSON Schema mode)
- Test stack: Vitest + React Testing Library + Playwright (smoke)

## 2. System Boundaries
- Local-only operation in MVP.
- Inputs are local files (schema + FRDs) provided through browser file picker.
- Outputs are in-app review run summary, issue lists, and readable FRD sections.

## 3. Module Boundaries
- `ui/`
  - Review run screens, summary components, issue panel, readable renderer.
- `domain/review-run/`
  - Orchestrates parse, validate, and render pipeline per file.
- `domain/validation/`
  - Schema compilation and issue mapping.
- `domain/rendering/`
  - Schema-driven transformation from FRD JSON to readable section model.
- `types/`
  - Canonical contracts from [data-contracts.md](./data-contracts.md).

## 4. Data Flow
1. Schema upload -> parse schema JSON.
2. Compile validator once per active schema.
3. FRD uploads -> parse each file.
4. Validate parsed FRD -> collect issues.
5. If valid -> transform to rendered sections.
6. Aggregate into review run summary + per-file result list.
7. Present in UI state model.

## 5. State Model
- Session-only in-memory store.
- State segments:
  - active schema
  - review run status
  - per-file results
  - batch summary
- No local storage in MVP.

## 6. Error Strategy
- Fatal pre-run errors: schema parse or compile failure.
- Non-fatal per-file errors: FRD parse or validation failures.
- Always continue processing remaining files when per-file failures occur.

## 7. Performance and UX Considerations
- Process files incrementally to keep UI responsive.
- Avoid expensive deep cloning in render pipeline.
- Limit synchronous UI-blocking operations during large review runs.

## 8. Future Desktop Wrapper Path
The architecture is intentionally web-first and local-first so the same React app can later be wrapped in:
- Tauri (preferred lightweight option), or
- Electron (fallback if ecosystem constraints require it).

Desktop wrapping should preserve the domain modules unchanged and only add:
- desktop packaging,
- file-system capability extensions,
- optional native integrations.

## 9. Traceability
- Validation behavior source: [MVP Spec §4](./mvp-frd-review-spec.md#4-validation-behavior)
- Rendering behavior source: [MVP Spec §5](./mvp-frd-review-spec.md#5-rendering-behavior)
- Failure handling source: [MVP Spec §8](./mvp-frd-review-spec.md#8-failure-handling)
