import type { ReviewResult, ReviewStatus } from "../../types/reviewContracts";

const STATUS_PRIORITY: Record<ReviewStatus, number> = {
  parse_failed: 0,
  validation_failed: 1,
  passed: 2,
};

export const compareReviewStatusPriority = (
  left: ReviewStatus,
  right: ReviewStatus,
): number => STATUS_PRIORITY[left] - STATUS_PRIORITY[right];

export const compareReviewResults = (left: ReviewResult, right: ReviewResult): number => {
  const statusPriorityDelta = compareReviewStatusPriority(left.status, right.status);
  if (statusPriorityDelta !== 0) {
    return statusPriorityDelta;
  }

  return left.uploadIndex - right.uploadIndex;
};

export const sortReviewResults = (results: readonly ReviewResult[]): ReviewResult[] =>
  [...results].sort(compareReviewResults);
