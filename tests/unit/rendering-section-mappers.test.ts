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

  it("maps arrays of scalars as object field values", () => {
    const section = mapObjectSection({
      id: "obj-tags",
      title: "Tags",
      path: "/",
      value: {
        tags: ["a", "b"],
      },
    });

    expect(section.kind).toBe("object");
    expect(section.content.fields).toEqual([
      {
        key: "tags",
        label: "tags",
        path: "/tags",
        value: ["a", "b"],
      },
    ]);
  });

  it("normalizes field paths when parent path is non-root", () => {
    const section = mapObjectSection({
      id: "obj-parent",
      title: "Parent",
      path: "/parent",
      value: {
        name: "Acme",
      },
    });

    expect(section.content.fields[0]?.path).toBe("/parent/name");
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

  it("throws when object mapper receives nested object values", () => {
    expect(() =>
      mapObjectSection({
        id: "obj-nested",
        title: "Nested",
        path: "/",
        value: {
          nested: { k: "v" },
        },
      }),
    ).toThrow(/only supports scalar values or arrays of scalars/i);

    expect(() =>
      mapObjectSection({
        id: "obj-array-nested",
        title: "Array Nested",
        path: "/",
        value: {
          nestedArray: [{ k: "v" }],
        },
      }),
    ).toThrow(/only supports scalar values or arrays of scalars/i);
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

  it("escapes object field keys in JSON pointer paths per RFC 6901", () => {
    const section = mapObjectSection({
      id: "obj-escape",
      title: "Escaped",
      path: "/",
      value: {
        "a/b~c": "value",
      },
    });

    expect(section.content.fields[0]?.path).toBe("/a~1b~0c");
  });
});
