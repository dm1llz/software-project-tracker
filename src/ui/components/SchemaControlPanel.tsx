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

  return replaceSchemaAndResetRunState(state, nextSchemaName);
};
