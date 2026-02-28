import type { ReviewResult, ReviewStatus } from "../../types/reviewContracts";

const STATUS_PRIORITY: Record<ReviewStatus, number> = {
  parse_failed: 0,
  validation_failed: 1,
  passed: 2,
};

export const compareReviewResults = (left: ReviewResult, right: ReviewResult): number => {
  const statusPriorityDelta = STATUS_PRIORITY[left.status] - STATUS_PRIORITY[right.status];
  if (statusPriorityDelta !== 0) {
    return statusPriorityDelta;
  }

  const uploadIndexDelta = left.uploadIndex - right.uploadIndex;
  if (uploadIndexDelta !== 0) {
    return uploadIndexDelta;
  }

  return left.id.localeCompare(right.id);
};

export const sortReviewResults = (results: readonly ReviewResult[]): ReviewResult[] =>
  [...results].sort(compareReviewResults);
