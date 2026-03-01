// @vitest-environment jsdom
import { waitFor } from "@testing-library/dom";
import { useEffect } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as schemaCompiler from "../../src/domain/validation/compileSchema";
import {
  useReviewRunController,
  type UseReviewRunControllerResult,
} from "../../src/ui/hooks/useReviewRunController";

const makeJsonFile = (name: string, data: unknown): File =>
  new File([JSON.stringify(data)], name, { type: "application/json" });

const mountedRoots: Root[] = [];

type ControllerHarnessProps = {
  onUpdate: (controller: UseReviewRunControllerResult) => void;
};

const ControllerHarness = ({ onUpdate }: ControllerHarnessProps) => {
  const controller = useReviewRunController();

  useEffect(() => {
    onUpdate(controller);
  }, [controller, onUpdate]);

  return null;
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

describe("review run controller recovery behavior", () => {
  it("clears runtime schema internals after unexpected schema-upload exceptions", async () => {
    let latestController: UseReviewRunControllerResult | null = null;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    mountedRoots.push(root);

    await act(async () => {
      root.render(
        <ControllerHarness
          onUpdate={(controller) => {
            latestController = controller;
          }}
        />,
      );
    });

    await waitFor(() => {
      expect(latestController).not.toBeNull();
    });

    await act(async () => {
      await latestController?.handleSchemaUpload(
        makeJsonFile("schema-v1.json", {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          type: "object",
          required: ["title"],
          properties: {
            title: { type: "string" },
          },
          additionalProperties: false,
        }),
      );
    });

    await waitFor(() => {
      expect(latestController?.store.schemaName).toBe("schema-v1.json");
    });

    const compileSchemaSpy = vi
      .spyOn(schemaCompiler, "compileSchema")
      .mockImplementationOnce(() => {
        throw new Error("schema-compile-failure");
      });

    await act(async () => {
      await latestController?.handleSchemaUpload(
        makeJsonFile("schema-v2.json", {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          type: "object",
        }),
        true,
      );
    });
    compileSchemaSpy.mockRestore();

    await waitFor(() => {
      expect(latestController?.store.schemaName).toBeNull();
      expect(latestController?.store.hasCompletedRun).toBe(false);
      expect(latestController?.store.runIssues[0]?.code).toBe("RUNTIME_ERROR");
    });

    const issuesBeforeRetry = latestController?.store.runIssues.map((issue) => issue.message) ?? [];

    await act(async () => {
      await latestController?.handleFrdUpload([
        makeJsonFile("retry-without-schema.json", { title: "still-blocked" }),
      ]);
    });

    expect(latestController?.store.runIssues.map((issue) => issue.message)).toEqual(issuesBeforeRetry);
    expect(latestController?.store.files).toHaveLength(0);
    expect(latestController?.processedFiles).toBe(0);
    expect(latestController?.totalFiles).toBe(0);
  });
});
