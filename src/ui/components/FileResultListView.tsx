import type { FileResultListModel } from "./FileResultList";

type FileResultListViewProps = {
  model: FileResultListModel;
  onSelectFile: (fileId: string) => void;
};

export const FileResultListView = ({ model, onSelectFile }: FileResultListViewProps) => (
  <section aria-label="File results">
    <h2>Files</h2>
    <ul>
      {model.rows.map((row) => (
        <li key={row.id}>
          <button
            type="button"
            aria-pressed={row.selected}
            onClick={() => onSelectFile(row.id)}
          >
            {row.displayName}
          </button>
          {" "}
          <span>{row.status}</span>
        </li>
      ))}
    </ul>
  </section>
);
