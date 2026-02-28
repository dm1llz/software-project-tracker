import { describe, expect, it } from "vitest";

import { buildReviewResult } from "../buildReviewResult";
import { parseFrdFile } from "../parseFrdFile";
import { sortReviewResults } from "../sortReviewResults";
import { summarizeBatchReview } from "../summarizeBatchReview";
import { validateFrdFile } from "../validateFrdFile";
import { compileSchema } from "../../validation/compileSchema";
import type { ReviewInputFile } from "../../../types/reviewContracts";
import { makeSchemaBundle } from "../../../../tests/helpers/schemaBundleHelper";

const makeFile = (overrides: Partial<ReviewInputFile> = {}): ReviewInputFile => ({
  id: "frd-0-file",
  fileName: "file.json",
  uploadIndex: 0,
  text: "{}",
  ...overrides,
});

describe("review-run utils", () => {
  it("builds passed results for parse+validation success", () => {
    const file = makeFile({ text: JSON.stringify({ title: "ok" }) });
    const parseResult = parseFrdFile(file);

    const compiled = compileSchema(
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
        "schema-0",
      ),
    );

    expect(parseResult.ok).toBe(true);
    expect(compiled.ok).toBe(true);
    if (!parseResult.ok || !compiled.ok) {
      return;
    }

    const issues = validateFrdFile({
      fileId: file.id,
      fileName: file.fileName,
      parsed: parseResult.parsed,
      validator: compiled.validator,
    });

    const result = buildReviewResult({
      file,
      displayName: "file.json",
      parseResult,
      validationIssues: issues,
      sections: [],
    });

    expect(result.status).toBe("passed");
    expect(result.valid).toBe(true);
    expect(result.parseOk).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("maps malformed JSON to parse_failed with parse issue", () => {
    const file = makeFile({
      id: "frd-2-bad",
      fileName: "broken.json",
      uploadIndex: 2,
      text: "{\n  \"title\": ",
    });

    const parseResult = parseFrdFile(file);
    expect(parseResult.ok).toBe(false);
    if (parseResult.ok) {
      return;
    }

    const result = buildReviewResult({
      file,
      displayName: "broken.json",
      parseResult,
    });

    expect(result.status).toBe("parse_failed");
    expect(result.parseOk).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.code).toBe("PARSE_ERROR");
    expect(result.issues[0]?.fileId).toBe(file.id);
  });

  it("keeps warning-only diagnostics non-blocking and deterministic in summary ordering", () => {
    const schema = compileSchema(
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
        "schema-0",
      ),
    );

    expect(schema.ok).toBe(true);
    if (!schema.ok) {
      return;
    }

    const warningFile = makeFile({
      id: "frd-1-warning",
      fileName: "warning.json",
      uploadIndex: 1,
      text: JSON.stringify({ title: "warn" }),
    });

    const warningParse = parseFrdFile(warningFile);
    expect(warningParse.ok).toBe(true);
    if (!warningParse.ok) {
      return;
    }

    const warningIssues = validateFrdFile({
      fileId: warningFile.id,
      fileName: warningFile.fileName,
      parsed: warningParse.parsed,
      validator: schema.validator,
      warningDiagnostics: [{ path: "/title", message: "Title style warning" }],
    });

    const warningResult = buildReviewResult({
      file: warningFile,
      displayName: "warning.json",
      parseResult: warningParse,
      validationIssues: warningIssues,
      sections: [],
    });

    expect(warningResult.status).toBe("passed");
    expect(warningResult.issues).toHaveLength(1);
    expect(warningResult.issues[0]?.level).toBe("warning");

    const parseFile = makeFile({
      id: "frd-0-parse",
      fileName: "parse.json",
      uploadIndex: 0,
      text: "{",
    });
    const parseFailed = buildReviewResult({
      file: parseFile,
      displayName: "parse.json",
      parseResult: parseFrdFile(parseFile),
    });

    const invalidFile = makeFile({
      id: "frd-2-invalid",
      fileName: "invalid.json",
      uploadIndex: 2,
      text: JSON.stringify({}),
    });
    const validationFailed = buildReviewResult({
      file: invalidFile,
      displayName: "invalid.json",
      parseResult: parseFrdFile(invalidFile),
      validationIssues: [
        {
          fileId: "frd-2-invalid",
          fileName: "invalid.json",
          code: "VALIDATION_ERROR",
          level: "error",
          path: "/title",
          message: "required: must have required property 'title'",
          keyword: "required",
        },
      ],
    });

    const ordered = sortReviewResults([warningResult, validationFailed, parseFailed]);
    expect(ordered.map((item) => item.status)).toEqual([
      "parse_failed",
      "validation_failed",
      "passed",
    ]);

    const summary = summarizeBatchReview(ordered);
    expect(summary).toEqual({
      total: 3,
      passed: 1,
      failed: 1,
      parseFailed: 1,
    });
  });
});
