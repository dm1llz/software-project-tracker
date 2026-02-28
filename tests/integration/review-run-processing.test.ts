import { describe, expect, it } from "vitest";

import { buildReviewResult } from "../../src/domain/review-run/buildReviewResult";
import { mapReviewInputFiles } from "../../src/domain/review-run/mapReviewInputFiles";
import { parseFrdFile } from "../../src/domain/review-run/parseFrdFile";
import { sortReviewResults } from "../../src/domain/review-run/sortReviewResults";
import { summarizeBatchReview } from "../../src/domain/review-run/summarizeBatchReview";
import { validateFrdFile } from "../../src/domain/review-run/validateFrdFile";
import { compileSchema } from "../../src/domain/validation/compileSchema";
import { makeSchemaBundle } from "../helpers/schemaBundleHelper";

describe("review-run parse and validation pipeline", () => {
  it("produces parse_failed, validation_failed, and passed in a mixed-quality batch", async () => {
    const compileResult = compileSchema(
      makeSchemaBundle(
        {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          type: "object",
          required: ["title"],
          properties: {
            title: { type: "string" },
          },
          additionalProperties: false,
        },
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
    ]);

    const reviewResults = ingestResult.files.map((file) => {
      const displayName = ingestResult.displayNameById[file.id] ?? file.fileName;
      const parseResult = parseFrdFile(file);
      const validationIssues = parseResult.ok
        ? validateFrdFile({
            fileId: file.id,
            fileName: file.fileName,
            parsed: parseResult.parsed,
            validator: compileResult.validator,
          })
        : [];
      return buildReviewResult({
        file,
        displayName,
        parseResult,
        validationIssues,
      });
    });

    const ordered = sortReviewResults(reviewResults);
    expect(ordered.map((result) => result.status)).toEqual([
      "parse_failed",
      "validation_failed",
      "passed",
    ]);
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
});
