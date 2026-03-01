import { useCallback, useRef, useState } from "react";

import { mapReviewInputFiles } from "../../domain/review-run/mapReviewInputFiles";
import { processReviewRunBatch } from "../../domain/review-run/processReviewRunBatch";
import { compileSchema } from "../../domain/validation/compileSchema";
import { loadSchemaFile } from "../../domain/validation/loadSchemaFile";
import type { SchemaBundle } from "../../types/reviewContracts";
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
  toRecoverableRunErrorStoreState,
  toSchemaUploadErrorStoreState,
} from "../state/reviewRunErrorMapping";

const PROGRESS_BATCH_SIZE = 5;
const FILE_PROCESS_CONCURRENCY = 4;
const yieldToMacrotask = (): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, 0);
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
    reader.readAsText(file, "utf-8");
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
        setStore(toSchemaUploadErrorStoreState(loaded.runIssues));
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
        setStore(toSchemaUploadErrorStoreState(compiled.runIssues));
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
      const runIssues = [mapUnexpectedRunIssue(error)];
      setSchemaBundle(null);
      setValidator(null);
      setStore(toSchemaUploadErrorStoreState(runIssues));
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

      const processed = await processReviewRunBatch({
        mappedFiles: mapped,
        validator,
        schemaRaw: schemaBundle.raw,
        concurrency: FILE_PROCESS_CONCURRENCY,
        shouldContinue: () => isCurrentRequest(requestVersionRef, requestVersion),
        yieldToMacrotask,
        onFileProcessed: ({ completedCount, totalFiles: mappedTotalFiles }) => {
          if (
            !isCurrentRequest(requestVersionRef, requestVersion)
            || (completedCount !== mappedTotalFiles && completedCount % PROGRESS_BATCH_SIZE !== 0)
          ) {
            return;
          }
          setProcessedFiles(completedCount);
        },
      });
      if (processed.cancelled || !isCurrentRequest(requestVersionRef, requestVersion)) {
        return;
      }
      setStore((previous) =>
        completeReviewRun(previous, {
          runIssues: [],
          summary: processed.summary,
          files: processed.files,
        }),
      );
      setPreferredTabState("issues");
      setProcessedFiles(files.length);
    } catch (error) {
      if (!isCurrentRequest(requestVersionRef, requestVersion)) {
        return;
      }
      const runIssues = [mapUnexpectedRunIssue(error)];
      setStore((previous) => toRecoverableRunErrorStoreState(previous.schemaName, runIssues));
      // Reset transient runtime UI state for the active request after an FRD-processing error.
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
