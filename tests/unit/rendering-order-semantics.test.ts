import { describe, expect, it } from "vitest";

import { assertSemanticPreservation } from "../../src/domain/rendering/assertSemanticPreservation";
import { mapObjectSection } from "../../src/domain/rendering/mapObjectSection";
import { orderFields } from "../../src/domain/rendering/orderFields";

describe("rendering order and semantics", () => {
  it("uses schema property order when available", () => {
    const ordered = orderFields({
      value: {
        third: 3,
        first: 1,
        second: 2,
      },
      fieldSchemas: {
        first: { title: "First" },
        second: { title: "Second" },
      },
    });

    expect(ordered).toEqual(["first", "second", "third"]);
  });

  it("falls back to source key order when schema order is unavailable", () => {
    const ordered = orderFields({
      value: {
        b: 2,
        a: 1,
        c: 3,
      },
    });

    expect(ordered).toEqual(["b", "a", "c"]);
  });

  it("throws when rendered value changes semantic type", () => {
    expect(() =>
      assertSemanticPreservation({
        source: "42",
        rendered: 42,
        context: "numeric string coercion",
      }),
    ).toThrow(/semantic preservation failed/i);
  });

  it("applies schema-first order in mapped object fields", () => {
    const section = mapObjectSection({
      id: "ordered-object",
      title: "Ordered",
      path: "/",
      value: {
        third: 3,
        first: 1,
        second: 2,
      },
      fieldSchemas: {
        first: { title: "First" },
        second: { title: "Second" },
      },
    });

    expect(section.content.fields.map((field) => field.key)).toEqual(["first", "second", "third"]);
  });
});
