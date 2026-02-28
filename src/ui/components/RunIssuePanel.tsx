import type { RunIssue } from "../../types/reviewContracts";

export type RunIssueRow = {
  code: RunIssue["code"];
  message: string;
  path: string | null;
  line: number | null;
  column: number | null;
};

export type RunIssuePanelModel = {
  visible: boolean;
  rows: RunIssueRow[];
};

export const deriveRunIssuePanelModel = (runIssues: readonly RunIssue[]): RunIssuePanelModel => ({
  visible: runIssues.length > 0,
  rows: runIssues.map((issue) => ({
    code: issue.code,
    message: issue.message,
    path: issue.path ?? null,
    line: issue.line ?? null,
    column: issue.column ?? null,
  })),
});
