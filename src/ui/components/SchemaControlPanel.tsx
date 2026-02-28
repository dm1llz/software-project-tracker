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
  <section aria-label="Schema controls">
    <h2>Schema controls</h2>
    <p>{model.schemaStatusText}</p>
    <p>{model.schemaName ?? "No active schema"}</p>

    <label>
      Schema file
      <input
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          const file = firstFile(event);
          if (file) {
            onSchemaUpload(file);
          }
        }}
        disabled={!model.controls.canUploadSchema}
      />
    </label>

    <label>
      FRD files
      <input
        type="file"
        multiple
        accept="application/json,.json"
        onChange={(event) => {
          const files = fileList(event);
          if (files.length > 0) {
            onFrdUpload(files);
          }
        }}
        disabled={!model.controls.canUploadFrdFiles}
      />
    </label>

    {model.controls.canReplaceSchema ? (
      <label>
        Replace schema file
        <input
          type="file"
          accept="application/json,.json"
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
