import { useEffect, useRef, type ReactNode } from "react";

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
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousActiveElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const getFocusableElements = (): HTMLElement[] =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          [
            "a[href]",
            "button:not([disabled])",
            "input:not([disabled])",
            "select:not([disabled])",
            "textarea:not([disabled])",
            "[tabindex]:not([tabindex='-1'])",
          ].join(","),
        ),
      ).filter((element) => !element.hasAttribute("hidden"));

    const focusableElements = getFocusableElements();
    const initialFocusTarget = focusableElements[0] ?? dialog;
    initialFocusTarget.focus();

    const handleKeydown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const availableElements = getFocusableElements();
      if (availableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement = availableElements[0]!;
      const lastElement = availableElements[availableElements.length - 1]!;
      const activeElement = document.activeElement;
      const activeInDialog = activeElement instanceof HTMLElement && dialog.contains(activeElement);

      if (event.shiftKey) {
        if (!activeInDialog || activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (!activeInDialog || activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      ref={dialogRef}
      tabIndex={-1}
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
