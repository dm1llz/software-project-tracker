import { describe, expect, it } from "vitest";

import { compileSchema } from "../../src/domain/validation/compileSchema";
import { makeSchemaBundle } from "../helpers/schemaBundleHelper";

describe("compileSchema", () => {
  it("compiles a 2020-12 schema in strict mode", () => {
    const bundle = makeSchemaBundle(
      {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        properties: {
          id: { type: "string" },
        },
      },
      "2020-12",
    );

    const result = compileSchema(bundle);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.validator).toBe("function");
      expect(result.runIssues).toHaveLength(0);
    }
  });

  it("rejects unsupported draft declarations before compile", () => {
    const bundle = makeSchemaBundle(
      {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "object",
      },
      "http://json-schema.org/draft-07/schema#",
    );

    const result = compileSchema(bundle);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.runIssues).toHaveLength(1);
      const [issue] = result.runIssues;
      expect(issue.code).toBe("SCHEMA_ERROR");
      expect(issue.path).toBe("/$schema");
      expect(issue.message).toContain("expected 2020-12");
      expect(issue.message).toContain("draft-07");
    }
  });

  it("reports strict format compile errors when ajv-formats is not registered", () => {
    const bundle = makeSchemaBundle(
      {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        properties: {
          dueDate: { type: "string", format: "date" },
        },
      },
      "2020-12",
    );

    const result = compileSchema(bundle, { registerFormats: false });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.runIssues).toHaveLength(1);
      const [issue] = result.runIssues;
      expect(issue.code).toBe("SCHEMA_ERROR");
      expect(issue.path).toBe("/");
      expect(issue.message.toLowerCase()).toContain("format");
      expect(issue.message.toLowerCase()).toContain("date");
    }
  });
});
