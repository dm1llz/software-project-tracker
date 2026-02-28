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
