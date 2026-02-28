import type { FileIssueTableModel } from "./FileIssueTable";

type FileIssueTableViewProps = {
  model: FileIssueTableModel;
};

export const FileIssueTableView = ({ model }: FileIssueTableViewProps) => (
  <section
    aria-label="File issues"
    className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-slate-950/30"
  >
    <h3 className="text-base font-semibold text-slate-100">Issues</h3>
    <div className="mt-3 overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-sm text-slate-200">
        <thead>
          <tr className="border-b border-slate-700 text-xs uppercase tracking-wide text-slate-400">
            <th className="px-2 py-2">level</th>
            <th className="px-2 py-2">code</th>
            <th className="px-2 py-2">path</th>
            <th className="px-2 py-2">line</th>
            <th className="px-2 py-2">column</th>
            <th className="px-2 py-2">message</th>
            <th className="px-2 py-2">keyword</th>
          </tr>
        </thead>
        <tbody>
          {model.rows.map((row, index) => (
            <tr
              key={`${row.code}-${row.path}-${index}`}
              className="border-b border-slate-800/80 last:border-b-0"
            >
              <td className="px-2 py-2">{row.level}</td>
              <td className="px-2 py-2">{row.code}</td>
              <td className="px-2 py-2">{row.path}</td>
              <td className="px-2 py-2">{row.line ?? "-"}</td>
              <td className="px-2 py-2">{row.column ?? "-"}</td>
              <td className="px-2 py-2">{row.message}</td>
              <td className="px-2 py-2">{row.keyword ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);
