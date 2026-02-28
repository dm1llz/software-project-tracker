# Codex Run Memory

Purpose: persistent implementation memory across chats/loops for this repository.

Rules:
- Keep entries short and durable.
- Record only useful engineering learnings (snags, decisions, caveats, reusable checks).
- Do not store secrets, credentials, tokens, or personal data.
- Avoid duplicates; update/apply prior entries when relevant.

Template:
```md
### YYYY-MM-DD <context>
- Situation:
- Learning:
- Action/Decision:
- Reusable check/command:
- Applicability:
```

### 2026-02-27 FRD-001-T1
- Situation: FRD-001-T1 required both module scaffolding and executable evidence for import-direction boundaries before task completion.
- Learning: A lightweight boundary policy helper plus Vitest integration scenarios is sufficient to prove allowed (`ui -> types`) and prohibited (`domain/* -> ui`) dependency directions early.
- Action/Decision: Added `src/types/moduleBoundaryPolicy.ts`, integration tests under `tests/integration/`, and documented allowed module imports in `docs/module-boundaries.md`.
- Reusable check/command: `npm run test:integration && npm run validate:schema`
- Applicability: Reuse for future FRDs that introduce new module imports or ownership boundaries.

### 2026-02-27 FRD-001-T2-T3
- Situation: The selected bundle started at a `prLevel: true` task (`T2`) and correctly expanded to include subsequent eligible `prLevel: false` task `T3`.
- Learning: Enforcing canonical contracts with `tsc --noEmit` strict build plus unit invariants catches status/summary drift before pipeline code exists.
- Action/Decision: Added strict TypeScript build gate, canonical `reviewContracts`, guard helpers, deterministic sort/disambiguation helpers, and unit coverage for both success/error scenarios.
- Reusable check/command: `npm run build && npm run test:unit && npm run validate:schema`
- Applicability: Use for all future FRD bundles that define contracts first and derive pipeline helpers from contract invariants.

### 2026-02-27 TS return-type style
- Situation: Team preference clarified around using TypeScript inference vs explicit function return annotations.
- Learning: Prefer inference for local/private helpers and test fixtures; keep explicit return types on exported/shared APIs and critical policy/security logic.
- Action/Decision: Updated local helpers to rely on inference while preserving explicit signatures for boundary functions.
- Reusable check/command: `rg -n "\\):\\s*.*=>" src tests`
- Applicability: Apply during refactors and new module additions to keep APIs explicit and internals concise.

### 2026-02-27 FRD-002-T1
- Situation: Schema-ingestion task needed parse-failure run issues with line/column when JSON parser exposes byte position.
- Learning: Parsing `JSON.parse` error messages for `position <n>` and deriving line/column from source text provides reliable location metadata without extra parser dependencies.
- Action/Decision: Added `loadSchemaFile` and `mapSchemaParseIssue` to produce blocked results with `SCHEMA_ERROR` issues, including draft defaults (`declaredDraft=null`, `effectiveDraft=2020-12`).
- Reusable check/command: `npm run build && npm run test:integration && npm run validate:schema`
- Applicability: Reuse for file-ingestion paths that must convert parse exceptions into contract-level issues.

### 2026-02-27 FRD-002-T2-T3
- Situation: Strict schema compilation for draft-2020-12 failed when using generic Ajv constructor and optional RunIssue fields violated exact-optional typing.
- Learning: Use `ajv/dist/2020` for 2020-12 meta-schema compatibility and construct RunIssue objects by omitting undefined optional fields.
- Action/Decision: Added `compileSchema`, `detectUnsupportedDraft`, `mapRunIssue`, and `createRunBlockedResult` with tests covering draft gating, format-plugin enforcement, and blocked-run summary contracts.
- Reusable check/command: `npm run build && npm run test:unit && npm run test:integration && npm run validate:schema`
- Applicability: Reuse for future schema-compile paths and any typed issue mappers with `exactOptionalPropertyTypes` enabled.

### 2026-02-27 FRD-003-T1
- Situation: FRD ingestion needed stable IDs, preserved upload order, duplicate-name labeling, and continue-on-read-failure behavior.
- Learning: Generating IDs from `(uploadIndex + normalized fileName)` keeps IDs deterministic while still unique across duplicate names.
- Action/Decision: Added `mapReviewInputFiles` to continue processing after per-file read failures, emit `PARSE_ERROR` file issues, and return `displayNameById` built from all attempted uploads.
- Reusable check/command: `npm run build && npm run test:integration && npm run validate:schema`
- Applicability: Reuse for browser file-ingestion stages that must preserve order and tolerate partial read failures.

### 2026-02-27 FRD-003-T2-T3
- Situation: Per-file parse/validate pipeline needed continue-on-error behavior while preserving contract invariants and deterministic ordering/summary outputs.
- Learning: Keeping parse, validate, and result-reducer stages explicit makes status mapping (`parse_failed` / `validation_failed` / `passed`) testable and keeps warning-only diagnostics non-blocking.
- Action/Decision: Added `parseFrdFile`, `validateFrdFile`, `buildReviewResult`, and `summarizeBatchReview`, plus integration/unit coverage for mixed-quality batches, warning-only diagnostics, and summary invariant enforcement.
- Reusable check/command: `npm run build && npm run test:unit && npm run test:integration && npm run validate:schema`
- Applicability: Reuse for future file-processing pipelines that require deterministic partial-failure handling and strict contract checks.
