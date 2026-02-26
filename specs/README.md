# Specs Index

- Owner: David
- Status: Approved
- Last Updated: 2026-02-25
- Depends On: None
- Open Questions:
  - None currently.

## Purpose
This folder defines the product and technical baseline for the FRD review application before implementation starts.

## Document Index
| Document | Purpose | Status |
| --- | --- | --- |
| [product-vision.md](./product-vision.md) | Product mission, users, problems, success metrics, principles | Approved |
| [mvp-frd-review-spec.md](./mvp-frd-review-spec.md) | MVP behavior, scope, acceptance criteria, and failure handling | Approved |
| [architecture-overview.md](./architecture-overview.md) | Vite/React/TypeScript architecture, module boundaries, data flow | Approved |
| [data-contracts.md](./data-contracts.md) | Canonical interfaces/types for schema review pipeline | Approved |
| [ux-review-flow.md](./ux-review-flow.md) | Screen-by-screen review run UX and UI states | Approved |
| [roadmap.md](./roadmap.md) | Milestones and post-MVP delivery plan | Approved |
| [non-goals.md](./non-goals.md) | Explicit out-of-scope boundaries | Approved |

## FRD Package
Machine-consumable MVP FRD artifacts are located in `./frds/`.

| File | Purpose |
| --- | --- |
| [frds/frd-schema.json](./frds/frd-schema.json) | Canonical JSON Schema for FRD authoring and validation |
| [frds/index.json](./frds/index.json) | Manifest listing FRD order, dependencies, and file paths |
| [frds/frd-001-foundation-contracts.json](./frds/frd-001-foundation-contracts.json) | Foundation module boundaries, canonical contracts, deterministic utilities |
| [frds/frd-002-schema-intake-validation.json](./frds/frd-002-schema-intake-validation.json) | Schema ingestion, strict compile, draft enforcement, run-level schema issues |
| [frds/frd-003-batch-review-pipeline.json](./frds/frd-003-batch-review-pipeline.json) | Multi-file ingestion, parse/validate pipeline, summary invariants |
| [frds/frd-004-rendering-engine.json](./frds/frd-004-rendering-engine.json) | Schema-driven readable rendering model and semantic preservation |
| [frds/frd-005-ui-review-flow.json](./frds/frd-005-ui-review-flow.json) | Review states, results views, run-issue panel, reset behavior |
| [frds/frd-006-quality-performance.json](./frds/frd-006-quality-performance.json) | Unit/integration/e2e smoke requirements, worker fallback, responsiveness |

## Reading Order
1. [product-vision.md](./product-vision.md)
2. [mvp-frd-review-spec.md](./mvp-frd-review-spec.md)
3. [data-contracts.md](./data-contracts.md)
4. [architecture-overview.md](./architecture-overview.md)
5. [ux-review-flow.md](./ux-review-flow.md)
6. [roadmap.md](./roadmap.md)
7. [non-goals.md](./non-goals.md)

## Implementation Start Order
1. MVP functional behavior: [mvp-frd-review-spec.md](./mvp-frd-review-spec.md)
2. Type contracts and validation mapping: [data-contracts.md](./data-contracts.md)
3. Architecture and module boundaries: [architecture-overview.md](./architecture-overview.md)
4. UI sequencing and states: [ux-review-flow.md](./ux-review-flow.md)
5. Delivery sequencing: [roadmap.md](./roadmap.md)

## Canonical Terminology
- FRD: Feature Requirements Document represented as JSON.
- schema: JSON Schema used to validate FRD JSON.
- review run: One execution that validates one schema against one or more FRD files.
- run issue: A schema-level finding associated with the review run.
- file issue: A parse or validation finding associated with one FRD file.

## Review Checklist
- All docs include metadata headers.
- Terminology is consistent with this index.
- Roadmap references concrete MVP spec sections.
- Non-goals are explicit enough to prevent scope creep.
