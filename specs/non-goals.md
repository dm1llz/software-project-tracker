# Non-Goals

- Owner: David
- Status: Approved
- Last Updated: 2026-02-25
- Depends On: [mvp-frd-review-spec.md](./mvp-frd-review-spec.md), [roadmap.md](./roadmap.md)
- Open Questions:
  - None currently.

## Purpose
Prevent scope creep by explicitly listing decisions that are out of scope for MVP.

## Explicit Non-Goals for MVP
1. No AI-generated corrections or rewriting of FRD JSON.
2. No cloud storage, team accounts, or authentication.
3. No persistence of review runs after page reload.
4. No export features (Markdown, HTML, PDF).
5. No workflow approval states or task management.
6. No plugin ecosystem or extension APIs.
7. No native desktop packaging in MVP.
8. No multi-schema registry management UI.
9. No support for legacy JSON Schema drafts (for example draft-07 or draft-06).

## Guardrails for Decision-Making
- If a feature requires backend infrastructure, it is post-MVP by default.
- If a feature modifies FRD semantics automatically, it is post-MVP by default.
- If a feature does not improve core review run quality or readability, defer it.

## Revisit Triggers
- Multiple users request sharing/export repeatedly.
- Review run repetition makes session-only behavior inefficient.
- Teams require integrated governance workflows.

## Related Documents
- Baseline MVP scope: [mvp-frd-review-spec.md](./mvp-frd-review-spec.md)
- Phase expansion plan: [roadmap.md](./roadmap.md)
