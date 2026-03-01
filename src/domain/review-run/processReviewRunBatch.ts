import type { ValidateFunction } from "ajv";

import { buildRenderedSections } from "../rendering/buildRenderedSections";
import type {
  BatchReviewSummary,
  FileIssue,
  ReviewInputFile,
  ReviewResult,
} from "../../types/reviewContracts";
import { buildReviewResult, hasErrorLevelIssues } from "./buildReviewResult";
import { uploadIndexFromFileId } from "./mapReviewInputFiles";
import { parseFrdFile } from "./parseFrdFile";
import { summarizeBatchReview } from "./summarizeBatchReview";
import { validateFrdFile } from "./validateFrdFile";

type ProcessReviewRunMappedFiles = {
  files: readonly ReviewInputFile[];
  fileIssues: readonly FileIssue[];
  displayNameById: Record<string, string>;
};

type ProcessReviewRunBatchInput = {
  mappedFiles: ProcessReviewRunMappedFiles;
  validator: ValidateFunction;
  schemaRaw: Record<string, unknown>;
  concurrency?: number;
  shouldContinue?: () => boolean;
  onFileProcessed?: (input: { completedCount: number; totalFiles: number }) => void | Promise<void>;
  yieldToMacrotask?: () => Promise<void>;
};

type ProcessReviewRunBatchSuccess = {
  cancelled: false;
  files: ReviewResult[];
  summary: BatchReviewSummary;
  processedCount: number;
};

type ProcessReviewRunBatchCancelled = {
  cancelled: true;
  processedCount: number;
};

export type ProcessReviewRunBatchResult =
  | ProcessReviewRunBatchSuccess
  | ProcessReviewRunBatchCancelled;

const noopYieldToMacrotask = async (): Promise<void> => {};

const mapReadFailureToReviewResult = (
  issue: FileIssue,
  displayNameById: Record<string, string>,
  fallbackIndex: number,
): ReviewResult => ({
  id: issue.fileId,
  uploadIndex: uploadIndexFromFileId(issue.fileId, fallbackIndex),
  fileName: issue.fileName,
  displayName: displayNameById[issue.fileId] ?? issue.fileName,
  status: "parse_failed",
  parseOk: false,
  valid: false,
  issues: [issue],
});

const processMappedFile = (
  file: ReviewInputFile,
  displayNameById: Record<string, string>,
  validator: ValidateFunction,
  schemaRaw: Record<string, unknown>,
): ReviewResult => {
  const displayName = displayNameById[file.id] ?? file.fileName;
  const parseResult = parseFrdFile(file);
  const validationIssues = parseResult.ok
    ? validateFrdFile({
        fileId: file.id,
        fileName: file.fileName,
        parsed: parseResult.parsed,
        validator,
      })
    : [];

  const sections = parseResult.ok && !hasErrorLevelIssues(validationIssues)
    ? buildRenderedSections({
        id: `${file.id}-root`,
        title: displayName,
        path: "/",
        value: parseResult.parsed,
        schema: schemaRaw,
      })
    : undefined;

  return buildReviewResult({
    file,
    displayName,
    parseResult,
    validationIssues,
    ...(sections ? { sections } : {}),
  });
};

export const processReviewRunBatch = async ({
  mappedFiles,
  validator,
  schemaRaw,
  concurrency = 1,
  shouldContinue = () => true,
  onFileProcessed,
  yieldToMacrotask = noopYieldToMacrotask,
}: ProcessReviewRunBatchInput): Promise<ProcessReviewRunBatchResult> => {
  const totalFiles = mappedFiles.files.length;
  const processedResults = new Array<ReviewResult>(totalFiles);
  const workerCount = Math.max(1, Math.min(concurrency, totalFiles || 1));
  let nextFileIndex = 0;
  let completedCount = 0;
  let cancelled = false;

  const workers = Array.from({ length: workerCount }, async () => {
    while (nextFileIndex < totalFiles) {
      if (!shouldContinue()) {
        cancelled = true;
        return;
      }

      const fileIndex = nextFileIndex;
      nextFileIndex += 1;
      await yieldToMacrotask();

      if (!shouldContinue()) {
        cancelled = true;
        return;
      }

      const file = mappedFiles.files[fileIndex];
      if (!file) {
        throw new Error(`Missing mapped file at index ${fileIndex}`);
      }

      processedResults[fileIndex] = processMappedFile(
        file,
        mappedFiles.displayNameById,
        validator,
        schemaRaw,
      );

      completedCount += 1;
      if (onFileProcessed) {
        await onFileProcessed({ completedCount, totalFiles });
      }
    }
  });

  await Promise.all(workers);

  if (cancelled) {
    return {
      cancelled: true,
      processedCount: completedCount,
    };
  }

  const results = [...processedResults];
  for (const [index, issue] of mappedFiles.fileIssues.entries()) {
    results.push(
      mapReadFailureToReviewResult(
        issue,
        mappedFiles.displayNameById,
        mappedFiles.files.length + index,
      ),
    );
  }

  return {
    cancelled: false,
    files: results,
    summary: summarizeBatchReview(results),
    processedCount: completedCount,
  };
};
