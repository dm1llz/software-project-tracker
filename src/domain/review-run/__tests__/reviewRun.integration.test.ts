import { describe, expect, it } from "vitest";

import { executeReviewRun } from "../executeReviewRun";
import invalidJsonFrd from "../../../test-fixtures/frd/invalid-json.frd?raw";
import invalidSchemaFrd from "../../../test-fixtures/frd/invalid-schema.frd?raw";
import validFrd from "../../../test-fixtures/frd/valid-frd.json?raw";
import unsupportedDraftSchema from "../../../test-fixtures/schema/unsupported-draft.json?raw";
import validSchema202012 from "../../../test-fixtures/schema/valid-2020-12.json?raw";

describe("executeReviewRun integration", () => {
  it("processes mixed FRD batches with deterministic file and summary results", async () => {
    const execution = await executeReviewRun({
      schemaSource: {
        name: "valid-2020-12.json",
        text: validSchema202012,
      },
      frdSources: [
        { name: "valid-frd.json", text: validFrd },
        { name: "invalid-json.frd", text: invalidJsonFrd },
        { name: "invalid-schema.frd", text: invalidSchemaFrd },
      ],
    });

    expect(execution.result.runIssues).toEqual([]);
    expect(execution.result.summary).toEqual({
      total: 3,
      passed: 1,
      failed: 1,
      parseFailed: 1,
    });

    const statusesByName = Object.fromEntries(
      execution.result.files.map((file) => [file.fileName, file.status]),
    );

    expect(statusesByName).toEqual({
      "valid-frd.json": "passed",
      "invalid-json.frd": "parse_failed",
      "invalid-schema.frd": "validation_failed",
    });

    const validResult = execution.result.files.find((file) => file.fileName === "valid-frd.json");
    expect(validResult?.sections?.length ?? 0).toBeGreaterThan(0);
  });

  it("blocks the run with SCHEMA_ERROR when the schema draft is unsupported", async () => {
    const execution = await executeReviewRun({
      schemaSource: {
        name: "unsupported-draft.json",
        text: unsupportedDraftSchema,
      },
      frdSources: [{ name: "valid-frd.json", text: validFrd }],
    });

    expect(execution.result.files).toEqual([]);
    expect(execution.result.summary).toEqual({
      total: 0,
      passed: 0,
      failed: 0,
      parseFailed: 0,
    });
    expect(execution.result.runIssues).toHaveLength(1);
    expect(execution.result.runIssues[0]?.code).toBe("SCHEMA_ERROR");
    expect(execution.result.runIssues[0]?.message).toContain("Schema compilation failed");
  });

  it("passes all files for all-valid batches", async () => {
    const execution = await executeReviewRun({
      schemaSource: {
        name: "valid-2020-12.json",
        text: validSchema202012,
      },
      frdSources: [
        { name: "valid-frd.json", text: validFrd },
        { name: "valid-frd-copy.json", text: validFrd },
      ],
    });

    expect(execution.result.runIssues).toEqual([]);
    expect(execution.result.summary).toEqual({
      total: 2,
      passed: 2,
      failed: 0,
      parseFailed: 0,
    });
    expect(execution.result.files.every((file) => file.status === "passed")).toBe(true);
  });
});
