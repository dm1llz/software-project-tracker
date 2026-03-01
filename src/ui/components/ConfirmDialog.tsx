import type { ReactNode } from "react";

export type ConfirmDialogProps = {
  open: boolean;
  ariaLabel: string;
  title: string;
  description: string;
  detail?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  closeAriaLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
};

export const ConfirmDialog = ({
  open,
  ariaLabel,
  title,
  description,
  detail,
  confirmLabel,
  cancelLabel,
  closeAriaLabel,
  onConfirm,
  onCancel,
  onClose,
}: ConfirmDialogProps) => {
  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl shadow-slate-950/60">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-100">{title}</h3>
          <button
            type="button"
            aria-label={closeAriaLabel}
            className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-300">{description}</p>
        {detail ? <div className="mt-2 text-xs text-slate-400">{detail}</div> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="rounded-md border border-rose-400/70 bg-rose-500/20 px-3 py-1.5 text-sm font-semibold text-rose-100 hover:bg-rose-500/30"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
