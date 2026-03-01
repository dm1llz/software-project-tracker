import { useMemo } from "react";

import type { RunIssue } from "../types/reviewContracts";
import {
  applyReplaceSchemaAction,
  deriveSchemaControlPanelModel,
  SchemaControlPanel,
  type SchemaControlPanelModel,
} from "./components/SchemaControlPanel";
import { deriveFileDetailPanelModel, type FileDetailTab } from "./components/FileDetailPanel";
import { deriveFileResultListModel } from "./components/FileResultList";
import { FileIssueTableView } from "./components/FileIssueTableView";
import { FileResultListView } from "./components/FileResultListView";
import { ReadableFrdSectionView } from "./components/ReadableFrdSectionView";
import { deriveReviewSummaryModel } from "./components/ReviewSummary";
import { ReviewSummaryView } from "./components/ReviewSummaryView";
import { deriveRunIssuePanelModel } from "./components/RunIssuePanel";
import { RunIssuePanelView } from "./components/RunIssuePanelView";
import { useReviewRunController } from "./hooks/useReviewRunController";
import { deriveScreenState, type ReviewScreenState } from "./state/deriveScreenState";
import type { ReviewRunStoreState } from "./state/reviewRunStore";
import { selectReviewFile } from "./state/reviewRunStore";

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

export const deriveReviewRunContentModel = (
  state: ReviewRunStoreState,
  preferredTab?: FileDetailTab,
): ReviewRunContentModel => {
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
      preferredTab,
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

export const ReviewRunPage = () => {
  const {
    store,
    processedFiles,
    totalFiles,
    preferredTab,
    handleSchemaUpload,
    handleFrdUpload,
    selectFile,
    setPreferredTab,
  } = useReviewRunController();

  const pageModel = useMemo(
    () =>
      deriveReviewRunPageModel({
        schemaName: store.schemaName,
        isRunning: store.isRunning,
        hasCompletedRun: store.hasCompletedRun,
        runIssues: store.runIssues,
        processedFiles,
        totalFiles,
      }),
    [processedFiles, store.hasCompletedRun, store.isRunning, store.runIssues, store.schemaName, totalFiles],
  );

  const contentModel = useMemo(
    () => deriveReviewRunContentModel(store, preferredTab),
    [preferredTab, store],
  );

  return (
    <main className="mx-auto min-h-screen min-h-[100dvh] max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/40">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          Software Project Tracker
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Upload a JSON schema, review FRD files in batch, and inspect issues or readable sections in a responsive workspace.
        </p>
      </header>

      <section
        aria-label="Review workspace top row"
        className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
      >
        <div className="min-w-0 space-y-4">
          <SchemaControlPanel
            model={pageModel.schemaPanel}
            onSchemaUpload={(file, replaceMode) => {
              void handleSchemaUpload(file, replaceMode);
            }}
            onFrdUpload={(files) => {
              void handleFrdUpload(files);
            }}
            fileListContent={
              contentModel.showFileRows ? (
                <FileResultListView
                  model={contentModel.fileList}
                  onSelectFile={selectFile}
                  variant="inline"
                />
              ) : null
            }
          />

          {pageModel.visibleSections.emptyHint ? (
            <p className="rounded-xl border border-slate-700/80 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
              Upload schema first.
            </p>
          ) : null}
          {pageModel.visibleSections.readyHint ? (
            <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              Schema ready for FRD upload.
            </p>
          ) : null}
          {pageModel.visibleSections.runningProgress ? (
            <p className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
              Processing {pageModel.progress.processedFiles} / {pageModel.progress.totalFiles}
            </p>
          ) : null}
        </div>

        <div className="min-w-0">
          <ReviewSummaryView model={contentModel.summary} />
        </div>
      </section>

      {contentModel.runIssuePanel.visible || contentModel.detailPanel.fileId !== null ? (
        <section
          aria-label="Review workspace detail row"
          className="mt-5 w-full min-w-0 space-y-5"
        >
          <RunIssuePanelView model={contentModel.runIssuePanel} />

          {contentModel.detailPanel.fileId !== null ? (
            <section
              aria-label="File detail"
              className="rounded-xl border border-slate-800/70 bg-slate-900/55 p-4"
            >
              <h2 className="text-base font-semibold text-slate-100">File detail</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {contentModel.detailPanel.availableTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    aria-pressed={contentModel.detailPanel.activeTab === tab}
                    className={
                      contentModel.detailPanel.activeTab === tab
                        ? "rounded-md border border-amber-400/70 bg-amber-500/20 px-3 py-1.5 text-sm font-semibold text-amber-100"
                        : "rounded-md border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800/80"
                    }
                    onClick={() => setPreferredTab(tab)}
                  >
                    {tab === "issues" ? "Issues" : "Readable FRD"}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                {contentModel.detailPanel.activeTab === "issues" ? (
                  <FileIssueTableView model={contentModel.detailPanel.issueTable} />
                ) : (
                  <ReadableFrdSectionView sections={contentModel.detailPanel.readableView.sections} />
                )}
              </div>
            </section>
          ) : null}
        </section>
      ) : null}
    </main>
  );
};

export default ReviewRunPage;
