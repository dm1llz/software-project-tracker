# Data Contracts

- Owner: David
- Status: Approved
- Last Updated: 2026-02-25
- Depends On: [mvp-frd-review-spec.md](./mvp-frd-review-spec.md)
- Open Questions:
  - Should issue severity include `info` post-MVP?

## Purpose
This document freezes canonical TypeScript contracts for the FRD review run domain. These names are normative across UI and domain modules.

## Type System Standard
- Favor `type` aliases for domain/data contracts.
- Use `interface` only when explicit extension/implementation behavior is required.
- Avoid declaration merging for core FRD contracts to keep schemas and code aligned.

## Canonical Contracts
```ts
export type SchemaBundle = {
  id: string;
  name: string;
  raw: Record<string, unknown>;
  draft: string | null;
};

export type ReviewInputFile = {
  fileName: string;
  text: string;
};

export type ReviewInput = {
  schema: SchemaBundle;
  files: ReviewInputFile[];
};

export type ValidationIssue = {
  level: "error" | "warning";
  fileName: string;
  path: string; // JSON pointer, e.g. "/features/0/name"
  message: string;
  keyword?: string;
};

export type RenderedSectionKind = "object" | "array" | "scalar";

export type RenderedSection = {
  id: string;
  title: string;
  kind: RenderedSectionKind;
  content: unknown; // normalized render model consumed by UI
};

export type ReviewResult = {
  fileName: string;
  parseOk: boolean;
  valid: boolean;
  issues: ValidationIssue[];
  sections?: RenderedSection[];
};

export type BatchReviewSummary = {
  total: number;
  passed: number;
  failed: number;
  parseFailed: number;
};
```

## Contract Rules
- `fileName` must always refer to the original uploaded file label.
- `path` must be JSON pointer format where available.
- `parseOk=false` implies `valid=false`.
- `sections` are present only for valid parsed files.
- `BatchReviewSummary.total` must equal total uploaded FRD files in review run.
- Accepted schema draft for MVP is `2020-12` only.
- When `$schema` is absent, the system assumes `2020-12` in MVP.
- Any non-`2020-12` `$schema` must fail before FRD validation starts.

## Mapping Guidance
- Parse errors are represented as `ValidationIssue` with `level="error"` and best-effort `path`.
- Schema validation issues map from validator output with `keyword` when available.
- Rendered section shape remains internal but must preserve FRD semantics.

## Traceability
- Review run behavior: [MVP Spec §6](./mvp-frd-review-spec.md#6-review-run-flow)
- Failure handling: [MVP Spec §8](./mvp-frd-review-spec.md#8-failure-handling)
- Acceptance criteria: [MVP Spec §10](./mvp-frd-review-spec.md#10-acceptance-criteria)
