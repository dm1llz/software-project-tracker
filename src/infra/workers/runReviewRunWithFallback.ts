import type { ReviewRunResult } from "../../types/reviewContracts";
import type { ExecuteReviewRunInput, ExecuteReviewRunResult } from "../../domain/review-run/executeReviewRun";

export type ReviewRunExecutor = (input: ExecuteReviewRunInput) => Promise<ExecuteReviewRunResult>;

export type ReviewRunExecutionMode = "worker" | "main_thread_fallback";

export type ReviewRunFallbackResult = {
  mode: ReviewRunExecutionMode;
  run: ExecuteReviewRunResult;
  workerError: Error | null;
};

type RunReviewRunWithFallbackInput = {
  input: ExecuteReviewRunInput;
  executeOnWorker: ReviewRunExecutor;
  executeOnMainThread: ReviewRunExecutor;
};

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

export const runReviewRunWithFallback = async ({
  input,
  executeOnWorker,
  executeOnMainThread,
}: RunReviewRunWithFallbackInput): Promise<ReviewRunFallbackResult> => {
  try {
    const run = await executeOnWorker(input);
    return {
      mode: "worker",
      run,
      workerError: null,
    };
  } catch (error) {
    const run = await executeOnMainThread(input);
    return {
      mode: "main_thread_fallback",
      run,
      workerError: toError(error),
    };
  }
};

export const reviewRunResultsEqual = (
  left: ReviewRunResult,
  right: ReviewRunResult,
): boolean => JSON.stringify(left) === JSON.stringify(right);
