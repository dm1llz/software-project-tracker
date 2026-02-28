import type { RunIssue } from "../../types/reviewContracts";

export type RunIssueRow = {
  code: RunIssue["code"];
  category: "schema" | "runtime";
  message: string;
  path: string | null;
  line: number | null;
  column: number | null;
};

export type RunIssuePanelModel = {
  visible: boolean;
  rows: RunIssueRow[];
};

const toCategory = (code: RunIssue["code"]): RunIssueRow["category"] => {
  switch (code) {
    case "RUNTIME_ERROR":
      return "runtime";
    case "SCHEMA_ERROR":
      return "schema";
    default: {
      const exhaustive: never = code;
      throw new Error(`Unhandled run issue code: ${exhaustive}`);
    }
  }
};

export const deriveRunIssuePanelModel = (runIssues: readonly RunIssue[]): RunIssuePanelModel => ({
  visible: runIssues.length > 0,
  rows: runIssues.map((issue) => ({
    code: issue.code,
    category: toCategory(issue.code),
    message: issue.message,
    path: issue.path ?? null,
    line: issue.line ?? null,
    column: issue.column ?? null,
  })),
});
