import type { FileIssueTableModel } from "./FileIssueTable";

type FileIssueTableViewProps = {
  model: FileIssueTableModel;
};

export const FileIssueTableView = ({ model }: FileIssueTableViewProps) => (
  <section aria-label="File issues">
    <h3>Issues</h3>
    <table>
      <thead>
        <tr>
          <th>level</th>
          <th>code</th>
          <th>path</th>
          <th>line</th>
          <th>column</th>
          <th>message</th>
          <th>keyword</th>
        </tr>
      </thead>
      <tbody>
        {model.rows.map((row, index) => (
          <tr key={`${row.code}-${row.path}-${index}`}>
            <td>{row.level}</td>
            <td>{row.code}</td>
            <td>{row.path}</td>
            <td>{row.line ?? "-"}</td>
            <td>{row.column ?? "-"}</td>
            <td>{row.message}</td>
            <td>{row.keyword ?? "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);
