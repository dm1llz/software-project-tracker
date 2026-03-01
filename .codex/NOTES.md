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

### 2026-02-28 FRD-006-T1
- Situation: Unit/integration script scoping was ambiguous once shared Vitest config was introduced, and Vitest CLI accepts only a single `--dir` value.
- Learning: For deterministic scope separation, chain two Vitest invocations in `test:unit` (one per directory) and keep `test:integration` on a dedicated `--dir` target.
- Action/Decision: Added `vitest.config.ts` + setup file and updated npm scripts so unit runs `src/domain` then `tests/unit`, while integration runs only `tests/integration`.
- Reusable check/command: `npm run test:unit && npm run test:integration`
- Applicability: Reuse whenever mixed test layouts need strict CI partitioning without introducing a Vitest workspace.

### 2026-02-28 FRD-006-T2-T3
- Situation: New integration tests were created under `src/**` (included in `tsc --noEmit`) and initially used Node `fs/path` imports that failed without Node ambient types.
- Learning: For fixture-backed tests inside `src/**`, using Vite `?raw` fixture imports plus a local `declare module "*?raw"` keeps strict TypeScript builds green without introducing `@types/node`.
- Action/Decision: Switched integration fixture loading to raw-module imports, added `src/types/vite-raw-modules.d.ts`, and updated `tsconfig` include to cover `.d.ts` declarations.
- Reusable check/command: `npm run build && npx vitest run --config vitest.config.ts src/domain/review-run/__tests__/reviewRun.integration.test.ts src/infra/workers/__tests__/workerFallback.integration.test.ts`
- Applicability: Reuse whenever browser-oriented repos keep `src/**` tests type-checked but avoid Node type dependencies.

### 2026-02-28 FRD-008-T1
- Situation: Tailwind setup task required classic Tailwind/PostCSS config files (`tailwind.config.ts` + `postcss.config.cjs`) and immediate compatibility with existing Vite 5 pipeline.
- Learning: Pinning Tailwind to `3.4.x` preserves expected `@tailwind` directive + PostCSS plugin flow without adopting Tailwind v4 config changes mid-stream.
- Action/Decision: Installed `tailwindcss@3.4.17`, `postcss`, and `autoprefixer`, added config files, and imported `src/styles/tailwind.css` in `src/main.tsx`.
- Reusable check/command: `npm run build && npm run build:app && npm run dev -- --host 127.0.0.1 --port 4173 --strictPort`
- Applicability: Reuse for future Tailwind baseline tasks in this repo until a deliberate v4 migration is planned.

### 2026-02-28 FRD-008-T2-T3
- Situation: Styling schema upload controls by adding helper text inside `<label>` blocks caused `getByLabelText("Schema file")` integration checks to fail due to changed accessible label text.
- Learning: When integration tests use exact label text, keep helper copy outside label text path or add explicit `aria-label` on the form controls to preserve query stability.
- Action/Decision: Added explicit `aria-label` values for schema/FRD/replace file inputs and retained existing control names while applying Tailwind styling/layout.
- Reusable check/command: `npm run test:integration -- tests/integration/review-run-page-dom.test.tsx`
- Applicability: Reuse whenever UI styling refactors touch labeled form controls used by accessibility-driven tests.

### 2026-02-28 FRD-009-T1
- Situation: Baseline profiling needed a single reproducible command without introducing TypeScript runtime tooling for script execution.
- Learning: A plain Node `.mjs` profiler that uses Ajv directly and fixture-backed scenarios (success/error/large-batch) is enough to capture repeatable benchmark baselines while staying toolchain-neutral.
- Action/Decision: Added `scripts/profile-review-run.mjs`, npm script `profile:review-run`, and baseline documentation with measured scenario metrics.
- Reusable check/command: `npm run profile:review-run && cat .codex/pr/profile-review-run.json`
- Applicability: Reuse for future benchmark gates where we need deterministic local profiling with minimal dependencies.

### 2026-02-28 FRD-009-T2-T3
- Situation: Refactoring `ReviewRunPage` orchestration while preserving stale-request guards and schema-replacement semantics required minimizing behavioral drift across many interaction paths.
- Learning: Moving request-version guards and runtime error mapping into dedicated helpers/hooks, then batching progress updates (for example every 5 files + final flush), reduces render churn without changing result contracts.
- Action/Decision: Added `useReviewRunController` with extracted request/screen/error helpers, introduced `RUNTIME_ERROR` run-issue code for unexpected orchestration failures, parallelized FRD source reads with deterministic output order, and memoized file/result rendering boundaries.
- Reusable check/command: `npm run build && npm run test:integration && npm run profile:review-run`
- Applicability: Reuse for future UI-controller refactors where behavior parity and performance improvements must be demonstrated together.

### 2026-02-28 FRD-010-T1
- Situation: Runtime FRD-processing exceptions and schema-upload exceptions were both funneled through one blocking error-state path, which incorrectly forced schema re-upload after run-level failures.
- Learning: Treat run-level runtime errors as recoverable when a schema is loaded (preserve schema runtime refs + mark run non-blocking), while schema-upload exceptions must clear schema refs and reset to blocked-until-valid-schema behavior.
- Action/Decision: Added explicit schema-upload vs recoverable-run error store mapping, preserved `schemaBundle`/`validator` on FRD runtime failures, and cleared them in schema-upload catch handling.
- Reusable check/command: `npm run test:integration -- tests/integration/review-run-page-dom.test.tsx tests/integration/review-run-controller-recovery.test.tsx`
- Applicability: Reuse when separating blocking schema intake failures from retryable run-processing failures in UI controllers.

### 2026-02-28 FRD-010-T2
- Situation: Parse/validate/render/result assembly logic diverged between `executeReviewRun` and the UI controller, making behavior-parity changes high risk.
- Learning: A shared batch processor with optional concurrency, progress callbacks, and cancellation checks can consolidate orchestration while preserving deterministic output ordering and read-failure mapping semantics.
- Action/Decision: Added `processReviewRunBatch` and routed both `executeReviewRun` and `useReviewRunController` through it; kept controller request-version safety by passing `shouldContinue` and guarded progress callbacks.
- Reusable check/command: `npm run test:unit && npm run test:integration && npm run build`
- Applicability: Reuse when domain and UI entrypoints need identical review-run semantics without duplicated orchestration logic.

### 2026-02-28 FRD-010-T3
- Situation: Request-version race behavior needed deterministic integration coverage for overlapping schema and FRD uploads without introducing new controller dependencies.
- Learning: Overriding `File.text()` with deferred Promises in jsdom tests provides deterministic control over upload completion order and reliably reproduces stale-request completion paths.
- Action/Decision: Added `review-run-request-race` integration cases for latest-schema-wins, stale-failure ignored, and overlapping FRD uploads with latest-only progress/results assertions.
- Reusable check/command: `npm run test:integration -- tests/integration/review-run-request-race.test.tsx tests/integration/review-run-page-dom.test.tsx tests/integration/review-run-processing.test.ts`
- Applicability: Reuse for future async race/cancellation tests where request ordering and stale completion guards must be proven.

### 2026-02-28 FRD-010-T4
- Situation: Integration output was noisy with React act-environment warnings and lacked explicit assertions on mixed-array runtime-render failure details.
- Learning: Setting `IS_REACT_ACT_ENVIRONMENT` in global test setup removes environment-misconfiguration warnings; explicit DOM assertions on `RUNTIME_ERROR` plus mixed-array path messaging make runtime-retry behavior clearer.
- Action/Decision: Updated `src/test/setupTests.ts` to set React act environment and expanded runtime failure/retry coverage in DOM + nested-render integration tests.
- Reusable check/command: `npm run test:integration > /tmp/t4-full.log 2>&1 && rg -n "current testing environment is not configured" /tmp/t4-full.log`
- Applicability: Reuse when hardening React/Vitest signal quality and adding explicit runtime-failure recovery assertions.

### 2026-02-28 FRD-011-T2
- Situation: Schema choose/replace controls were split across separate file inputs, which bypassed a single-source replacement flow and made cancel-safe reset behavior harder to enforce.
- Learning: Driving both initial schema upload and replacement through one schema input plus a pre-upload confirmation gate preserves prior run state on cancel while keeping controller reset semantics unchanged for confirmed replacements.
- Action/Decision: Unified schema control CTA/copy (`Choose schema` -> `Replace schema`), removed the dedicated replace input, and added integration coverage for confirm, cancel, and running-disabled replacement attempts.
- Reusable check/command: `npm run test:integration -- tests/integration/review-run-page-dom.test.tsx`
- Applicability: Reuse when consolidating multi-step file workflows where replacement must be explicit and non-destructive on cancel.

### 2026-02-28 FRD-011-T3
- Situation: File navigation initially rendered as a separate panel below intake controls, which split upload and file-selection workflows across different regions.
- Learning: Passing the file-list view as an inline slot into the schema/intake panel preserves one canonical selector while keeping accessibility role queries stable (`region` + `aria-label="File results"`).
- Action/Decision: Added `fileListContent` slot support in `SchemaControlPanel`, introduced `FileResultListView` inline variant styling, and moved file-list rendering from `ReviewRunPage` into the intake control column with updated integration/e2e coverage.
- Reusable check/command: `npm run test:integration -- tests/integration/review-run-page-dom.test.tsx && npm run test:e2e -- tests/e2e/review-run-smoke.spec.ts`
- Applicability: Reuse when relocating existing interactive regions without breaking selection semantics or accessibility-driven test locators.
