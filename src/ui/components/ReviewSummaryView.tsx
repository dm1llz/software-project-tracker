import type { ReviewSummaryModel } from "./ReviewSummary";

type ReviewSummaryViewProps = {
  model: ReviewSummaryModel;
};

export const ReviewSummaryView = ({ model }: ReviewSummaryViewProps) => (
  <section aria-label="Review summary">
    <h2>Summary</h2>
    <ul>
      {model.metrics.map((metric) => (
        <li key={metric.label}>
          <span>{metric.label}</span>
          {": "}
          <strong>{metric.value}</strong>
        </li>
      ))}
    </ul>
  </section>
);
