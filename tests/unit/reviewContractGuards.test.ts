import { describe, expect, it } from "vitest";

import {
  assertReviewResultInvariant,
  isReviewResultInvariantSatisfied,
  isStatusInvariantSatisfied,
  isSummaryConsistent,
} from "../../src/types/reviewContractGuards";
import type { BatchReviewSummary, ReviewResult } from "../../src/types/reviewContracts";

const baseResult: ReviewResult = {
  id: "file-1",
  uploadIndex: 0,
  fileName: "one.json",
  displayName: "one.json",
  status: "parse_failed",
  parseOk: false,
  valid: false,
  issues: [
    {
      fileId: "file-1",
      level: "error",
      code: "PARSE_ERROR",
      fileName: "one.json",
      path: "/",
      message: "invalid json",
    },
  ],
};

describe("review contract guards", () => {
  it("accepts parse_failed only when parseOk=false and valid=false", () => {
    expect(isStatusInvariantSatisfied("parse_failed", false, false)).toBe(true);
    expect(isReviewResultInvariantSatisfied(baseResult)).toBe(true);
  });

  it("rejects passed paired with valid=false", () => {
    const invalid: ReviewResult = {
      ...baseResult,
      status: "passed",
      parseOk: true,
      valid: false,
      sections: [],
    };

    expect(isStatusInvariantSatisfied("passed", true, false)).toBe(false);
    expect(() => assertReviewResultInvariant(invalid)).toThrow(/invariant violation/i);
  });

  it("enforces summary equation total=passed+failed+parseFailed", () => {
    const validSummary: BatchReviewSummary = {
      total: 3,
      passed: 1,
      failed: 1,
      parseFailed: 1,
    };
    const invalidSummary: BatchReviewSummary = {
      ...validSummary,
      total: 2,
    };

    expect(isSummaryConsistent(validSummary)).toBe(true);
    expect(isSummaryConsistent(invalidSummary)).toBe(false);
  });
});
