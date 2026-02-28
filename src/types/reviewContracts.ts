export type SupportedSchemaDraft = "2020-12";

export type SchemaBundle = {
  id: string;
  name: string;
  raw: Record<string, unknown>;
  declaredDraft: string | null;
  effectiveDraft: SupportedSchemaDraft;
};

export type ReviewInputFile = {
  id: string;
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
  path?: string;
  line?: number;
  column?: number;
};

export type FileIssue = {
  fileId: string;
  level: IssueLevel;
  code: FileIssueCode;
  fileName: string;
  path: string;
  line?: number;
  column?: number;
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
  id: string;
  uploadIndex: number;
  fileName: string;
  displayName: string;
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
