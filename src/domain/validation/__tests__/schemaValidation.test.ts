import { describe, expect, it } from "vitest";

import { compileSchema } from "../compileSchema";
import { detectUnsupportedDraft } from "../detectUnsupportedDraft";
import { mapRunIssue } from "../mapRunIssue";
import { makeSchemaBundle } from "../../../../tests/helpers/schemaBundleHelper";

describe("schema validation helpers", () => {
  it("compiles valid 2020-12 schemas", () => {
    const result = compileSchema(
      makeSchemaBundle(
        {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          type: "object",
          properties: {
            title: { type: "string" },
          },
        },
        "2020-12",
        "schema-1",
      ),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.runIssues).toEqual([]);
      expect(typeof result.validator).toBe("function");
    }
  });

  it("detects unsupported draft tokens and normalizes draft-07", () => {
    const issue = detectUnsupportedDraft({
      declaredDraft: "http://json-schema.org/draft-07/schema#",
      effectiveDraft: "2020-12",
    });

    expect(issue).not.toBeNull();
    if (!issue) {
      return;
    }

    expect(issue.code).toBe("SCHEMA_ERROR");
    expect(issue.path).toBe("/$schema");
    expect(issue.message).toContain("draft-07");
  });

  it("maps optional run-issue fields without adding undefined properties", () => {
    const issue = mapRunIssue({
      message: "Compilation failed",
      path: "/",
    });

    expect(issue).toEqual({
      level: "error",
      code: "SCHEMA_ERROR",
      message: "Compilation failed",
      path: "/",
    });
    expect("line" in issue).toBe(false);
    expect("column" in issue).toBe(false);
  });

  it("returns compile errors when formats plugin registration is disabled", () => {
    const result = compileSchema(
      makeSchemaBundle(
        {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          type: "object",
          properties: {
            dueDate: { type: "string", format: "date" },
          },
        },
        "2020-12",
        "schema-1",
      ),
      { registerFormats: false },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.runIssues).toHaveLength(1);
      expect(result.runIssues[0]?.message.toLowerCase()).toContain("format");
      expect(result.validator).toBeNull();
    }
  });
});
