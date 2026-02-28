import type { ChangeEvent } from "react";

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
  controls: {
    canUploadSchema: boolean;
    canUploadFrdFiles: boolean;
    canReplaceSchema: boolean;
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
  const canReplaceSchema =
    schemaName !== null && screenState !== "running" && screenState !== "empty";

  return {
    schemaStatusText: schemaStatusTextByState[screenState],
    schemaName,
    controls: {
      canUploadSchema,
      canUploadFrdFiles,
      canReplaceSchema,
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

  if (!model.controls.canReplaceSchema) {
    return state;
  }

  return replaceSchemaAndResetRunState(nextSchemaName);
};

type SchemaControlPanelProps = {
  model: SchemaControlPanelModel;
  onSchemaUpload: (file: File) => void;
  onFrdUpload: (files: File[]) => void;
  onReplaceSchemaUpload: (file: File) => void;
};

const firstFile = (event: ChangeEvent<HTMLInputElement>): File | null =>
  event.currentTarget.files?.item(0) ?? null;

const fileList = (event: ChangeEvent<HTMLInputElement>): File[] =>
  event.currentTarget.files ? Array.from(event.currentTarget.files) : [];

export const SchemaControlPanel = ({
  model,
  onSchemaUpload,
  onFrdUpload,
  onReplaceSchemaUpload,
}: SchemaControlPanelProps) => (
  <section
    aria-label="Schema controls"
    className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-slate-950/40"
  >
    <h2 className="text-lg font-semibold text-slate-100">Schema controls</h2>
    <p className="mt-2 text-sm text-slate-300">{model.schemaStatusText}</p>
    <p className="mt-1 text-xs text-slate-400">{model.schemaName ?? "No active schema"}</p>

    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-2 rounded-xl border border-slate-700/80 bg-slate-900/70 p-3 text-sm font-medium text-slate-200 transition focus-within:border-amber-300/80 focus-within:ring-2 focus-within:ring-amber-300/70 focus-within:ring-offset-2 focus-within:ring-offset-slate-900">
        Schema file
        <span className="inline-flex w-fit items-center rounded-md border border-amber-500/60 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200">
          Choose schema
        </span>
      <input
        type="file"
        accept="application/json,.json"
        aria-label="Schema file"
        className="sr-only"
        onChange={(event) => {
          const file = firstFile(event);
          if (file) {
            onSchemaUpload(file);
          }
        }}
        disabled={!model.controls.canUploadSchema}
      />
      </label>

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
    </div>

    {model.controls.canReplaceSchema ? (
      <label className="mt-3 flex flex-col gap-2 rounded-xl border border-slate-700/80 bg-slate-900/70 p-3 text-sm font-medium text-slate-200 transition focus-within:border-rose-300/80 focus-within:ring-2 focus-within:ring-rose-300/70 focus-within:ring-offset-2 focus-within:ring-offset-slate-900">
        Replace schema file
        <span className="inline-flex w-fit items-center rounded-md border border-rose-400/60 bg-rose-400/15 px-3 py-1.5 text-xs font-semibold text-rose-200">
          Replace active schema
        </span>
        <input
          type="file"
          accept="application/json,.json"
          aria-label="Replace schema file"
          className="sr-only"
          onChange={(event) => {
            const file = firstFile(event);
            if (file) {
              onReplaceSchemaUpload(file);
            }
          }}
          disabled={!model.controls.canReplaceSchema}
        />
      </label>
    ) : null}
  </section>
);
