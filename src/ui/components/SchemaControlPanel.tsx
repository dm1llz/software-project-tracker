import type { ReviewScreenState } from "../state/deriveScreenState";

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
