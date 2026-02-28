import { memo } from "react";

import type { FileResultListModel } from "./FileResultList";

type FileResultListViewProps = {
  model: FileResultListModel;
  onSelectFile: (fileId: string) => void;
};

type FileResultRowProps = {
  id: string;
  displayName: string;
  selected: boolean;
  status: string;
  onSelectFile: (fileId: string) => void;
};

const FileResultRow = memo(({
  id,
  displayName,
  selected,
  status,
  onSelectFile,
}: FileResultRowProps) => (
  <li
    className="flex items-center justify-between gap-2 rounded-lg border border-slate-700/70 bg-slate-950/50 p-2"
  >
    <button
      type="button"
      aria-pressed={selected}
      className={
        selected
          ? "rounded-md px-2 py-1 text-left text-sm font-semibold text-amber-200 ring-1 ring-amber-400/70"
          : "rounded-md px-2 py-1 text-left text-sm text-slate-200 hover:bg-slate-800/80"
      }
      onClick={() => onSelectFile(id)}
    >
      {displayName}
    </button>
    <span className="rounded-md border border-slate-700 px-2 py-0.5 text-xs uppercase tracking-wide text-slate-300">
      {status}
    </span>
  </li>
));

FileResultRow.displayName = "FileResultRow";

export const FileResultListView = memo(({ model, onSelectFile }: FileResultListViewProps) => (
  <section
    aria-label="File results"
    className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-slate-950/30"
  >
    <h2 className="text-base font-semibold text-slate-100">Files</h2>
    <ul className="mt-3 space-y-2">
      {model.rows.map((row) => (
        <FileResultRow
          key={row.id}
          id={row.id}
          displayName={row.displayName}
          selected={row.selected}
          status={row.status}
          onSelectFile={onSelectFile}
        />
      ))}
    </ul>
  </section>
));

FileResultListView.displayName = "FileResultListView";
