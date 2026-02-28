import { describe, expect, it } from "vitest";

import { createRunBlockedResult } from "../../src/domain/review-run/createRunBlockedResult";
import { compileSchema } from "../../src/domain/validation/compileSchema";
import { mapRunIssue } from "../../src/domain/validation/mapRunIssue";
import { DEFAULT_SCHEMA_DRAFT } from "../../src/domain/validation/schemaDraftSupport";
import type { SchemaBundle } from "../../src/types/reviewContracts";

const makeSchemaBundle = (raw: Record<string, unknown>, declaredDraft: string | null): SchemaBundle => ({
  id: "schema-2",
  name: "schema.json",
  raw,
  declaredDraft,
  effectiveDraft: DEFAULT_SCHEMA_DRAFT,
});

describe("run-level blocked result behavior", () => {
  it("does not generate blocked result when schema compiles successfully", () => {
    const compileResult = compileSchema(
      makeSchemaBundle(
        {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          type: "object",
        },
        "2020-12",
      ),
    );

    const blockedResult = compileResult.ok ? null : createRunBlockedResult(compileResult.runIssues);
    expect(compileResult.ok).toBe(true);
    expect(blockedResult).toBeNull();
  });

  it("returns zero-summary and empty files when compile fails before file processing", () => {
    const compileResult = compileSchema(
      makeSchemaBundle(
        {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          type: "object",
          properties: {
            dueDate: { type: "string", format: "date" },
          },
        },
        "2020-12",
      ),
      { registerFormats: false },
    );

    expect(compileResult.ok).toBe(false);
    if (!compileResult.ok) {
      const blocked = createRunBlockedResult(compileResult.runIssues);
      expect(blocked.files).toEqual([]);
      expect(blocked.summary).toEqual({
        total: 0,
        passed: 0,
        failed: 0,
        parseFailed: 0,
      });
      expect(blocked.runIssues.length).toBeGreaterThan(0);
    }
  });

  it("preserves deterministic run issue order when multiple schema issues are mapped", () => {
    const first = mapRunIssue({ message: "first issue", path: "/$schema" });
    const second = mapRunIssue({ message: "second issue", path: "/" });
    const third = mapRunIssue({ message: "third issue", path: "/properties/dueDate" });

    const blocked = createRunBlockedResult([first, second, third]);
    expect(blocked.runIssues.map((issue) => issue.message)).toEqual([
      "first issue",
      "second issue",
      "third issue",
    ]);
  });
});
