import { describe, expect, it } from "vitest";

import { summarizeBatchReview } from "../../src/domain/review-run/summarizeBatchReview";
import type { ReviewResult } from "../../src/types/reviewContracts";

const makeResult = (
  id: string,
  uploadIndex: number,
  status: ReviewResult["status"],
  parseOk: boolean,
  valid: boolean,
): ReviewResult => ({
  id,
  uploadIndex,
  fileName: `${id}.json`,
  displayName: `${id}.json`,
  status,
  parseOk,
  valid,
  issues: [],
  sections: status === "passed" ? [] : undefined,
});

describe("summarizeBatchReview", () => {
  it("computes exact summary for one passed, one validation_failed, and one parse_failed", () => {
    const summary = summarizeBatchReview([
      makeResult("a", 0, "passed", true, true),
      makeResult("b", 1, "validation_failed", true, false),
      makeResult("c", 2, "parse_failed", false, false),
    ]);

    expect(summary).toEqual({
      total: 3,
      passed: 1,
      failed: 1,
      parseFailed: 1,
    });
  });

  it("throws when input contains review-result invariant violations", () => {
    expect(() =>
      summarizeBatchReview([makeResult("bad", 0, "passed", true, false)]),
    ).toThrow(/invariant violation/i);
  });

  it("reports parseFailed=total and passed=failed=0 when all files fail parsing", () => {
    const summary = summarizeBatchReview([
      makeResult("p1", 0, "parse_failed", false, false),
      makeResult("p2", 1, "parse_failed", false, false),
      makeResult("p3", 2, "parse_failed", false, false),
    ]);

    expect(summary).toEqual({
      total: 3,
      passed: 0,
      failed: 0,
      parseFailed: 3,
    });
  });
});
