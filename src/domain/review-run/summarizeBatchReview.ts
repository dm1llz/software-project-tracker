import { assertReviewResultInvariant, isSummaryConsistent } from "../../types/reviewContractGuards";
import type { BatchReviewSummary, ReviewResult } from "../../types/reviewContracts";

export const summarizeBatchReview = (results: readonly ReviewResult[]): BatchReviewSummary => {
  for (const result of results) {
    assertReviewResultInvariant(result);
  }

  const summary: BatchReviewSummary = {
    total: results.length,
    passed: results.filter((result) => result.status === "passed").length,
    failed: results.filter((result) => result.status === "validation_failed").length,
    parseFailed: results.filter((result) => result.status === "parse_failed").length,
  };

  if (!isSummaryConsistent(summary)) {
    throw new Error("BatchReviewSummary invariant violation: total must equal passed+failed+parseFailed.");
  }

  return summary;
};
