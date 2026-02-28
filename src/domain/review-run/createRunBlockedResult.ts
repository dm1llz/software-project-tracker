import type { ReviewRunResult, RunIssue } from "../../types/reviewContracts";

export const createRunBlockedResult = (runIssues: readonly RunIssue[]): ReviewRunResult => ({
  runIssues: [...runIssues],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    parseFailed: 0,
  },
  files: [],
});
