import type { RunIssue } from "../types/reviewContracts";
import {
  applyReplaceSchemaAction,
  deriveSchemaControlPanelModel,
  type SchemaControlPanelModel,
} from "./components/SchemaControlPanel";
import { deriveFileDetailPanelModel } from "./components/FileDetailPanel";
import { deriveFileResultListModel } from "./components/FileResultList";
import { deriveReviewSummaryModel } from "./components/ReviewSummary";
import { deriveRunIssuePanelModel } from "./components/RunIssuePanel";
import { deriveScreenState, type ReviewScreenState } from "./state/deriveScreenState";
import { type ReviewRunStoreState, selectReviewFile } from "./state/reviewRunStore";

export type ReviewRunPageInput = {
  schemaName: string | null;
  isRunning: boolean;
  hasCompletedRun: boolean;
  runIssues: RunIssue[];
  processedFiles: number;
  totalFiles: number;
};

export type ReviewRunContentModel = {
  summary: ReturnType<typeof deriveReviewSummaryModel>;
  fileList: ReturnType<typeof deriveFileResultListModel>;
  detailPanel: ReturnType<typeof deriveFileDetailPanelModel>;
  runIssuePanel: ReturnType<typeof deriveRunIssuePanelModel>;
  showFileRows: boolean;
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

export const deriveReviewRunContentModel = (state: ReviewRunStoreState): ReviewRunContentModel => {
  const selectedFile = state.files.find((file) => file.id === state.selectedFileId) ?? null;
  const runIssuePanel = deriveRunIssuePanelModel(state.runIssues);
  const showFileRows = !(runIssuePanel.visible && state.files.length === 0);

  return {
    summary: deriveReviewSummaryModel(state.summary),
    fileList: deriveFileResultListModel({
      files: state.files,
      selectedFileId: state.selectedFileId,
    }),
    detailPanel: deriveFileDetailPanelModel({
      file: selectedFile,
    }),
    runIssuePanel,
    showFileRows,
  };
};

export const selectFileFromReviewRunPage = (
  state: ReviewRunStoreState,
  fileId: string | null,
): ReviewRunStoreState => selectReviewFile(state, fileId);

export const replaceSchemaFromReviewRunPage = (
  state: ReviewRunStoreState,
  screenState: ReviewScreenState,
  nextSchemaName: string,
): ReviewRunStoreState =>
  applyReplaceSchemaAction({
    state,
    screenState,
    nextSchemaName,
  });
