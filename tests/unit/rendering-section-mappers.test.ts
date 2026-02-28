import { describe, expect, it } from "vitest";

import { mapObjectSection } from "../../src/domain/rendering/mapObjectSection";
import { mapScalarSection } from "../../src/domain/rendering/mapScalarSection";

describe("rendering section mappers", () => {
  it("renders a simple object into one object section with labeled scalar fields", () => {
    const section = mapObjectSection({
      id: "obj-1",
      title: "Root",
      path: "/",
      value: {
        name: "Acme",
        version: 3,
      },
      fieldSchemas: {
        name: { description: "Display name", title: "Name" },
      },
    });

    expect(section.kind).toBe("object");
    expect(section.path).toBe("/");
    expect(section.content.fields).toEqual([
      {
        key: "name",
        label: "Name",
        path: "/name",
        value: "Acme",
        description: "Display name",
      },
      {
        key: "version",
        label: "version",
        path: "/version",
        value: 3,
      },
    ]);
  });

  it("throws controlled error when scalar mapper receives unsupported runtime value", () => {
    expect(() =>
      mapScalarSection({
        id: "scalar-err",
        title: "Bad Scalar",
        path: "/bad",
        value: { not: "scalar" },
      }),
    ).toThrow(/unsupported scalar value/i);
  });

  it("preserves null scalar values without coercion", () => {
    const section = mapScalarSection({
      id: "scalar-null",
      title: "Nullable",
      path: "/nullable",
      value: null,
    });

    expect(section.kind).toBe("scalar");
    expect(section.path).toBe("/nullable");
    expect(section.content.value).toBeNull();
  });
});
