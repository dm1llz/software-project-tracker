import { assertReviewResultInvariant, isSummaryConsistent } from "../../types/reviewContractGuards";
import type { BatchReviewSummary, ReviewResult } from "../../types/reviewContracts";

export const summarizeBatchReview = (results: readonly ReviewResult[]): BatchReviewSummary => {
  let passed = 0;
  let failed = 0;
  let parseFailed = 0;

  for (const result of results) {
    assertReviewResultInvariant(result);
    if (result.status === "passed") {
      passed += 1;
    } else if (result.status === "validation_failed") {
      failed += 1;
    } else if (result.status === "parse_failed") {
      parseFailed += 1;
    }
  }

  const summary: BatchReviewSummary = {
    total: results.length,
    passed,
    failed,
    parseFailed,
  };

  if (!isSummaryConsistent(summary)) {
    throw new Error("BatchReviewSummary invariant violation: total must equal passed+failed+parseFailed.");
  }

  return summary;
};
