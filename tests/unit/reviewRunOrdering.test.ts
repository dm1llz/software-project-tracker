import { describe, expect, it } from "vitest";

import {
  buildDisplayNameMap,
  disambiguateDisplayName,
} from "../../src/domain/review-run/disambiguateDisplayName";
import { sortReviewResults } from "../../src/domain/review-run/sortReviewResults";
import type { ReviewResult } from "../../src/types/reviewContracts";

const makeResult = (
  id: string,
  fileName: string,
  uploadIndex: number,
  status: ReviewResult["status"],
) => ({
  id,
  fileName,
  displayName: fileName,
  uploadIndex,
  status,
  parseOk: status !== "parse_failed",
  valid: status === "passed",
  issues: [],
  sections: status === "passed" ? [] : undefined,
});

describe("review-run deterministic ordering", () => {
  it("sorts parse_failed, then validation_failed, then passed, each by uploadIndex", () => {
    const unsorted: ReviewResult[] = [
      makeResult("f-2", "b.json", 2, "passed"),
      makeResult("f-0", "a.json", 0, "validation_failed"),
      makeResult("f-1", "c.json", 1, "parse_failed"),
    ];

    const sortedIds = sortReviewResults(unsorted).map((result) => result.id);
    expect(sortedIds).toEqual(["f-1", "f-0", "f-2"]);
  });

  it("keeps duplicate filename labels stable and uniquely numbered", () => {
    const files = [
      { id: "a", fileName: "dup.json", uploadIndex: 3 },
      { id: "b", fileName: "dup.json", uploadIndex: 1 },
      { id: "c", fileName: "dup.json", uploadIndex: 2 },
      { id: "d", fileName: "unique.json", uploadIndex: 0 },
    ];

    const labelsOne = buildDisplayNameMap(files);
    const labelsTwo = buildDisplayNameMap(files);

    expect(labelsOne).toEqual(labelsTwo);
    expect(labelsOne.d).toBe("unique.json");
    expect(labelsOne.b).toBe("dup.json (1)");
    expect(labelsOne.c).toBe("dup.json (2)");
    expect(labelsOne.a).toBe("dup.json (3)");
    expect(disambiguateDisplayName("file.json", 0, 1)).toBe("file.json");
  });
});
