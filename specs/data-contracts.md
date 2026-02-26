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
export type SupportedSchemaDraft = "2020-12";

export type SchemaBundle = {
  id: string;
  name: string;
  raw: Record<string, unknown>;
  declaredDraft: string | null;
  effectiveDraft: SupportedSchemaDraft;
};

export type ReviewInputFile = {
  id: string; // stable identifier for this file in the current review run
  fileName: string;
  uploadIndex: number;
  text: string;
};

export type ReviewInput = {
  schema: SchemaBundle;
  files: ReviewInputFile[];
};

export type IssueLevel = "error" | "warning";

export type ValidationIssueCode =
  | "PARSE_ERROR"
  | "VALIDATION_ERROR"
  | "SCHEMA_ERROR";

export type ValidationIssue = {
  fileId: string;
  level: IssueLevel;
  code: ValidationIssueCode;
  fileName: string;
  path: string; // JSON pointer, e.g. "/features/0/name"
  message: string;
  keyword?: string;
};

export type RenderedSectionKind = "object" | "array" | "scalar";

export type RenderedScalarValue = string | number | boolean | null;

export type RenderedObjectField = {
  key: string;
  label: string;
  path: string;
  value: RenderedScalarValue | RenderedScalarValue[];
  description?: string;
};

export type RenderedObjectContent = {
  fields: RenderedObjectField[];
};

export type RenderedArrayScalarContent = {
  itemKind: "scalar";
  items: RenderedScalarValue[];
};

export type RenderedArrayObjectItem = {
  id: string;
  title: string;
  fields: RenderedObjectField[];
};

export type RenderedArrayObjectContent = {
  itemKind: "object";
  items: RenderedArrayObjectItem[];
};

export type RenderedSectionBase = {
  id: string;
  title: string;
  path: string;
};

export type RenderedSection =
  | (RenderedSectionBase & {
      kind: "scalar";
      content: { value: RenderedScalarValue };
    })
  | (RenderedSectionBase & {
      kind: "object";
      content: RenderedObjectContent;
    })
  | (RenderedSectionBase & {
      kind: "array";
      content: RenderedArrayScalarContent | RenderedArrayObjectContent;
    });

export type ReviewStatus = "parse_failed" | "validation_failed" | "passed";

export type ReviewResult = {
  id: string; // carries ReviewInputFile.id through the pipeline
  uploadIndex: number;
  fileName: string;
  displayName: string; // disambiguated label shown in UI for duplicate file names
  status: ReviewStatus;
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
- `id` on `ReviewInputFile`/`ReviewResult` is the primary file identifier and must be unique per review run.
- `uploadIndex` is 0-based and preserves ingestion order.
- `fileName` must always refer to the original uploaded file label.
- `displayName` is the user-facing label and is used to disambiguate duplicate file names.
- `path` must be JSON pointer format where available.
- `parseOk=false` implies `valid=false`.
- `status="parse_failed"` implies `parseOk=false` and `valid=false`.
- `status="validation_failed"` implies `parseOk=true` and `valid=false`.
- `status="passed"` implies `parseOk=true` and `valid=true`.
- `sections` are present only when `status="passed"`.
- `BatchReviewSummary.total` must equal total uploaded FRD files in review run.
- Accepted schema draft for MVP is `2020-12` only.
- When `$schema` is absent, the system assumes `2020-12` in MVP.
- Any non-`2020-12` `$schema` must fail before FRD validation starts.
- MVP sorting for result lists is deterministic: `parse_failed`, then `validation_failed`, then `passed`, each by `uploadIndex`.
- MVP supports issue levels `error` and `warning`; if the validator emits warnings, the UI must display them.
- Field order in rendered sections should follow schema property order when available, otherwise source JSON key order.

## Mapping Guidance
- Parse errors are represented as `ValidationIssue` with `code="PARSE_ERROR"` and `level="error"`.
- Schema validation issues map from validator output with `code="VALIDATION_ERROR"` and `keyword` when available.
- Schema load/compile problems map to `code="SCHEMA_ERROR"` and block the review run.
- Warnings are non-blocking; files with warnings and no errors remain `status="passed"`.

## Traceability
- Review run behavior: [MVP Spec §6](./mvp-frd-review-spec.md#6-review-run-flow)
- Failure handling: [MVP Spec §8](./mvp-frd-review-spec.md#8-failure-handling)
- Acceptance criteria: [MVP Spec §10](./mvp-frd-review-spec.md#10-acceptance-criteria)
