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

type RenderedPage = {
  root: Root;
  container: HTMLElement;
};

const renderPage = async (): Promise<RenderedPage> => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<ReviewRunPage />);
  });
  return { root, container };
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("review run page DOM behavior", () => {
  it("renders issues/readable tabs conditionally and preserves distinct duplicate display names", async () => {
    const { root, container } = await renderPage();
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

    await act(async () => {
      root.unmount();
    });
  });

  it("keeps FRD upload disabled after invalid schema upload", async () => {
    const { root, container } = await renderPage();
    const user = userEvent.setup();

    const schemaInput = getByLabelText(container, "Schema file") as HTMLInputElement;
    await user.upload(schemaInput, makeTextFile("bad-schema.json", "{\n  \"type\": \n"));

    await waitFor(() => {
      expect(container.textContent).toContain("Schema error");
    });

    const frdInput = getByLabelText(container, "FRD files") as HTMLInputElement;
    expect(frdInput.disabled).toBe(true);

    await act(async () => {
      root.unmount();
    });
  });

  it("replacing schema clears prior summary, file rows, and file-detail selection", async () => {
    const { root, container } = await renderPage();
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

    await act(async () => {
      root.unmount();
    });
  });
});
