# Roadmap

- Owner: David
- Status: Approved
- Last Updated: 2026-02-25
- Depends On: [mvp-frd-review-spec.md](./mvp-frd-review-spec.md), [product-vision.md](./product-vision.md)
- Open Questions:
  - Which post-MVP capability has highest ROI: history, export, or AI assistance?

## Planning Model
Roadmap uses milestone phases with explicit exit criteria.

## Committed (MVP)
Milestone: **MVP - FRD Review Core**

Scope:
- Single schema upload and compile.
- Multi-file FRD upload.
- Strict validation with path-based issues.
- Schema-driven readable rendering for valid files.
- Batch summary and per-file details.
- No persistence and no export.

References:
- Validation behavior: [MVP Spec §4](./mvp-frd-review-spec.md#4-validation-behavior)
- Rendering behavior: [MVP Spec §5](./mvp-frd-review-spec.md#5-rendering-behavior)
- Review flow: [MVP Spec §6](./mvp-frd-review-spec.md#6-review-run-flow)
- Failure handling: [MVP Spec §8](./mvp-frd-review-spec.md#8-failure-handling)
- Acceptance criteria: [MVP Spec §10](./mvp-frd-review-spec.md#10-acceptance-criteria)

Exit criteria:
1. All MVP acceptance criteria pass.
2. Unit + integration + e2e smoke tests pass.
3. Documentation is coherent and approved.

## Candidate (Post-MVP)
Milestone: **V1 - Productivity Extensions**

Candidate scope:
- Local review history.
- Export options (Markdown/HTML/PDF).
- Enhanced filtering/sorting of issues.
- Comparison between two FRD versions.
- Multi-draft schema compatibility (for example draft-07 in addition to 2020-12).

Exit criteria:
1. Repeat review workflows become faster for recurring users.
2. Exported artifacts are reliable for sharing outside app.

Milestone: **V2 - Lifecycle Expansion**

Candidate scope:
- AI-assisted issue fix suggestions.
- PRD-to-FRD continuity checks.
- Collaboration workflows and approvals.
- Optional cloud sync/auth.

Exit criteria:
1. Cross-document lifecycle support is measurable in reduced manual review effort.
2. Team workflows can adopt consistent quality gates at scale.

## Deferred Until Further Decision
- Native desktop packaging.
- Multi-schema project registry.
- Rule customization UI for strict vs lenient validation modes.
