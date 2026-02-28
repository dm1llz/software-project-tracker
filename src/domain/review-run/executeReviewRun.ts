import { buildRenderedSections } from "../rendering/buildRenderedSections";
import type {
  FileIssue,
  ReviewResult,
  ReviewRunResult,
  RunIssue,
  SchemaBundle,
} from "../../types/reviewContracts";
import { compileSchema } from "../validation/compileSchema";
import { loadSchemaFile } from "../validation/loadSchemaFile";
import { buildReviewResult } from "./buildReviewResult";
import { createRunBlockedResult } from "./createRunBlockedResult";
import { mapReviewInputFiles, type ReviewFileSource } from "./mapReviewInputFiles";
import { parseFrdFile } from "./parseFrdFile";
import { summarizeBatchReview } from "./summarizeBatchReview";
import { validateFrdFile } from "./validateFrdFile";

export type ReviewSchemaSource = {
  name: string;
  text: string | (() => Promise<string>);
};

export type ExecuteReviewRunInput = {
  schemaSource: ReviewSchemaSource;
  frdSources: readonly ReviewFileSource[];
};

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
) => ({
  id: issue.fileId,
  uploadIndex: toUploadIndexFromFileId(issue.fileId, fallbackIndex),
  fileName: issue.fileName,
  displayName: displayNameById[issue.fileId] ?? issue.fileName,
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

export type ExecuteReviewRunResult = {
  result: ReviewRunResult;
  schema: SchemaBundle | null;
};

export const executeReviewRun = async ({
  schemaSource,
  frdSources,
}: ExecuteReviewRunInput): Promise<ExecuteReviewRunResult> => {
  try {
    const loadedSchema = await loadSchemaFile(schemaSource);
    if (!loadedSchema.ok) {
      return {
        result: createRunBlockedResult(loadedSchema.runIssues),
        schema: null,
      };
    }

    const compiledSchema = compileSchema(loadedSchema.schema);
    if (!compiledSchema.ok) {
      return {
        result: createRunBlockedResult(compiledSchema.runIssues),
        schema: loadedSchema.schema,
      };
    }

    const mapped = await mapReviewInputFiles(frdSources);
    const results: ReviewResult[] = [];

    for (const file of mapped.files) {
      const displayName = mapped.displayNameById[file.id] ?? file.fileName;
      const parseResult = parseFrdFile(file);
      const validationIssues = parseResult.ok
        ? validateFrdFile({
            fileId: file.id,
            fileName: file.fileName,
            parsed: parseResult.parsed,
            validator: compiledSchema.validator,
          })
        : [];

      const hasErrorIssues = validationIssues.some((issue) => issue.level === "error");
      let sections;
      if (parseResult.ok && !hasErrorIssues) {
        sections = buildRenderedSections({
          id: `${file.id}-root`,
          title: displayName,
          path: "/",
          value: parseResult.parsed,
          schema: loadedSchema.schema.raw,
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
    }

    for (const [index, issue] of mapped.fileIssues.entries()) {
      results.push(mapReadFailureToReviewResult(issue, mapped.displayNameById, mapped.files.length + index));
    }

    return {
      result: {
        runIssues: [],
        summary: summarizeBatchReview(results),
        files: results,
      },
      schema: loadedSchema.schema,
    };
  } catch (error) {
    return {
      result: createRunBlockedResult([toUnexpectedRunIssue(error)]),
      schema: null,
    };
  }
};
