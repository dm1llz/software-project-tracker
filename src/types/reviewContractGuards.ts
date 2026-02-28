import type { BatchReviewSummary, ReviewResult, ReviewStatus } from "./reviewContracts";

type ReviewStatusInvariant = {
  parseOk: boolean;
  valid: boolean;
};

const REVIEW_STATUS_INVARIANTS: Record<ReviewStatus, ReviewStatusInvariant> = {
  parse_failed: { parseOk: false, valid: false },
  validation_failed: { parseOk: true, valid: false },
  passed: { parseOk: true, valid: true },
};

export const isStatusInvariantSatisfied = (
  status: ReviewStatus,
  parseOk: boolean,
  valid: boolean,
): boolean => {
  const expected = REVIEW_STATUS_INVARIANTS[status];
  return expected.parseOk === parseOk && expected.valid === valid;
};

export const isSummaryConsistent = (summary: BatchReviewSummary): boolean =>
  summary.total === summary.passed + summary.failed + summary.parseFailed;

export const areReviewResultIssuesConsistent = (result: ReviewResult): boolean =>
  result.issues.every((issue) => issue.fileId === result.id && issue.fileName === result.fileName);

export const areReviewResultSectionsConsistent = (result: ReviewResult): boolean =>
  result.status === "passed" ? Array.isArray(result.sections) : result.sections === undefined;

export const isReviewResultInvariantSatisfied = (result: ReviewResult): boolean =>
  isStatusInvariantSatisfied(result.status, result.parseOk, result.valid) &&
  areReviewResultIssuesConsistent(result) &&
  areReviewResultSectionsConsistent(result);

export const assertReviewResultInvariant = (result: ReviewResult): void => {
  if (!isReviewResultInvariantSatisfied(result)) {
    throw new Error(`ReviewResult invariant violation for fileId=${result.id}`);
  }
};
