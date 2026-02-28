import type { RunIssue } from "../../types/reviewContracts";

export type RunIssueInput = {
  message: string;
  path?: string;
  line?: number;
  column?: number;
};

export const mapRunIssue = (input: RunIssueInput): RunIssue => ({
  level: "error",
  code: "SCHEMA_ERROR",
  message: input.message,
  ...(input.path === undefined ? {} : { path: input.path }),
  ...(input.line === undefined ? {} : { line: input.line }),
  ...(input.column === undefined ? {} : { column: input.column }),
});
