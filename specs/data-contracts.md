# Data Contracts

- Owner: David
- Status: Draft
- Last Updated: 2026-02-25
- Depends On: [mvp-frd-review-spec.md](./mvp-frd-review-spec.md)
- Open Questions:
  - Should issue severity include `info` post-MVP?

## Purpose
This document freezes canonical TypeScript contracts for the FRD review run domain. These names are normative across UI and domain modules.

## Canonical Contracts
```ts
export interface SchemaBundle {
  id: string;
  name: string;
  raw: Record<string, unknown>;
  draft: string | null;
}

export interface ReviewInputFile {
  fileName: string;
  text: string;
}

export interface ReviewInput {
  schema: SchemaBundle;
  files: ReviewInputFile[];
}

export interface ValidationIssue {
  level: "error" | "warning";
  fileName: string;
  path: string; // JSON pointer, e.g. "/features/0/name"
  message: string;
  keyword?: string;
}

export type RenderedSectionKind = "object" | "array" | "scalar";

export interface RenderedSection {
  id: string;
  title: string;
  kind: RenderedSectionKind;
  content: unknown; // normalized render model consumed by UI
}

export interface ReviewResult {
  fileName: string;
  parseOk: boolean;
  valid: boolean;
  issues: ValidationIssue[];
  sections?: RenderedSection[];
}

export interface BatchReviewSummary {
  total: number;
  passed: number;
  failed: number;
  parseFailed: number;
}
```

## Contract Rules
- `fileName` must always refer to the original uploaded file label.
- `path` must be JSON pointer format where available.
- `parseOk=false` implies `valid=false`.
- `sections` are present only for valid parsed files.
- `BatchReviewSummary.total` must equal total uploaded FRD files in review run.

## Mapping Guidance
- Parse errors are represented as `ValidationIssue` with `level="error"` and best-effort `path`.
- Schema validation issues map from validator output with `keyword` when available.
- Rendered section shape remains internal but must preserve FRD semantics.

## Traceability
- Review run behavior: [MVP Spec §6](./mvp-frd-review-spec.md#6-review-run-flow)
- Failure handling: [MVP Spec §8](./mvp-frd-review-spec.md#8-failure-handling)
- Acceptance criteria: [MVP Spec §10](./mvp-frd-review-spec.md#10-acceptance-criteria)
