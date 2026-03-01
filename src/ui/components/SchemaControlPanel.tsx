import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";

import { ConfirmDialog } from "./ConfirmDialog";
import type { ReviewScreenState } from "../state/deriveScreenState";
import {
  replaceSchemaAndResetRunState,
  type ReviewRunStoreState,
} from "../state/reviewRunStore";

export type SchemaControlPanelInput = {
  schemaName: string | null;
  screenState: ReviewScreenState;
};

export type SchemaControlPanelModel = {
  schemaStatusText: string;
  schemaName: string | null;
  schemaActionText: "Choose schema" | "Replace schema";
  controls: {
    canUploadSchema: boolean;
    canUploadFrdFiles: boolean;
    requiresSchemaReplacementConfirmation: boolean;
  };
};

const schemaStatusTextByState: Record<ReviewScreenState, string> = {
  empty: "No schema loaded",
  ready: "Schema loaded",
  running: "Processing review run",
  complete: "Review run complete",
  error: "Schema error",
};

export const deriveSchemaControlPanelModel = ({
  schemaName,
  screenState,
}: SchemaControlPanelInput): SchemaControlPanelModel => {
  const canUploadSchema = screenState !== "running";
  const canUploadFrdFiles =
    (screenState === "ready" || screenState === "complete") && schemaName !== null;
  const requiresSchemaReplacementConfirmation = schemaName !== null;

  return {
    schemaStatusText: schemaStatusTextByState[screenState],
    schemaName,
    schemaActionText: requiresSchemaReplacementConfirmation ? "Replace schema" : "Choose schema",
    controls: {
      canUploadSchema,
      canUploadFrdFiles,
      requiresSchemaReplacementConfirmation,
    },
  };
};

export type ReplaceSchemaActionInput = {
  state: ReviewRunStoreState;
  screenState: ReviewScreenState;
  nextSchemaName: string;
};

export const applyReplaceSchemaAction = ({
  state,
  screenState,
  nextSchemaName,
}: ReplaceSchemaActionInput): ReviewRunStoreState => {
  const model = deriveSchemaControlPanelModel({
    schemaName: state.schemaName,
    screenState,
  });

  if (!model.controls.canUploadSchema || !model.controls.requiresSchemaReplacementConfirmation) {
    return state;
  }

  return replaceSchemaAndResetRunState(nextSchemaName);
};

type SchemaControlPanelProps = {
  model: SchemaControlPanelModel;
  onSchemaUpload: (file: File, replaceMode?: boolean) => void;
  onFrdUpload: (files: File[]) => void;
  fileListContent?: ReactNode;
};

const firstFile = (event: ChangeEvent<HTMLInputElement>): File | null =>
  event.currentTarget.files?.item(0) ?? null;

const fileList = (event: ChangeEvent<HTMLInputElement>): File[] =>
  event.currentTarget.files ? Array.from(event.currentTarget.files) : [];

export const SchemaControlPanel = ({
  model,
  onSchemaUpload,
  onFrdUpload,
  fileListContent,
}: SchemaControlPanelProps) => {
  const schemaInputRef = useRef<HTMLInputElement | null>(null);
  const [showReplacementModal, setShowReplacementModal] = useState(false);
  const [pendingReplaceMode, setPendingReplaceMode] = useState(false);

  useEffect(() => {
    if (!model.controls.canUploadSchema) {
      setShowReplacementModal(false);
      setPendingReplaceMode(false);
    }
  }, [model.controls.canUploadSchema]);

  const openSchemaFilePicker = (replaceMode: boolean): void => {
    setPendingReplaceMode(replaceMode);
    schemaInputRef.current?.click();
  };

  return (
    <section
      aria-label="Schema controls"
      className="h-full rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-slate-950/40"
    >
      <h2 className="text-lg font-semibold text-slate-100">Schema controls</h2>
      <p className="mt-2 text-sm text-slate-300">{model.schemaStatusText}</p>
      <p className="mt-1 text-xs text-slate-400">{model.schemaName ?? "No active schema"}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-xl border border-slate-700/80 bg-slate-900/70 p-3 text-sm font-medium text-slate-200">
          <span>Schema file</span>
          <button
            type="button"
            className="inline-flex w-fit items-center rounded-md border border-amber-500/60 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!model.controls.canUploadSchema}
            onClick={() => {
              if (!model.controls.canUploadSchema) {
                return;
              }

              if (model.controls.requiresSchemaReplacementConfirmation) {
                setShowReplacementModal(true);
                return;
              }

              openSchemaFilePicker(false);
            }}
          >
            {model.schemaActionText}
          </button>
          {model.controls.requiresSchemaReplacementConfirmation ? (
            <span className="text-xs font-normal text-amber-100/90">
              Replacement requires confirmation.
            </span>
          ) : null}
          <input
            ref={schemaInputRef}
            type="file"
            accept="application/json,.json"
            aria-label="Schema file"
            className="sr-only"
            onChange={(event) => {
              const file = firstFile(event);
              event.currentTarget.value = "";
              if (!file) {
                setPendingReplaceMode(false);
                return;
              }
              onSchemaUpload(file, pendingReplaceMode);
              setPendingReplaceMode(false);
            }}
            disabled={!model.controls.canUploadSchema}
          />
        </div>

        <div className="space-y-3">
          <label className="flex flex-col gap-2 rounded-xl border border-slate-700/80 bg-slate-900/70 p-3 text-sm font-medium text-slate-200 transition focus-within:border-teal-300/80 focus-within:ring-2 focus-within:ring-teal-300/70 focus-within:ring-offset-2 focus-within:ring-offset-slate-900">
            FRD files
            <span className="inline-flex w-fit items-center rounded-md border border-teal-500/60 bg-teal-500/15 px-3 py-1.5 text-xs font-semibold text-teal-200">
              Choose one or more FRDs
            </span>
            <input
              type="file"
              multiple
              accept="application/json,.json"
              aria-label="FRD files"
              className="sr-only"
              onChange={(event) => {
                const files = fileList(event);
                if (files.length > 0) {
                  onFrdUpload(files);
                }
              }}
              disabled={!model.controls.canUploadFrdFiles}
            />
          </label>
          {fileListContent}
        </div>
      </div>

      <ConfirmDialog
        open={showReplacementModal && model.schemaName !== null}
        ariaLabel="Schema replacement confirmation"
        title="Replace active schema?"
        description="Replacing the active schema clears current run summary, file results, and selected detail state."
        detail={model.schemaName ? `Current schema: ${model.schemaName}` : undefined}
        confirmLabel="Continue to file picker"
        cancelLabel="Cancel"
        closeAriaLabel="Close schema replacement dialog"
        onCancel={() => {
          setShowReplacementModal(false);
        }}
        onClose={() => {
          setShowReplacementModal(false);
        }}
        onConfirm={() => {
          setShowReplacementModal(false);
          openSchemaFilePicker(true);
        }}
      />
    </section>
  );
};
