import type {
  BatchReviewSummary,
  ReviewResult,
  ReviewRunResult,
  RunIssue,
} from "../../types/reviewContracts";
import { sortReviewResults } from "../../domain/review-run/sortReviewResults";

const EMPTY_SUMMARY: BatchReviewSummary = {
  total: 0,
  passed: 0,
  failed: 0,
  parseFailed: 0,
};

export type ReviewRunStoreState = {
  schemaName: string | null;
  isRunning: boolean;
  hasCompletedRun: boolean;
  runIssues: RunIssue[];
  summary: BatchReviewSummary;
  files: ReviewResult[];
  selectedFileId: string | null;
};

const normalizeSummary = (summary: BatchReviewSummary): BatchReviewSummary => ({
  total: Math.max(0, summary.total),
  passed: Math.max(0, summary.passed),
  failed: Math.max(0, summary.failed),
  parseFailed: Math.max(0, summary.parseFailed),
});

export const createReviewRunStoreState = (schemaName: string | null): ReviewRunStoreState => ({
  schemaName,
  isRunning: false,
  hasCompletedRun: false,
  runIssues: [],
  summary: EMPTY_SUMMARY,
  files: [],
  selectedFileId: null,
});

export const startReviewRun = (state: ReviewRunStoreState): ReviewRunStoreState => ({
  ...state,
  isRunning: true,
});

export const completeReviewRun = (
  state: ReviewRunStoreState,
  result: ReviewRunResult,
): ReviewRunStoreState => {
  const orderedFiles = sortReviewResults(result.files);
  const selectedStillPresent =
    state.selectedFileId !== null && orderedFiles.some((file) => file.id === state.selectedFileId);

  return {
    ...state,
    isRunning: false,
    hasCompletedRun: true,
    runIssues: [...result.runIssues],
    summary: normalizeSummary(result.summary),
    files: orderedFiles,
    selectedFileId: selectedStillPresent ? state.selectedFileId : orderedFiles[0]?.id ?? null,
  };
};

export const selectReviewFile = (
  state: ReviewRunStoreState,
  fileId: string | null,
): ReviewRunStoreState => {
  if (fileId === null) {
    return {
      ...state,
      selectedFileId: null,
    };
  }

  const exists = state.files.some((file) => file.id === fileId);
  return {
    ...state,
    selectedFileId: exists ? fileId : state.selectedFileId,
  };
};

export const replaceSchemaAndResetRunState = (nextSchemaName: string): ReviewRunStoreState => ({
  ...createReviewRunStoreState(nextSchemaName),
});
