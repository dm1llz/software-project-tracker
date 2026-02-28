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

const toUploadIndexFromFileId = (fileId: string): number => {
  const match = fileId.match(/^frd-(\d+)-/);
  if (!match || !match[1]) {
    return 0;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const toSchemaNode = (rawSchema: Record<string, unknown>): Record<string, unknown> => rawSchema;

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
) => ({
  id: issue.fileId,
  uploadIndex: toUploadIndexFromFileId(issue.fileId),
  fileName: issue.fileName,
  displayName: displayNameById[issue.fileId] ?? issue.fileName,
  status: "parse_failed" as const,
  parseOk: false,
  valid: false,
  issues: [issue],
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
    if (!isCurrentRequest(requestVersion)) {
      return;
    }
    setProcessedFiles(0);
    if (!isCurrentRequest(requestVersion)) {
      return;
    }
    setTotalFiles(0);
  };

  const handleSchemaUpload = async (file: File, replaceMode = false): Promise<void> => {
    const requestVersion = beginRequest();

    if (replaceMode) {
      if (!isCurrentRequest(requestVersion)) {
        return;
      }
      setStore((previous) =>
        replaceSchemaFromReviewRunPage(previous, pageModel.screenState, file.name),
      );
      if (!isCurrentRequest(requestVersion)) {
        return;
      }
      setSchemaBundle(null);
      if (!isCurrentRequest(requestVersion)) {
        return;
      }
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
      if (!isCurrentRequest(requestVersion)) {
        return;
      }
      setSchemaBundle(null);
      if (!isCurrentRequest(requestVersion)) {
        return;
      }
      setValidator(null);
      if (!isCurrentRequest(requestVersion)) {
        return;
      }
      setStore(toErrorStoreState(loaded.runIssues));
      resetRuntimeState(requestVersion);
      return;
    }

    const compiled = compileSchema(loaded.schema);
    if (!isCurrentRequest(requestVersion)) {
      return;
    }
    if (!compiled.ok) {
      if (!isCurrentRequest(requestVersion)) {
        return;
      }
      setSchemaBundle(null);
      if (!isCurrentRequest(requestVersion)) {
        return;
      }
      setValidator(null);
      if (!isCurrentRequest(requestVersion)) {
        return;
      }
      setStore(toErrorStoreState(compiled.runIssues));
      resetRuntimeState(requestVersion);
      return;
    }

    if (!isCurrentRequest(requestVersion)) {
      return;
    }
    setSchemaBundle(loaded.schema);
    if (!isCurrentRequest(requestVersion)) {
      return;
    }
    setValidator(() => compiled.validator);
    if (!isCurrentRequest(requestVersion)) {
      return;
    }
    setStore(createReviewRunStoreState(loaded.schema.name));
    resetRuntimeState(requestVersion);
  };

  const handleFrdUpload = async (files: File[]): Promise<void> => {
    const requestVersion = beginRequest();

    if (!schemaBundle || !validator || files.length === 0) {
      return;
    }

    if (!isCurrentRequest(requestVersion)) {
      return;
    }
    setStore((previous) => startReviewRun(previous));
    if (!isCurrentRequest(requestVersion)) {
      return;
    }
    setTotalFiles(files.length);
    if (!isCurrentRequest(requestVersion)) {
      return;
    }
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
          schema: toSchemaNode(schemaBundle.raw),
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
      if (!isCurrentRequest(requestVersion)) {
        return;
      }
      setProcessedFiles(index + 1);
    }

    for (const issue of mapped.fileIssues) {
      if (!isCurrentRequest(requestVersion)) {
        return;
      }
      results.push(mapReadFailureToReviewResult(issue, mapped.displayNameById));
    }

    if (!isCurrentRequest(requestVersion)) {
      return;
    }
    const summary = summarizeBatchReview(results);
    if (!isCurrentRequest(requestVersion)) {
      return;
    }
    setStore((previous) =>
      completeReviewRun(previous, {
        runIssues: [],
        summary,
        files: results,
      }),
    );
    if (!isCurrentRequest(requestVersion)) {
      return;
    }
    setPreferredTab("issues");
    if (!isCurrentRequest(requestVersion)) {
      return;
    }
    setProcessedFiles(files.length);
  };

  return (
    <main>
      <h1>Software Project Tracker</h1>
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

      {pageModel.visibleSections.emptyHint ? <p>Upload schema first.</p> : null}
      {pageModel.visibleSections.readyHint ? <p>Schema ready for FRD upload.</p> : null}
      {pageModel.visibleSections.runningProgress ? (
        <p>
          Processing {pageModel.progress.processedFiles} / {pageModel.progress.totalFiles}
        </p>
      ) : null}

      <RunIssuePanelView model={contentModel.runIssuePanel} />

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

      {contentModel.detailPanel.fileId !== null ? (
        <section aria-label="File detail">
          <h2>File detail</h2>
          <div>
            {contentModel.detailPanel.availableTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                aria-pressed={contentModel.detailPanel.activeTab === tab}
                onClick={() => setPreferredTab(tab)}
              >
                {tab === "issues" ? "Issues" : "Readable FRD"}
              </button>
            ))}
          </div>

          {contentModel.detailPanel.activeTab === "issues" ? (
            <FileIssueTableView model={contentModel.detailPanel.issueTable} />
          ) : (
            <ReadableFrdSectionView sections={contentModel.detailPanel.readableView.sections} />
          )}
        </section>
      ) : null}
    </main>
  );
};

export default ReviewRunPage;
