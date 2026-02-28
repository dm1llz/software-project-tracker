import { describe, expect, it } from "vitest";

import { assertSemanticPreservation } from "../assertSemanticPreservation";
import { mapObjectSection } from "../mapObjectSection";
import { mapScalarFieldValue } from "../mapScalarFieldValue";
import { orderFields } from "../orderFields";

describe("rendering utils", () => {
  it("orders object fields by schema first, then source remainder", () => {
    const ordered = orderFields({
      value: {
        third: 3,
        first: 1,
        fourth: 4,
        second: 2,
      },
      fieldSchemas: {
        first: { title: "First" },
        second: { title: "Second" },
      },
    });

    expect(ordered).toEqual(["first", "second", "third", "fourth"]);
  });

  it("preserves scalar-array semantics and returns copied arrays", () => {
    const source = ["a", "b", null] as const;
    const mapped = mapScalarFieldValue(
      [...source],
      "object field (/items)",
      "unsupported",
    );

    expect(mapped).toEqual(source);
    expect(Array.isArray(mapped)).toBe(true);
    if (Array.isArray(mapped)) {
      expect(mapped).not.toBe(source);
    }
  });

  it("throws for unsupported semantic transformations", () => {
    expect(() =>
      assertSemanticPreservation({
        source: "42",
        rendered: 42,
        context: "coercion",
      }),
    ).toThrow(/semantic preservation failed/i);
  });

  it("maps object fields with schema-first order and labels", () => {
    const section = mapObjectSection({
      id: "obj-1",
      title: "Object",
      path: "/",
      value: {
        b: 2,
        a: 1,
      },
      fieldSchemas: {
        a: { title: "A label" },
      },
    });

    expect(section.kind).toBe("object");
    expect(section.content.fields.map((field) => field.key)).toEqual(["a", "b"]);
    expect(section.content.fields[0]?.label).toBe("A label");
    expect(section.content.fields[1]?.label).toBe("b");
  });
});
