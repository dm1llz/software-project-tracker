import type { RunIssuePanelModel } from "./RunIssuePanel";

type RunIssuePanelViewProps = {
  model: RunIssuePanelModel;
};

export const RunIssuePanelView = ({ model }: RunIssuePanelViewProps) => {
  if (!model.visible) {
    return null;
  }

  return (
    <section aria-label="Run issues">
      <h2>Run issues</h2>
      <table>
        <thead>
          <tr>
            <th>code</th>
            <th>message</th>
            <th>path</th>
            <th>line</th>
            <th>column</th>
          </tr>
        </thead>
        <tbody>
          {model.rows.map((row, index) => (
            <tr key={`${row.code}-${index}`}>
              <td>{row.code}</td>
              <td>{row.message}</td>
              <td>{row.path ?? "-"}</td>
              <td>{row.line ?? "-"}</td>
              <td>{row.column ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};
