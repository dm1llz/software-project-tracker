import type { BatchReviewSummary } from "../../types/reviewContracts";

export type ReviewSummaryMetric = {
  label: "total" | "passed" | "failed" | "parseFailed";
  value: number;
};

export type ReviewSummaryModel = {
  metrics: ReviewSummaryMetric[];
};

const normalizeCount = (value: number): number => Math.max(0, value);

export const deriveReviewSummaryModel = (summary: BatchReviewSummary): ReviewSummaryModel => ({
  metrics: [
    { label: "total", value: normalizeCount(summary.total) },
    { label: "passed", value: normalizeCount(summary.passed) },
    { label: "failed", value: normalizeCount(summary.failed) },
    { label: "parseFailed", value: normalizeCount(summary.parseFailed) },
  ],
});
