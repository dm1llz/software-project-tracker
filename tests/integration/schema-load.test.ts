import { describe, expect, it } from "vitest";

import { loadSchemaFile } from "../../src/domain/validation/loadSchemaFile";

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
      expect(result.schema.effectiveDraft).toBe("2020-12");
    }
  });
});
