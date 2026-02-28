import { useMemo, useRef, useState } from "react";

import { buildRenderedSections } from "../domain/rendering/buildRenderedSections";
import { buildReviewResult } from "../domain/review-run/buildReviewResult";
import { mapReviewInputFiles } from "../domain/review-run/mapReviewInputFiles";
import { parseFrdFile } from "../domain/review-run/parseFrdFile";
import { summarizeBatchReview } from "../domain/review-run/summarizeBatchReview";
import { validateFrdFile } from "../domain/review-run/validateFrdFile";
import { compileSchema } from "../domain/validation/compileSchema";
import { loadSchemaFile } from "../domain/validation/loadSchemaFile";
import type { FileIssue, ReviewResult, RunIssue, SchemaBundle } from "../types/reviewContracts";
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
import { deriveScreenState, type ReviewScreenState } from "./state/deriveScreenState";
import {
  completeReviewRun,
  createReviewRunStoreState,
  selectReviewFile,
  startReviewRun,
  type ReviewRunStoreState,
} from "./state/reviewRunStore";

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

const toUploadIndexFromFileId = (fileId: string, fallbackIndex: number): number => {
  const match = fileId.match(/^frd-(\d+)-/);
  if (!match || !match[1]) {
    return fallbackIndex;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isNaN(parsed) ? fallbackIndex : parsed;
};

const readFileText = async (file: File): Promise<string> => {
  const withText = file as File & { text?: () => Promise<string> };
  if (typeof withText.text === "function") {
    return withText.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file text."));
    reader.readAsText(file);
  });
};

const mapReadFailureToReviewResult = (
  issue: FileIssue,
  displayNameById: Record<string, string>,
  fallbackIndex: number,
) => ({
  id: issue.fileId,
  uploadIndex: toUploadIndexFromFileId(issue.fileId, fallbackIndex),
  fileName: issue.fileName,
  displayName: displayNameById[issue.fileId] ?? issue.fileName,
  // Read failures map to parse_failed to keep existing ReviewResult status contracts.
  status: "parse_failed" as const,
  parseOk: false,
  valid: false,
  issues: [issue],
});

const toUnexpectedRunIssue = (error: unknown): RunIssue => ({
  level: "error",
  code: "SCHEMA_ERROR",
  message: `Unexpected runtime failure: ${
    error instanceof Error ? error.message : String(error)
  }`,
});

const toErrorStoreState = (runIssues: RunIssue[]): ReviewRunStoreState => ({
  ...createReviewRunStoreState(null),
  runIssues,
  hasCompletedRun: false,
  isRunning: false,
});

export const ReviewRunPage = () => {
  const [store, setStore] = useState<ReviewRunStoreState>(() => createReviewRunStoreState(null));
  const [schemaBundle, setSchemaBundle] = useState<SchemaBundle | null>(null);
  const [validator, setValidator] = useState<ReturnType<typeof compileSchema>["validator"]>(null);
  const [preferredTab, setPreferredTab] = useState<FileDetailTab>("issues");
  const [processedFiles, setProcessedFiles] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const requestVersionRef = useRef(0);

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

  const isCurrentRequest = (requestVersion: number): boolean =>
    requestVersionRef.current === requestVersion;

  const beginRequest = (): number => {
    requestVersionRef.current += 1;
    return requestVersionRef.current;
  };

  const resetRuntimeState = (requestVersion: number) => {
    if (!isCurrentRequest(requestVersion)) {
      return;
    }
    setPreferredTab("issues");
    setProcessedFiles(0);
    setTotalFiles(0);
  };

  const handleSchemaUpload = async (file: File, replaceMode = false): Promise<void> => {
    const requestVersion = beginRequest();

    try {
      if (replaceMode) {
        if (!isCurrentRequest(requestVersion)) {
          return;
        }
        setStore((previous) => {
          const currentScreenState = deriveScreenState({
            schemaLoaded: previous.schemaName !== null,
            isRunning: previous.isRunning,
            hasCompletedRun: previous.hasCompletedRun,
            runIssues: previous.runIssues,
          });
          return replaceSchemaFromReviewRunPage(previous, currentScreenState, file.name);
        });
        setSchemaBundle(null);
        setValidator(null);
        resetRuntimeState(requestVersion);
      }

      const loaded = await loadSchemaFile({
        name: file.name,
        text: () => readFileText(file),
      });
      if (!isCurrentRequest(requestVersion)) {
        return;
      }

      if (!loaded.ok) {
        setSchemaBundle(null);
        setValidator(null);
        setStore(toErrorStoreState(loaded.runIssues));
        resetRuntimeState(requestVersion);
        return;
      }

      const compiled = compileSchema(loaded.schema);
      if (!isCurrentRequest(requestVersion)) {
        return;
      }
      if (!compiled.ok) {
        setSchemaBundle(null);
        setValidator(null);
        setStore(toErrorStoreState(compiled.runIssues));
        resetRuntimeState(requestVersion);
        return;
      }

      if (!isCurrentRequest(requestVersion)) {
        return;
      }
      setSchemaBundle(loaded.schema);
      setValidator(() => compiled.validator);
      setStore(createReviewRunStoreState(loaded.schema.name));
      resetRuntimeState(requestVersion);
    } catch (error) {
      if (!isCurrentRequest(requestVersion)) {
        return;
      }
      setStore(toErrorStoreState([toUnexpectedRunIssue(error)]));
      resetRuntimeState(requestVersion);
    }
  };

  const handleFrdUpload = async (files: File[]): Promise<void> => {
    if (!schemaBundle || !validator || files.length === 0) {
      return;
    }
    const requestVersion = beginRequest();

    try {
      if (!isCurrentRequest(requestVersion)) {
        return;
      }
      setStore((previous) => startReviewRun(previous));
      setTotalFiles(files.length);
      setProcessedFiles(0);

      const mapped = await mapReviewInputFiles(
        files.map((file) => ({
          name: file.name,
          text: () => readFileText(file),
        })),
      );
      if (!isCurrentRequest(requestVersion)) {
        return;
      }

      const results: ReviewResult[] = [];
      for (const [index, file] of mapped.files.entries()) {
        if (!isCurrentRequest(requestVersion)) {
          return;
        }
        const displayName = mapped.displayNameById[file.id] ?? file.fileName;
        const parseResult = parseFrdFile(file);
        const validationIssues = parseResult.ok
          ? validateFrdFile({
              fileId: file.id,
              fileName: file.fileName,
              parsed: parseResult.parsed,
              validator,
            })
          : [];

        const hasErrorIssues = validationIssues.some((issue) => issue.level === "error");
        let sections: ReviewResult["sections"];
        if (parseResult.ok && !hasErrorIssues) {
          sections = buildRenderedSections({
            id: `${file.id}-root`,
            title: displayName,
            path: "/",
            value: parseResult.parsed,
            schema: schemaBundle.raw,
          });
        }

        const nextResult = buildReviewResult({
          file,
          displayName,
          parseResult,
          validationIssues,
          ...(sections ? { sections } : {}),
        });

        results.push(nextResult);
        setProcessedFiles(index + 1);
      }

      for (const [index, issue] of mapped.fileIssues.entries()) {
        if (!isCurrentRequest(requestVersion)) {
          return;
        }
        results.push(
          mapReadFailureToReviewResult(
            issue,
            mapped.displayNameById,
            mapped.files.length + index,
          ),
        );
      }

      if (!isCurrentRequest(requestVersion)) {
        return;
      }
      const summary = summarizeBatchReview(results);
      setStore((previous) =>
        completeReviewRun(previous, {
          runIssues: [],
          summary,
          files: results,
        }),
      );
      setPreferredTab("issues");
      setProcessedFiles(files.length);
    } catch (error) {
      if (!isCurrentRequest(requestVersion)) {
        return;
      }
      setStore(toErrorStoreState([toUnexpectedRunIssue(error)]));
      resetRuntimeState(requestVersion);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/40">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          Software Project Tracker
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Upload a JSON schema, review FRD files in batch, and inspect issues or readable sections in a responsive workspace.
        </p>
      </header>

      <SchemaControlPanel
        model={pageModel.schemaPanel}
        onSchemaUpload={(file) => {
          void handleSchemaUpload(file);
        }}
        onFrdUpload={(files) => {
          void handleFrdUpload(files);
        }}
        onReplaceSchemaUpload={(file) => {
          void handleSchemaUpload(file, true);
        }}
      />

      {pageModel.visibleSections.emptyHint ? (
        <p className="mt-4 rounded-xl border border-slate-700/80 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
          Upload schema first.
        </p>
      ) : null}
      {pageModel.visibleSections.readyHint ? (
        <p className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Schema ready for FRD upload.
        </p>
      ) : null}
      {pageModel.visibleSections.runningProgress ? (
        <p className="mt-4 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
          Processing {pageModel.progress.processedFiles} / {pageModel.progress.totalFiles}
        </p>
      ) : null}

      <div className="mt-5 space-y-5">
        <RunIssuePanelView model={contentModel.runIssuePanel} />

        <section className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="space-y-5">
            {contentModel.showFileRows ? (
              <>
                <ReviewSummaryView model={contentModel.summary} />
                <FileResultListView
                  model={contentModel.fileList}
                  onSelectFile={(fileId) => {
                    setStore((previous) => selectFileFromReviewRunPage(previous, fileId));
                    setPreferredTab("issues");
                  }}
                />
              </>
            ) : null}
          </div>

          <div className="space-y-5">
            {contentModel.detailPanel.fileId !== null ? (
              <section
                aria-label="File detail"
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-slate-950/30"
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
          </div>
        </section>
      </div>
    </main>
  );
};

export default ReviewRunPage;
