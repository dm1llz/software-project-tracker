import type { RunIssuePanelModel } from "./RunIssuePanel";

type RunIssuePanelViewProps = {
  model: RunIssuePanelModel;
};

export const RunIssuePanelView = ({ model }: RunIssuePanelViewProps) => {
  if (!model.visible) {
    return null;
  }

  return (
    <section
      aria-label="Run issues"
      className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 shadow-lg shadow-slate-950/30"
    >
      <h2 className="text-base font-semibold text-rose-200">Run issues</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm text-slate-100">
          <thead>
            <tr className="border-b border-rose-300/30 text-xs uppercase tracking-wide text-rose-200/80">
              <th className="px-2 py-2">code</th>
              <th className="px-2 py-2">message</th>
              <th className="px-2 py-2">path</th>
              <th className="px-2 py-2">line</th>
              <th className="px-2 py-2">column</th>
            </tr>
          </thead>
          <tbody>
            {model.rows.map((row, index) => (
              <tr key={`${row.code}-${index}`} className="border-b border-rose-200/20 last:border-b-0">
                <td className="px-2 py-2">{row.code}</td>
                <td className="px-2 py-2">{row.message}</td>
                <td className="px-2 py-2">{row.path ?? "-"}</td>
                <td className="px-2 py-2">{row.line ?? "-"}</td>
                <td className="px-2 py-2">{row.column ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
