import type { RunIssue } from "../../types/reviewContracts";

export type ReviewScreenState = "empty" | "ready" | "running" | "complete" | "error";

export type DeriveScreenStateInput = {
  schemaLoaded: boolean;
  isRunning: boolean;
  hasCompletedRun: boolean;
  runIssues: RunIssue[];
};

export const deriveScreenState = ({
  schemaLoaded,
  isRunning,
  hasCompletedRun,
  runIssues,
}: DeriveScreenStateInput): ReviewScreenState => {
  if (isRunning) {
    return "running";
  }

  if (runIssues.length > 0 && !hasCompletedRun) {
    return "error";
  }

  if (!schemaLoaded) {
    return "empty";
  }

  if (hasCompletedRun) {
    return "complete";
  }

  return "ready";
};
