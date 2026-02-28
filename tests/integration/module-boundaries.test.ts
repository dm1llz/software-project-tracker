import { describe, expect, it } from "vitest";

import { assertImportAllowed, isImportAllowed } from "../../src/types/moduleBoundaryPolicy";
import { sampleContract } from "../../src/types/reviewContractsPlaceholder";
import { sampleUiConsumer } from "./fixtures/uiImportsTypes";

describe("module boundary policy", () => {
  it("allows UI modules to import contracts from src/types", () => {
    expect(sampleUiConsumer(sampleContract)).toBe("schema-001");
    expect(() =>
      assertImportAllowed(
        "src/ui/ReviewRunScreen.tsx",
        "src/types/reviewContractsPlaceholder.ts",
      ),
    ).not.toThrow();
  });

  it("rejects domain modules importing UI components", () => {
    expect(
      isImportAllowed("src/domain/review-run/runReview.ts", "src/ui/ReviewRunScreen.tsx"),
    ).toBe(false);
    expect(() =>
      assertImportAllowed("src/domain/review-run/runReview.ts", "src/ui/ReviewRunScreen.tsx"),
    ).toThrow(/must not import/);
  });
});
