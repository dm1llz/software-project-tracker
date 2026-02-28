import type { ReviewSummaryModel } from "./ReviewSummary";

type ReviewSummaryViewProps = {
  model: ReviewSummaryModel;
};

export const ReviewSummaryView = ({ model }: ReviewSummaryViewProps) => (
  <section
    aria-label="Review summary"
    className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-slate-950/30"
  >
    <h2 className="text-base font-semibold text-slate-100">Summary</h2>
    <ul className="mt-3 space-y-2">
      {model.metrics.map((metric) => (
        <li
          key={metric.label}
          className="flex items-center justify-between rounded-lg border border-slate-700/70 bg-slate-950/50 px-3 py-2 text-sm"
        >
          <span className="text-slate-300">{metric.label}: </span>
          <strong className="font-mono text-cyan-200">{metric.value}</strong>
        </li>
      ))}
    </ul>
  </section>
);
