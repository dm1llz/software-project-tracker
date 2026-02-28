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

### 2026-02-27 FRD-004-T1
- Situation: Rendering foundation needed scalar/object section mappers that strictly preserve value semantics and JSON pointer paths.
- Learning: Restricting object-field rendering to scalars/arrays-of-scalars keeps T1 scope tight while guaranteeing union-contract correctness.
- Action/Decision: Added `mapScalarSection` and `mapObjectSection` with controlled unsupported-type errors plus unit tests for object field mapping, null scalar preservation, and path/label output.
- Reusable check/command: `npm run build && npm run test:unit && npm run validate:schema`
- Applicability: Reuse for future rendering tasks before nested-array traversal is introduced.

### 2026-02-28 FRD-004-T2-T3
- Situation: Recursive rendering needed nested array sections while preserving object field semantics and strict TypeScript optional-property checks.
- Learning: In recursive object traversal, treat all arrays as nested sections (not object scalar-array fields) to keep array rendering explicit; with `exactOptionalPropertyTypes`, optional nested schema params should be typed as `schema?: T | undefined` when forwarding possibly-undefined values.
- Action/Decision: Added `buildRenderedSections` recursion with dedicated array mappers, plus `orderFields` and `assertSemanticPreservation` to enforce deterministic ordering and no coercive transforms.
- Reusable check/command: `npm run build && npm run test:unit && npm run test:integration && npm run validate:schema`
- Applicability: Reuse for future renderer extensions that traverse mixed nested data while preserving contract-level semantics.

### 2026-02-28 FRD-005-T1
- Situation: UI state-shell task introduced first `.tsx` files while the existing TypeScript build only included `src/**/*.ts` and had no JSX compiler setting.
- Learning: To keep strict CI meaningful for UI tasks without adding new runtime deps, include `src/**/*.tsx` in `tsconfig` and set `jsx: "preserve"` so `.tsx` modules are type-checked under current toolchain.
- Action/Decision: Added `deriveScreenState`, `ReviewRunPage` state-shell model, and `SchemaControlPanel` gating model with integration tests covering Empty/Ready/Running/Complete/Error transitions and running-time interaction locks.
- Reusable check/command: `npm run build && npm run test:integration && npm run validate:schema`
- Applicability: Reuse when adding future UI modules before full React/Vite runtime wiring is introduced.
### 2026-02-28 FRD-005-T2-T3
- Situation: UI result/detail flow needed deterministic tab visibility and blocked-run behavior while preserving stable file-id selection and schema-replacement reset semantics.
- Learning: Modeling UI components as pure view-model derivations (summary/list/detail/run-issues) keeps sort/tab/visibility contracts testable without full DOM wiring, and a central reset action prevents stale file selections after schema replacement.
- Action/Decision: Added result/detail/run-issue component models plus `reviewRunStore` transitions (`completeReviewRun`, `selectReviewFile`, `replaceSchemaAndResetRunState`) and integrated helpers through `ReviewRunPage`/`SchemaControlPanel`.
- Reusable check/command: `npm run build && npm run test:integration && npm run validate:schema`
- Applicability: Reuse for subsequent UI tasks where interaction rules are strict but rendering framework wiring is introduced incrementally.

### 2026-02-28 FRD-007-T1
- Situation: First concrete React/Vite runtime bootstrap required both browser entry wiring and explicit dev-server script support while preserving existing TypeScript contract checks.
- Learning: Keeping mount behavior behind `resolveMountElement` + `mountApp` allows controlled missing-root failures for tests while still auto-mounting only when `#app` exists in runtime entry.
- Action/Decision: Added `index.html`, `vite.config.ts`, `src/main.tsx`, `src/App.tsx`, React/Vite deps, and npm scripts (`dev`, `build:app`, `preview`) with integration coverage for bootstrap success/error.
- Reusable check/command: `npm run build && npm run build:app && npm run test:integration && npm run dev -- --help && npm run validate:schema`
- Applicability: Reuse for future browser-runtime bootstraps that need deterministic startup errors and CI-safe validation of both TS and bundler builds.

### 2026-02-28 FRD-007-T2-T3
- Situation: FRD uploads were ignored in React UI wiring even though input `onChange` fired with files present.
- Learning: When storing function-valued state (for example Ajv validator), `setState(fn)` is interpreted as an updater; use `setState(() => fn)` to persist the function value.
- Action/Decision: Updated `setValidator(compiled.validator)` to `setValidator(() => compiled.validator)` in `ReviewRunPage`, restoring FRD processing and DOM lifecycle flows.
- Reusable check/command: `npm run test:integration -- tests/integration/review-run-page-dom.test.tsx`
- Applicability: Reuse anywhere hooks persist callbacks/validators/strategies as state values.
