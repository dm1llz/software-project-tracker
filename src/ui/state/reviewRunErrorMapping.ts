import type { RunIssue } from "../../types/reviewContracts";
import {
  createErrorReviewRunStoreState,
  type ReviewRunStoreState,
} from "./reviewRunStore";

export const mapUnexpectedRunIssue = (error: unknown): RunIssue => ({
  level: "error",
  code: "RUNTIME_ERROR",
  message: `Unexpected runtime failure: ${
    error instanceof Error ? error.message : String(error)
  }`,
});

export const toSchemaUploadErrorStoreState = (
  runIssues: RunIssue[],
): ReviewRunStoreState =>
  createErrorReviewRunStoreState({
    schemaName: null,
    runIssues,
    hasCompletedRun: false,
  });

export const toRecoverableRunErrorStoreState = (
  schemaName: string | null,
  runIssues: RunIssue[],
): ReviewRunStoreState =>
  createErrorReviewRunStoreState({
    schemaName,
    runIssues,
    hasCompletedRun: schemaName !== null,
  });
