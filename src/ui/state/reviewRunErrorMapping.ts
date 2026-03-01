import type { RunIssue } from "../../types/reviewContracts";
import {
  createReviewRunStoreState,
  type ReviewRunStoreState,
} from "./reviewRunStore";

export const mapUnexpectedRunIssue = (error: unknown): RunIssue => ({
  level: "error",
  code: "RUNTIME_ERROR",
  message: `Unexpected runtime failure: ${
    error instanceof Error ? error.message : String(error)
  }`,
});

export const toErrorStoreState = (runIssues: RunIssue[]): ReviewRunStoreState => ({
  ...createReviewRunStoreState(null),
  runIssues,
  hasCompletedRun: false,
  isRunning: false,
});
