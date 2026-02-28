import type { FileIssue } from "../../types/reviewContracts";

export type FileIssueRow = {
  level: FileIssue["level"];
  code: FileIssue["code"];
  path: string;
  line: number | null;
  column: number | null;
  message: string;
  keyword: string | null;
};

export type FileIssueTableModel = {
  rows: FileIssueRow[];
};

export const deriveFileIssueTableModel = (issues: readonly FileIssue[]): FileIssueTableModel => ({
  rows: issues.map((issue) => ({
    level: issue.level,
    code: issue.code,
    path: issue.path,
    line: issue.line ?? null,
    column: issue.column ?? null,
    message: issue.message,
    keyword: issue.keyword ?? null,
  })),
});
