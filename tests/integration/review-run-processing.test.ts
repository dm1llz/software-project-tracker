import { describe, expect, it } from "vitest";

import { buildReviewResult } from "../../src/domain/review-run/buildReviewResult";
import { mapReviewInputFiles } from "../../src/domain/review-run/mapReviewInputFiles";
import { parseFrdFile } from "../../src/domain/review-run/parseFrdFile";
import { processReviewRunBatch } from "../../src/domain/review-run/processReviewRunBatch";
import { sortReviewResults } from "../../src/domain/review-run/sortReviewResults";
import { summarizeBatchReview } from "../../src/domain/review-run/summarizeBatchReview";
import { validateFrdFile } from "../../src/domain/review-run/validateFrdFile";
import { compileSchema } from "../../src/domain/validation/compileSchema";
import { makeSchemaBundle } from "../helpers/schemaBundleHelper";

describe("review-run parse and validation pipeline", () => {
  it("produces deterministic mixed-batch results through the shared processor", async () => {
    const schemaRaw = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      required: ["title"],
      properties: {
        title: { type: "string" },
      },
      additionalProperties: false,
    } as const;

    const compileResult = compileSchema(
      makeSchemaBundle(
        schemaRaw,
        "2020-12",
      ),
    );
    expect(compileResult.ok).toBe(true);
    if (!compileResult.ok) {
      return;
    }

    const ingestResult = await mapReviewInputFiles([
      { name: "valid.json", text: "{\"title\":\"ok\"}" },
      { name: "parse-fail.json", text: "{\"title\": " },
      { name: "invalid.json", text: "{\"extra\":true}" },
      { name: "unreadable.json", text: async () => Promise.reject(new Error("disk unavailable")) },
    ]);
    const processed = await processReviewRunBatch({
      mappedFiles: ingestResult,
      validator: compileResult.validator,
      schemaRaw,
      concurrency: 2,
    });
    expect(processed.cancelled).toBe(false);
    if (processed.cancelled) {
      return;
    }

    const ordered = sortReviewResults(processed.files);
    expect(ordered.map((result) => result.status)).toEqual([
      "parse_failed",
      "parse_failed",
      "validation_failed",
      "passed",
    ]);
    expect(processed.summary).toEqual({
      total: 4,
      passed: 1,
      failed: 1,
      parseFailed: 2,
    });
  });

  it("keeps warning-only diagnostics as passed results", async () => {
    const compileResult = compileSchema(
      makeSchemaBundle(
        {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          type: "object",
          properties: {
            title: { type: "string" },
          },
          additionalProperties: true,
        },
        "2020-12",
      ),
    );
    expect(compileResult.ok).toBe(true);
    if (!compileResult.ok) {
      return;
    }

    const ingestResult = await mapReviewInputFiles([{ name: "warn.json", text: "{\"title\":\"ok\"}" }]);
    const file = ingestResult.files[0];
    expect(file).toBeDefined();
    if (!file) {
      return;
    }

    const parseResult = parseFrdFile(file);
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) {
      return;
    }

    const issues = validateFrdFile({
      fileId: file.id,
      fileName: file.fileName,
      parsed: parseResult.parsed,
      validator: compileResult.validator,
      warningDiagnostics: [
        {
          path: "/title",
          message: "non-fatal warning",
          keyword: "warning-source",
        },
      ],
    });

    const reviewResult = buildReviewResult({
      file,
      displayName: ingestResult.displayNameById[file.id] ?? file.fileName,
      parseResult,
      validationIssues: issues,
    });

    expect(reviewResult.status).toBe("passed");
    expect(reviewResult.valid).toBe(true);
    expect(reviewResult.issues).toHaveLength(1);
    expect(reviewResult.issues[0]?.level).toBe("warning");
  });

  it("summarizes all-parse-failed batches as parseFailed=total and passed=failed=0", async () => {
    const ingestResult = await mapReviewInputFiles([
      { name: "one.json", text: "{ bad" },
      { name: "two.json", text: "{ still bad" },
    ]);

    const reviewResults = ingestResult.files.map((file) =>
      buildReviewResult({
        file,
        displayName: ingestResult.displayNameById[file.id] ?? file.fileName,
        parseResult: parseFrdFile(file),
      }),
    );

    const summary = summarizeBatchReview(reviewResults);
    expect(summary).toEqual({
      total: 2,
      passed: 0,
      failed: 0,
      parseFailed: 2,
    });
  });

  it("keeps duplicate display names and read-failure upload indices stable", async () => {
    const schemaRaw = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        title: { type: "string" },
      },
      additionalProperties: true,
    } as const;

    const compileResult = compileSchema(
      makeSchemaBundle(
        schemaRaw,
        "2020-12",
      ),
    );
    expect(compileResult.ok).toBe(true);
    if (!compileResult.ok) {
      return;
    }

    const ingestResult = await mapReviewInputFiles([
      { name: "feature.json", text: "{\"title\":\"first\"}" },
      { name: "feature.json", text: "{\"title\":\"second\"}" },
      { name: "feature.json", text: async () => Promise.reject(new Error("permission denied")) },
      { name: "feature.json", text: "{\"title\":\"fourth\"}" },
    ]);

    const processed = await processReviewRunBatch({
      mappedFiles: ingestResult,
      validator: compileResult.validator,
      schemaRaw,
    });
    expect(processed.cancelled).toBe(false);
    if (processed.cancelled) {
      return;
    }

    const byId = new Map(processed.files.map((result) => [result.id, result]));
    expect(byId.get("frd-0-feature.json")?.displayName).toBe("feature.json (1)");
    expect(byId.get("frd-1-feature.json")?.displayName).toBe("feature.json (2)");
    expect(byId.get("frd-2-feature.json")?.displayName).toBe("feature.json (3)");
    expect(byId.get("frd-3-feature.json")?.displayName).toBe("feature.json (4)");
    expect(byId.get("frd-2-feature.json")?.uploadIndex).toBe(2);
    expect(byId.get("frd-2-feature.json")?.status).toBe("parse_failed");
    expect(processed.summary.total).toBe(4);
  });
});
