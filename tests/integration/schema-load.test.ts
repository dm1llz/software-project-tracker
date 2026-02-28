import { describe, expect, it } from "vitest";

import { loadSchemaFile } from "../../src/domain/validation/loadSchemaFile";
import { DEFAULT_SCHEMA_DRAFT } from "../../src/domain/validation/schemaDraftSupport";

describe("schema file ingestion", () => {
  it("creates SchemaBundle with declaredDraft/effectiveDraft for explicit 2020-12", async () => {
    const result = await loadSchemaFile({
      name: "valid-schema.json",
      text: JSON.stringify({
        $schema: "2020-12",
        type: "object",
        properties: {
          name: { type: "string" },
        },
      }),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.blocked).toBe(false);
      expect(result.schema.name).toBe("valid-schema.json");
      expect(result.schema.declaredDraft).toBe("2020-12");
      expect(result.schema.effectiveDraft).toBe("2020-12");
      expect(result.runIssues).toHaveLength(0);
    }
  });

  it("normalizes supported $schema aliases to canonical draft identifiers", async () => {
    const cases = [
      "https://json-schema.org/draft/2020-12/schema",
      "http://json-schema.org/draft/2020-12/schema#",
      "draft2020-12",
      "meta/2020-12/schema",
    ];

    for (const schemaToken of cases) {
      const result = await loadSchemaFile({
        name: `uri-schema-${schemaToken}.json`,
        text: JSON.stringify({
          $schema: schemaToken,
          type: "object",
        }),
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.schema.declaredDraft).toBe(DEFAULT_SCHEMA_DRAFT);
        expect(result.schema.effectiveDraft).toBe(DEFAULT_SCHEMA_DRAFT);
      }
    }
  });

  it("returns run issue and blocks flow when schema root is a JSON array", async () => {
    const result = await loadSchemaFile({
      name: "array-root-schema.json",
      text: JSON.stringify([{ type: "object" }]),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.blocked).toBe(true);
      expect(result.runIssues).toHaveLength(1);
      const [issue] = result.runIssues;
      expect(issue.code).toBe("SCHEMA_ERROR");
      expect(issue.path).toBe("/");
      expect(issue.message).toContain("JSON object at the root");
    }
  });

  it("supports async schema text supplier success path", async () => {
    const result = await loadSchemaFile({
      name: "async-valid-schema.json",
      text: async () =>
        JSON.stringify({
          $schema: "https://json-schema.org/draft/2020-12/schema",
          type: "object",
        }),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.blocked).toBe(false);
      expect(result.schema.declaredDraft).toBe(DEFAULT_SCHEMA_DRAFT);
      expect(result.schema.effectiveDraft).toBe(DEFAULT_SCHEMA_DRAFT);
      expect(result.runIssues).toHaveLength(0);
    }
  });

  it("returns run issue with location and blocks flow for malformed schema JSON", async () => {
    const result = await loadSchemaFile({
      name: "broken-schema.json",
      text: "{\n  \"$schema\": \"2020-12\",\n  \"type\": \"object\",\n",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.blocked).toBe(true);
      expect(result.runIssues).toHaveLength(1);
      const [issue] = result.runIssues;
      expect(issue.code).toBe("SCHEMA_ERROR");
      expect(issue.path).toBe("/");
      expect(issue.line).toBeGreaterThan(0);
      expect(issue.column).toBeGreaterThan(0);
    }
  });

  it("returns run issue and blocks flow for empty or whitespace-only schema input", async () => {
    const cases = ["", "   \n\t  "];

    for (const value of cases) {
      const result = await loadSchemaFile({
        name: "blank-schema.json",
        text: value,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.blocked).toBe(true);
        expect(result.runIssues).toHaveLength(1);
        const [issue] = result.runIssues;
        expect(issue.code).toBe("SCHEMA_ERROR");
        expect(issue.path).toBe("/");
        expect(issue.message).toContain("Failed to parse schema file");
      }
    }
  });

  it("returns run issue and blocks flow when schema source text read fails", async () => {
    const result = await loadSchemaFile({
      name: "unreadable-schema.json",
      text: async () => {
        throw new Error("permission denied");
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.blocked).toBe(true);
      expect(result.runIssues).toHaveLength(1);
      const [issue] = result.runIssues;
      expect(issue.code).toBe("SCHEMA_ERROR");
      expect(issue.path).toBe("/");
      expect(issue.message).toContain("Failed to read schema file");
      expect(issue.message).toContain("permission denied");
    }
  });

  it("defaults effective draft to 2020-12 when schema omits $schema", async () => {
    const result = await loadSchemaFile({
      name: "implicit-draft-schema.json",
      text: JSON.stringify({
        type: "object",
        properties: {
          id: { type: "string" },
        },
      }),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.schema.declaredDraft).toBeNull();
      expect(result.schema.effectiveDraft).toBe(DEFAULT_SCHEMA_DRAFT);
    }
  });
});
