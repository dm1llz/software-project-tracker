import { useCallback, useRef, useState } from "react";

import { buildRenderedSections } from "../../domain/rendering/buildRenderedSections";
import { buildReviewResult } from "../../domain/review-run/buildReviewResult";
import { mapReviewInputFiles } from "../../domain/review-run/mapReviewInputFiles";
import { parseFrdFile } from "../../domain/review-run/parseFrdFile";
import { summarizeBatchReview } from "../../domain/review-run/summarizeBatchReview";
import { validateFrdFile } from "../../domain/review-run/validateFrdFile";
import { compileSchema } from "../../domain/validation/compileSchema";
import { loadSchemaFile } from "../../domain/validation/loadSchemaFile";
import type {
  FileIssue,
  ReviewResult,
  SchemaBundle,
} from "../../types/reviewContracts";
import { applyReplaceSchemaAction } from "../components/SchemaControlPanel";
import type { FileDetailTab } from "../components/FileDetailPanel";
import { deriveScreenStateFromStore } from "../state/reviewRunScreenStateHelpers";
import {
  beginRequest,
  isCurrentRequest,
} from "../state/reviewRunRequestGuards";
import {
  completeReviewRun,
  createReviewRunStoreState,
  selectReviewFile,
  startReviewRun,
  type ReviewRunStoreState,
} from "../state/reviewRunStore";
import {
  mapUnexpectedRunIssue,
  toErrorStoreState,
} from "../state/reviewRunErrorMapping";

const PROGRESS_BATCH_SIZE = 5;

const toUploadIndexFromFileId = (fileId: string, fallbackIndex: number): number => {
  const match = fileId.match(/^frd-(\d+)-/);
  if (!match || !match[1]) {
    return fallbackIndex;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isNaN(parsed) ? fallbackIndex : parsed;
};

const mapReadFailureToReviewResult = (
  issue: FileIssue,
  displayNameById: Record<string, string>,
  fallbackIndex: number,
): ReviewResult => ({
  id: issue.fileId,
  uploadIndex: toUploadIndexFromFileId(issue.fileId, fallbackIndex),
  fileName: issue.fileName,
  displayName: displayNameById[issue.fileId] ?? issue.fileName,
  status: "parse_failed",
  parseOk: false,
  valid: false,
  issues: [issue],
});

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

export type UseReviewRunControllerResult = {
  store: ReviewRunStoreState;
  processedFiles: number;
  totalFiles: number;
  preferredTab: FileDetailTab;
  handleSchemaUpload: (file: File, replaceMode?: boolean) => Promise<void>;
  handleFrdUpload: (files: File[]) => Promise<void>;
  selectFile: (fileId: string | null) => void;
  setPreferredTab: (tab: FileDetailTab) => void;
};

export const useReviewRunController = (): UseReviewRunControllerResult => {
  const [store, setStore] = useState<ReviewRunStoreState>(() => createReviewRunStoreState(null));
  const [schemaBundle, setSchemaBundle] = useState<SchemaBundle | null>(null);
  const [validator, setValidator] = useState<ReturnType<typeof compileSchema>["validator"]>(null);
  const [preferredTab, setPreferredTabState] = useState<FileDetailTab>("issues");
  const [processedFiles, setProcessedFiles] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const requestVersionRef = useRef(0);

  const setPreferredTab = useCallback((tab: FileDetailTab) => {
    setPreferredTabState(tab);
  }, []);

  const resetRuntimeState = useCallback((requestVersion: number) => {
    if (!isCurrentRequest(requestVersionRef, requestVersion)) {
      return;
    }
    setPreferredTabState("issues");
    setProcessedFiles(0);
    setTotalFiles(0);
  }, []);

  const handleSchemaUpload = useCallback(async (file: File, replaceMode = false): Promise<void> => {
    const requestVersion = beginRequest(requestVersionRef);

    try {
      if (replaceMode) {
        if (!isCurrentRequest(requestVersionRef, requestVersion)) {
          return;
        }
        setStore((previous) => {
          const currentScreenState = deriveScreenStateFromStore(previous);
          return applyReplaceSchemaAction({
            state: previous,
            screenState: currentScreenState,
            nextSchemaName: file.name,
          });
        });
        setSchemaBundle(null);
        setValidator(null);
        resetRuntimeState(requestVersion);
      }

      const loaded = await loadSchemaFile({
        name: file.name,
        text: () => readFileText(file),
      });
      if (!isCurrentRequest(requestVersionRef, requestVersion)) {
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
      if (!isCurrentRequest(requestVersionRef, requestVersion)) {
        return;
      }
      if (!compiled.ok) {
        setSchemaBundle(null);
        setValidator(null);
        setStore(toErrorStoreState(compiled.runIssues));
        resetRuntimeState(requestVersion);
        return;
      }

      if (!isCurrentRequest(requestVersionRef, requestVersion)) {
        return;
      }
      setSchemaBundle(loaded.schema);
      setValidator(() => compiled.validator);
      setStore(createReviewRunStoreState(loaded.schema.name));
      resetRuntimeState(requestVersion);
    } catch (error) {
      if (!isCurrentRequest(requestVersionRef, requestVersion)) {
        return;
      }
      setStore(toErrorStoreState([mapUnexpectedRunIssue(error)]));
      resetRuntimeState(requestVersion);
    }
  }, [resetRuntimeState]);

  const handleFrdUpload = useCallback(async (files: File[]): Promise<void> => {
    if (!schemaBundle || !validator || files.length === 0) {
      return;
    }

    const requestVersion = beginRequest(requestVersionRef);

    try {
      if (!isCurrentRequest(requestVersionRef, requestVersion)) {
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
      if (!isCurrentRequest(requestVersionRef, requestVersion)) {
        return;
      }

      const results: ReviewResult[] = [];
      for (const [index, file] of mapped.files.entries()) {
        if (!isCurrentRequest(requestVersionRef, requestVersion)) {
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

        results.push(
          buildReviewResult({
            file,
            displayName,
            parseResult,
            validationIssues,
            ...(sections ? { sections } : {}),
          }),
        );

        const processedCount = index + 1;
        if (processedCount === mapped.files.length || processedCount % PROGRESS_BATCH_SIZE === 0) {
          setProcessedFiles(processedCount);
        }
      }

      for (const [index, issue] of mapped.fileIssues.entries()) {
        if (!isCurrentRequest(requestVersionRef, requestVersion)) {
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

      if (!isCurrentRequest(requestVersionRef, requestVersion)) {
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
      setPreferredTabState("issues");
      setProcessedFiles(files.length);
    } catch (error) {
      if (!isCurrentRequest(requestVersionRef, requestVersion)) {
        return;
      }
      setStore(toErrorStoreState([mapUnexpectedRunIssue(error)]));
      resetRuntimeState(requestVersion);
    }
  }, [resetRuntimeState, schemaBundle, validator]);

  const selectFile = useCallback((fileId: string | null) => {
    setStore((previous) => selectReviewFile(previous, fileId));
    setPreferredTabState("issues");
  }, []);

  return {
    store,
    processedFiles,
    totalFiles,
    preferredTab,
    handleSchemaUpload,
    handleFrdUpload,
    selectFile,
    setPreferredTab,
  };
};
