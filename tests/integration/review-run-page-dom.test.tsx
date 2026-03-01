// @vitest-environment jsdom
import { getByLabelText, getByRole, queryByRole, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { ReviewRunPage } from "../../src/ui/ReviewRunPage";

const makeJsonFile = (name: string, data: unknown): File =>
  new File([JSON.stringify(data)], name, { type: "application/json" });

const makeTextFile = (name: string, text: string): File =>
  new File([text], name, { type: "application/json" });

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

const createDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
};

const makeDeferredTextFile = (name: string, deferred: Deferred<string>): File => {
  const file = new File(["{}"], name, { type: "application/json" });
  Object.defineProperty(file, "text", {
    configurable: true,
    value: () => deferred.promise,
  });
  return file;
};

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

    await user.click(getByRole(container, "button", { name: "feature.json (1)" }));
    expect(getByRole(container, "button", { name: "Readable FRD" })).toBeDefined();

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
