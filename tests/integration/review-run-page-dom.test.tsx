// @vitest-environment jsdom
import { getByLabelText, getByRole, queryByRole, waitFor, within } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { ReviewRunPage } from "../../src/ui/ReviewRunPage";
import { createDeferred, makeDeferredTextFile } from "../helpers/deferredFile";

const makeJsonFile = (name: string, data: unknown): File =>
  new File([JSON.stringify(data)], name, { type: "application/json" });

const makeTextFile = (name: string, text: string): File =>
  new File([text], name, { type: "application/json" });

type RenderedPage = {
  root: Root;
  container: HTMLElement;
};

const mountedRoots: Root[] = [];

const renderPage = async (): Promise<RenderedPage> => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push(root);
  await act(async () => {
    root.render(<ReviewRunPage />);
  });
  return { root, container };
};

afterEach(async () => {
  const roots = mountedRoots.splice(0, mountedRoots.length);
  for (const root of roots) {
    await act(async () => {
      root.unmount();
    });
  }
  document.body.innerHTML = "";
});

describe("review run page DOM behavior", () => {
  it("renders issues/readable tabs conditionally and preserves distinct duplicate display names", async () => {
    const { container } = await renderPage();
    const user = userEvent.setup();

    const schemaInput = getByLabelText(container, "Schema file") as HTMLInputElement;
    await user.upload(
      schemaInput,
      makeJsonFile("schema.json", {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string" },
        },
        additionalProperties: false,
      }),
    );
    await waitFor(() => {
      expect(container.textContent).toContain("Schema ready for FRD upload.");
    });

    const frdInput = getByLabelText(container, "FRD files") as HTMLInputElement;
    await user.upload(frdInput, [
      makeJsonFile("feature.json", { title: "ok" }),
      makeJsonFile("feature.json", { extra: true }),
      makeTextFile("broken.json", "{\n  \"title\": \n"),
    ]);

    await waitFor(() => {
      expect(getByRole(container, "button", { name: "broken.json" })).toBeDefined();
      expect(getByRole(container, "button", { name: "feature.json (2)" })).toBeDefined();
      expect(getByRole(container, "button", { name: "feature.json (1)" })).toBeDefined();
    });

    const topRow = getByRole(container, "region", { name: "Review workspace top row" });
    expect(topRow.className).toContain("grid-cols-1");
    expect(topRow.className).toContain("lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]");
    expect(within(topRow).getByRole("region", { name: "Schema controls" })).toBeDefined();
    expect(within(topRow).getByRole("region", { name: "Review summary" })).toBeDefined();
    expect(within(topRow).getByRole("region", { name: "File results" })).toBeDefined();

    await user.click(getByRole(container, "button", { name: "feature.json (1)" }));
    expect(getByRole(container, "button", { name: "Readable FRD" })).toBeDefined();
    const detailRow = getByRole(container, "region", { name: "Review workspace detail row" });
    expect(detailRow.className).toContain("w-full");
    expect(within(detailRow).getByRole("region", { name: "File detail" })).toBeDefined();

    await user.click(getByRole(container, "button", { name: "broken.json" }));
    expect(queryByRole(container, "button", { name: "Readable FRD" })).toBeNull();

  });

  it("keeps FRD upload disabled after invalid schema upload", async () => {
    const { container } = await renderPage();
    const user = userEvent.setup();

    const schemaInput = getByLabelText(container, "Schema file") as HTMLInputElement;
    await user.upload(schemaInput, makeTextFile("bad-schema.json", "{\n  \"type\": \n"));

    await waitFor(() => {
      expect(container.textContent).toContain("Schema error");
    });

    const frdInput = getByLabelText(container, "FRD files") as HTMLInputElement;
    expect(frdInput.disabled).toBe(true);

  });

  it("keeps top-row controls visible when schema-level run issues render in detail row", async () => {
    const { container } = await renderPage();
    const user = userEvent.setup();

    const schemaInput = getByLabelText(container, "Schema file") as HTMLInputElement;
    await user.upload(schemaInput, makeTextFile("broken-schema.json", "{\n  \"type\": \n"));

    await waitFor(() => {
      expect(container.textContent).toContain("Schema error");
    });

    const topRow = getByRole(container, "region", { name: "Review workspace top row" });
    expect(within(topRow).getByRole("region", { name: "Schema controls" })).toBeDefined();
    expect(within(topRow).getByRole("region", { name: "Review summary" })).toBeDefined();
    expect(queryByRole(topRow, "region", { name: "File results" })).toBeNull();

    const detailRow = getByRole(container, "region", { name: "Review workspace detail row" });
    expect(within(detailRow).getByRole("region", { name: "Run issues" })).toBeDefined();
  });

  it("keeps mobile breakpoint layout stacked and navigable for completed runs", async () => {
    const { container } = await renderPage();
    const user = userEvent.setup();
    const originalInnerWidth = window.innerWidth;

    Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 });
    window.dispatchEvent(new Event("resize"));

    const schemaInput = getByLabelText(container, "Schema file") as HTMLInputElement;
    await user.upload(
      schemaInput,
      makeJsonFile("mobile-schema.json", {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string" },
        },
        additionalProperties: false,
      }),
    );

    await waitFor(() => {
      expect(container.textContent).toContain("Schema ready for FRD upload.");
    });

    const frdInput = getByLabelText(container, "FRD files") as HTMLInputElement;
    await user.upload(frdInput, [makeJsonFile("mobile.json", { title: "ok" })]);

    await waitFor(() => {
      expect(getByRole(container, "button", { name: "mobile.json" })).toBeDefined();
    });

    await user.click(getByRole(container, "button", { name: "mobile.json" }));
    expect(getByRole(container, "button", { name: "Readable FRD" })).toBeDefined();

    const topRow = getByRole(container, "region", { name: "Review workspace top row" });
    const detailRow = getByRole(container, "region", { name: "Review workspace detail row" });
    expect(topRow.className).toContain("grid-cols-1");
    expect((topRow.firstElementChild as HTMLElement).className).toContain("min-w-0");
    expect(detailRow.className).toContain("min-w-0");

    Object.defineProperty(window, "innerWidth", { configurable: true, value: originalInnerWidth });
    window.dispatchEvent(new Event("resize"));
  });

  it("surfaces mixed-array runtime failure details and allows retry with schema retained", async () => {
    const { container } = await renderPage();
    const user = userEvent.setup();

    const schemaInput = getByLabelText(container, "Schema file") as HTMLInputElement;
    await user.upload(
      schemaInput,
      makeJsonFile("runtime-schema.json", {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        required: ["items"],
        properties: {
          items: {},
        },
        additionalProperties: false,
      }),
    );

    await waitFor(() => {
      expect(container.textContent).toContain("Schema ready for FRD upload.");
    });

    const frdInput = getByLabelText(container, "FRD files") as HTMLInputElement;
    expect(frdInput.disabled).toBe(false);

    await user.upload(frdInput, [makeJsonFile("runtime-error.json", { items: [1, { nested: true }] })]);

    await waitFor(() => {
      expect(container.textContent).toContain("Run issues");
      expect(container.textContent).toContain("RUNTIME_ERROR");
      expect(container.textContent).toContain("Unexpected runtime failure");
      expect(container.textContent).toContain("Unsupported mixed array item types at path /items.");
    });

    expect(container.textContent).toContain("runtime-schema.json");
    expect(frdInput.disabled).toBe(false);

    await user.upload(frdInput, [makeJsonFile("retry-success.json", { items: [1, 2, 3] })]);

    await waitFor(() => {
      expect(getByRole(container, "button", { name: "retry-success.json" })).toBeDefined();
      expect(container.textContent).not.toContain("Unexpected runtime failure");
      expect(container.textContent).not.toContain("RUNTIME_ERROR");
    });
  });

  it("keeps the latest schema visible when overlapping schema uploads complete out of order", async () => {
    const { container } = await renderPage();
    const user = userEvent.setup();
    const slowSchema = createDeferred<string>();
    const fastSchema = createDeferred<string>();

    const schemaInput = getByLabelText(container, "Schema file") as HTMLInputElement;

    const slowUpload = user.upload(
      schemaInput,
      makeDeferredTextFile("schema-slow.json", slowSchema),
    );

    const fastUpload = user.upload(
      schemaInput,
      makeDeferredTextFile("schema-fast.json", fastSchema),
    );

    fastSchema.resolve(
      JSON.stringify({
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
      }),
    );
    await fastUpload;

    await waitFor(() => {
      expect(container.textContent).toContain("schema-fast.json");
      expect(container.textContent).toContain("Schema ready for FRD upload.");
    });

    slowSchema.resolve(
      JSON.stringify({
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string" },
        },
      }),
    );
    await slowUpload;

    await waitFor(() => {
      expect(container.textContent).toContain("schema-fast.json");
      expect(container.textContent).not.toContain("Schema error");
    });
  });

  it("replacing schema clears prior summary, file rows, and file-detail selection", async () => {
    const { container } = await renderPage();
    const user = userEvent.setup();

    const schemaInput = getByLabelText(container, "Schema file") as HTMLInputElement;
    const schemaPayload = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      required: ["title"],
      properties: {
        title: { type: "string" },
      },
      additionalProperties: false,
    };

    await user.upload(schemaInput, makeJsonFile("schema-v1.json", schemaPayload));
    await waitFor(() => {
      expect(container.textContent).toContain("Schema ready for FRD upload.");
    });

    const frdInput = getByLabelText(container, "FRD files") as HTMLInputElement;
    await user.upload(frdInput, [makeJsonFile("ok.json", { title: "hello" })]);

    await waitFor(() => {
      expect(getByRole(container, "button", { name: "ok.json" })).toBeDefined();
    });

    await user.click(getByRole(container, "button", { name: "ok.json" }));
    expect(container.textContent).toContain("File detail");

    const replaceInput = getByLabelText(container, "Replace schema file") as HTMLInputElement;
    await user.upload(replaceInput, makeJsonFile("schema-v2.json", schemaPayload));

    await waitFor(() => {
      expect(container.textContent).toContain("total: 0");
      expect(queryByRole(container, "button", { name: "ok.json" })).toBeNull();
      expect(container.textContent).not.toContain("File detail");
      expect(container.textContent).toContain("schema-v2.json");
    });

  });
});
