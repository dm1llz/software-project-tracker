import type { RunIssue } from "../types/reviewContracts";
import {
  deriveSchemaControlPanelModel,
  type SchemaControlPanelModel,
} from "./components/SchemaControlPanel";
import { deriveScreenState, type ReviewScreenState } from "./state/deriveScreenState";

export type ReviewRunPageInput = {
  schemaName: string | null;
  isRunning: boolean;
  hasCompletedRun: boolean;
  runIssues: RunIssue[];
  processedFiles: number;
  totalFiles: number;
};

export type ReviewRunPageModel = {
  screenState: ReviewScreenState;
  schemaPanel: SchemaControlPanelModel;
  visibleSections: {
    emptyHint: boolean;
    readyHint: boolean;
    runningProgress: boolean;
    completeSummary: boolean;
    errorPanel: boolean;
  };
  progress: {
    processedFiles: number;
    totalFiles: number;
  };
};

export const deriveReviewRunPageModel = ({
  schemaName,
  isRunning,
  hasCompletedRun,
  runIssues,
  processedFiles,
  totalFiles,
}: ReviewRunPageInput): ReviewRunPageModel => {
  const schemaLoaded = schemaName !== null;
  const normalizedTotalFiles = Math.max(totalFiles, 0);
  const normalizedProcessedFiles = Math.min(Math.max(processedFiles, 0), normalizedTotalFiles);
  const screenState = deriveScreenState({
    schemaLoaded,
    isRunning,
    hasCompletedRun,
    runIssues,
  });

  return {
    screenState,
    schemaPanel: deriveSchemaControlPanelModel({
      schemaName,
      screenState,
    }),
    visibleSections: {
      emptyHint: screenState === "empty",
      readyHint: screenState === "ready",
      runningProgress: screenState === "running",
      completeSummary: screenState === "complete",
      errorPanel: screenState === "error",
    },
    progress: {
      processedFiles: normalizedProcessedFiles,
      totalFiles: normalizedTotalFiles,
    },
  };
};
