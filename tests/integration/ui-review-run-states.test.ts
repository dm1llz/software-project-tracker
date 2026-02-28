import { describe, expect, it } from "vitest";

import { deriveReviewRunPageModel } from "../../src/ui/ReviewRunPage";
import { deriveSchemaControlPanelModel } from "../../src/ui/components/SchemaControlPanel";
import { deriveScreenState } from "../../src/ui/state/deriveScreenState";

describe("ui review run screen states", () => {
  it("transitions Empty -> Ready -> Running -> Complete with correct control gating", () => {
    const emptyState = deriveReviewRunPageModel({
      schemaName: null,
      isRunning: false,
      hasCompletedRun: false,
      runIssues: [],
      processedFiles: 0,
      totalFiles: 0,
    });

    const readyState = deriveReviewRunPageModel({
      schemaName: "schema.json",
      isRunning: false,
      hasCompletedRun: false,
      runIssues: [],
      processedFiles: 0,
      totalFiles: 2,
    });

    const runningState = deriveReviewRunPageModel({
      schemaName: "schema.json",
      isRunning: true,
      hasCompletedRun: false,
      runIssues: [],
      processedFiles: 1,
      totalFiles: 2,
    });

    const completeState = deriveReviewRunPageModel({
      schemaName: "schema.json",
      isRunning: false,
      hasCompletedRun: true,
      runIssues: [],
      processedFiles: 2,
      totalFiles: 2,
    });

    expect(emptyState.screenState).toBe("empty");
    expect(readyState.screenState).toBe("ready");
    expect(runningState.screenState).toBe("running");
    expect(completeState.screenState).toBe("complete");

    expect(emptyState.schemaPanel.controls.canUploadFrdFiles).toBe(false);
    expect(readyState.schemaPanel.controls.canUploadFrdFiles).toBe(true);
    expect(runningState.schemaPanel.controls.canUploadFrdFiles).toBe(false);
    expect(completeState.schemaPanel.controls.canUploadFrdFiles).toBe(true);
  });

  it("enters Error state for invalid schema and keeps FRD upload disabled", () => {
    const screenState = deriveScreenState({
      schemaLoaded: false,
      isRunning: false,
      hasCompletedRun: false,
      runIssues: [
        {
          level: "error",
          code: "SCHEMA_ERROR",
          message: "Invalid schema JSON",
          path: "/",
        },
      ],
    });

    const schemaPanel = deriveSchemaControlPanelModel({
      schemaName: null,
      screenState,
    });

    expect(screenState).toBe("error");
    expect(schemaPanel.controls.canUploadFrdFiles).toBe(false);
  });

  it("blocks disruptive schema interactions while run is processing", () => {
    const schemaPanel = deriveSchemaControlPanelModel({
      schemaName: "schema.json",
      screenState: "running",
    });

    expect(schemaPanel.controls.canUploadSchema).toBe(false);
    expect(schemaPanel.controls.canReplaceSchema).toBe(false);
  });

  it("normalizes progress counters to non-negative and bounded values", () => {
    const state = deriveReviewRunPageModel({
      schemaName: "schema.json",
      isRunning: true,
      hasCompletedRun: false,
      runIssues: [],
      processedFiles: 10,
      totalFiles: -2,
    });

    expect(state.progress).toEqual({
      processedFiles: 0,
      totalFiles: 0,
    });
  });
});
