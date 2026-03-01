import type { ReviewSummaryModel } from "./ReviewSummary";

type ReviewSummaryViewProps = {
  model: ReviewSummaryModel;
};

export const ReviewSummaryView = ({ model }: ReviewSummaryViewProps) => (
  <section
    aria-label="Review summary"
    className="h-full rounded-xl border border-slate-800/70 bg-slate-900/55 p-4"
  >
    <h2 className="text-base font-semibold text-slate-100">Summary</h2>
    <ul className="mt-3 divide-y divide-slate-800/80">
      {model.metrics.map((metric) => (
        <li
          key={metric.label}
          className="flex items-center justify-between gap-2 py-2 text-sm"
        >
          <span className="text-slate-300">{metric.label}: </span>
          <strong className="font-mono text-cyan-200">{metric.value}</strong>
        </li>
      ))}
    </ul>
  </section>
);
