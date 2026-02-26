# Data Contracts

- Owner: David
- Status: Approved
- Last Updated: 2026-02-25
- Depends On: [mvp-frd-review-spec.md](./mvp-frd-review-spec.md)
- Open Questions:
  - None blocking for MVP.
  - Post-MVP backlog: Should issue severity include `info`.

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

export type FileIssueCode = "PARSE_ERROR" | "VALIDATION_ERROR";

export type RunIssueCode = "SCHEMA_ERROR";

export type RunIssue = {
  level: "error";
  code: RunIssueCode;
  message: string;
  path?: string; // schema JSON pointer when available
  line?: number; // 1-based when available
  column?: number; // 1-based when available
};

export type FileIssue = {
  fileId: string;
  level: IssueLevel;
  code: FileIssueCode;
  fileName: string;
  path: string; // JSON pointer. Use "/" for document-level parse errors.
  line?: number; // 1-based when available
  column?: number; // 1-based when available
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
  issues: FileIssue[];
  sections?: RenderedSection[];
};

export type BatchReviewSummary = {
  total: number;
  passed: number;
  failed: number;
  parseFailed: number;
};

export type ReviewRunResult = {
  runIssues: RunIssue[];
  summary: BatchReviewSummary;
  files: ReviewResult[];
};
```

## Contract Rules
- `RunIssue` is for review-run-level schema failures; it is not tied to a file.
- `FileIssue` is for FRD file parse/validation findings.
- `id` on `ReviewInputFile`/`ReviewResult` is the primary file identifier and must be unique per review run.
- `uploadIndex` is 0-based and preserves ingestion order.
- `fileName` must always refer to the original uploaded file label.
- `displayName` is the user-facing label and is used to disambiguate duplicate file names.
- For every `FileIssue` in a `ReviewResult`, `FileIssue.fileId` must equal `ReviewResult.id`.
- For every `FileIssue` in a `ReviewResult`, `FileIssue.fileName` must equal `ReviewResult.fileName`.
- `path` must be JSON pointer format where available.
- For document-level parse errors where no pointer exists, use `path="/"`.
- `line` and `column` are optional but should be included for parse/schema errors when parser output provides them.
- `parseOk=false` implies `valid=false`.
- `status="parse_failed"` implies `parseOk=false` and `valid=false`.
- `status="validation_failed"` implies `parseOk=true` and `valid=false`.
- `status="passed"` implies `parseOk=true` and `valid=true`.
- `sections` are present only when `status="passed"`.
- `BatchReviewSummary.total` must equal total uploaded FRD files in review run.
- `BatchReviewSummary.failed` counts only `status="validation_failed"` files.
- `BatchReviewSummary.parseFailed` counts only `status="parse_failed"` files.
- `BatchReviewSummary.passed` counts only `status="passed"` files.
- `BatchReviewSummary.total = passed + failed + parseFailed`.
- If review run is blocked before FRD file processing (for example schema parse/compile/draft failure):
  - `files=[]`
  - `summary={ total: 0, passed: 0, failed: 0, parseFailed: 0 }`
  - `runIssues` contains one or more `RunIssue` entries.
- Accepted schema draft for MVP is `2020-12` only.
- When `$schema` is absent, the system assumes `2020-12` in MVP.
- Any non-`2020-12` `$schema` must fail before FRD validation starts.
- MVP sorting for result lists is deterministic: `parse_failed`, then `validation_failed`, then `passed`, each by `uploadIndex`.
- MVP supports issue levels `error` and `warning`.
- Warning ingestion is source-driven: only non-fatal diagnostics emitted by validator/parsing layers are mapped to `level="warning"`.
- If no diagnostics source emits warnings, issue output is `error`-only and remains MVP-compliant.
- Field order in rendered sections should follow schema property order when available, otherwise source JSON key order.

## Mapping Guidance
- Parse errors are represented as `FileIssue` with `code="PARSE_ERROR"` and `level="error"`, with `line`/`column` when available.
- Schema validation issues map from validator output to `FileIssue` with `code="VALIDATION_ERROR"` and `keyword` when available.
- Schema load/compile/draft problems map to `RunIssue` with `code="SCHEMA_ERROR"` and block the review run.
- Warnings are non-blocking; files with warnings and no errors remain `status="passed"`.

## Traceability
- Review run behavior: [MVP Spec §6](./mvp-frd-review-spec.md#6-review-run-flow)
- Failure handling: [MVP Spec §8](./mvp-frd-review-spec.md#8-failure-handling)
- Acceptance criteria: [MVP Spec §10](./mvp-frd-review-spec.md#10-acceptance-criteria)
