import { describe, expect, it } from "vitest";

import { executeReviewRun, type ExecuteReviewRunInput } from "../../../domain/review-run/executeReviewRun";
import {
  reviewRunResultsEqual,
  runReviewRunWithFallback,
} from "../runReviewRunWithFallback";
import invalidSchemaFrd from "../../../test-fixtures/frd/invalid-schema.frd?raw";
import validFrd from "../../../test-fixtures/frd/valid-frd.json?raw";
import validSchema202012 from "../../../test-fixtures/schema/valid-2020-12.json?raw";

const createInput = (): ExecuteReviewRunInput => ({
  schemaSource: {
    name: "valid-2020-12.json",
    text: validSchema202012,
  },
  frdSources: [
    { name: "valid-frd.json", text: validFrd },
    { name: "invalid-schema.frd", text: invalidSchemaFrd },
  ],
});

describe("worker fallback integration", () => {
  it("uses worker execution when worker path is available", async () => {
    const baseline = await executeReviewRun(createInput());

    const execution = await runReviewRunWithFallback({
      input: createInput(),
      executeOnWorker: executeReviewRun,
      executeOnMainThread: executeReviewRun,
    });

    expect(execution.mode).toBe("worker");
    expect(execution.workerError).toBeNull();
    expect(reviewRunResultsEqual(execution.run.result, baseline.result)).toBe(true);
  });

  it("falls back to main-thread execution and preserves result equivalence", async () => {
    const expected = await executeReviewRun(createInput());

    const execution = await runReviewRunWithFallback({
      input: createInput(),
      executeOnWorker: async () => {
        throw new Error("Worker unavailable");
      },
      executeOnMainThread: executeReviewRun,
    });

    expect(execution.mode).toBe("main_thread_fallback");
    expect(execution.workerError?.message).toBe("Worker unavailable");
    expect(reviewRunResultsEqual(execution.run.result, expected.result)).toBe(true);
  });
});
