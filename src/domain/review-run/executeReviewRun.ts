import type {
  ReviewRunResult,
  RunIssue,
  SchemaBundle,
} from "../../types/reviewContracts";
import { compileSchema } from "../validation/compileSchema";
import { loadSchemaFile } from "../validation/loadSchemaFile";
import { createRunBlockedResult } from "./createRunBlockedResult";
import { mapReviewInputFiles, type ReviewFileSource } from "./mapReviewInputFiles";
import { processReviewRunBatch } from "./processReviewRunBatch";

export type ReviewSchemaSource = {
  name: string;
  text: string | (() => Promise<string>);
};

export type ExecuteReviewRunInput = {
  schemaSource: ReviewSchemaSource;
  frdSources: readonly ReviewFileSource[];
};

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
    const processed = await processReviewRunBatch({
      mappedFiles: mapped,
      validator: compiledSchema.validator,
      schemaRaw: loadedSchema.schema.raw,
    });
    if (processed.cancelled) {
      return {
        result: createRunBlockedResult([toUnexpectedRunIssue("Review run processing cancelled unexpectedly.")]),
        schema: loadedSchema.schema,
      };
    }

    return {
      result: {
        runIssues: [],
        summary: processed.summary,
        files: processed.files,
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
