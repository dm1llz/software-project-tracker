import { describe, expect, it } from "vitest";

import { buildRenderedSections } from "../../src/domain/rendering/buildRenderedSections";

describe("buildRenderedSections integration", () => {
  it("renders nested object and array structures with stable paths and ids", () => {
    const sections = buildRenderedSections({
      id: "root",
      title: "FRD",
      path: "/",
      value: {
        metadata: {
          owner: "team-a",
          tags: ["critical", "mvp"],
        },
        milestones: [
          { name: "alpha", done: false },
          { name: "beta", done: true },
        ],
      },
      schema: {
        title: "FRD",
        properties: {
          metadata: {
            title: "Metadata",
            properties: {
              owner: { title: "Owner" },
              tags: { title: "Tags" },
            },
          },
          milestones: {
            title: "Milestones",
            items: {
              properties: {
                name: { title: "Name" },
                done: { title: "Done" },
              },
            },
          },
        },
      },
    });

    const metadataArray = sections.find((section) => section.path === "/metadata/tags");
    const milestonesArray = sections.find((section) => section.path === "/milestones");

    expect(metadataArray).toEqual({
      id: "root-metadata-tags",
      title: "Tags",
      path: "/metadata/tags",
      kind: "array",
      content: {
        itemKind: "scalar",
        items: ["critical", "mvp"],
      },
    });
    expect(milestonesArray).toEqual({
      id: "root-milestones",
      title: "Milestones",
      path: "/milestones",
      kind: "array",
      content: {
        itemKind: "object",
        items: [
          {
            id: "root-milestones-item-1",
            title: "Item 1",
            fields: [
              { key: "name", label: "Name", path: "/milestones/0/name", value: "alpha" },
              { key: "done", label: "Done", path: "/milestones/0/done", value: false },
            ],
          },
          {
            id: "root-milestones-item-2",
            title: "Item 2",
            fields: [
              { key: "name", label: "Name", path: "/milestones/1/name", value: "beta" },
              { key: "done", label: "Done", path: "/milestones/1/done", value: true },
            ],
          },
        ],
      },
    });
  });

  it("throws for mixed scalar/object array item types", () => {
    expect(() =>
      buildRenderedSections({
        id: "mixed",
        title: "Mixed",
        path: "/",
        value: {
          badArray: [{ label: "ok" }, "unexpected"],
        },
      }),
    ).toThrow(/unsupported mixed array item types at path \/badArray/i);
  });

  it("renders deeply nested empty arrays as empty list sections", () => {
    const sections = buildRenderedSections({
      id: "deep",
      title: "Deep",
      path: "/",
      value: {
        a: {
          b: {
            items: [],
          },
        },
      },
    });

    const emptyArraySection = sections.find((section) => section.path === "/a/b/items");
    expect(emptyArraySection).toEqual({
      id: "deep-a-b-items",
      title: "items",
      path: "/a/b/items",
      kind: "array",
      content: {
        itemKind: "scalar",
        items: [],
      },
    });
  });
});
