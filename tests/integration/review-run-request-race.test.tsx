// @vitest-environment jsdom
import { waitFor } from "@testing-library/dom";
import { useEffect } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import {
  useReviewRunController,
  type UseReviewRunControllerResult,
} from "../../src/ui/hooks/useReviewRunController";
import { createDeferred, makeDeferredTextFile } from "../helpers/deferredFile";

const makeJsonFile = (name: string, data: unknown): File =>
  new File([JSON.stringify(data)], name, { type: "application/json" });

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

const mountedRoots: Root[] = [];

afterEach(async () => {
  const roots = mountedRoots.splice(0, mountedRoots.length);
  for (const root of roots) {
    await act(async () => {
      root.unmount();
    });
  }
  document.body.innerHTML = "";
});

describe("review run controller request race behavior", () => {
  it("keeps the latest schema upload state when an earlier slower upload resolves later", async () => {
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

    const slowSchema = createDeferred<string>();
    const fastSchema = createDeferred<string>();
    const slowSchemaUpload = latestController?.handleSchemaUpload(
      makeDeferredTextFile("schema-slow.json", slowSchema),
    );
    const fastSchemaUpload = latestController?.handleSchemaUpload(
      makeDeferredTextFile("schema-fast.json", fastSchema),
    );

    fastSchema.resolve(
      JSON.stringify({
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "number" },
        },
        additionalProperties: false,
      }),
    );

    await act(async () => {
      await fastSchemaUpload;
    });

    await waitFor(() => {
      expect(latestController?.store.schemaName).toBe("schema-fast.json");
    });

    slowSchema.resolve(
      JSON.stringify({
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string" },
        },
        additionalProperties: false,
      }),
    );

    await act(async () => {
      await slowSchemaUpload;
    });

    expect(latestController?.store.schemaName).toBe("schema-fast.json");
    expect(latestController?.store.runIssues).toEqual([]);

    await act(async () => {
      await latestController?.handleFrdUpload([makeJsonFile("latest-schema-frd.json", { id: 42 })]);
    });

    await waitFor(() => {
      expect(latestController?.store.summary).toEqual({
        total: 1,
        passed: 1,
        failed: 0,
        parseFailed: 0,
      });
      expect(latestController?.store.files[0]?.status).toBe("passed");
    });
  });

  it("ignores a late failure from an earlier schema upload after a newer upload succeeded", async () => {
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

    const slowSchema = createDeferred<string>();
    const fastSchema = createDeferred<string>();

    const slowUpload = latestController?.handleSchemaUpload(
      makeDeferredTextFile("schema-slow-failure.json", slowSchema),
    );
    const fastUpload = latestController?.handleSchemaUpload(
      makeDeferredTextFile("schema-latest-success.json", fastSchema),
    );

    fastSchema.resolve(
      JSON.stringify({
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "number" },
        },
      }),
    );

    await act(async () => {
      await fastUpload;
    });

    await waitFor(() => {
      expect(latestController?.store.schemaName).toBe("schema-latest-success.json");
    });

    slowSchema.reject(new Error("slow-schema-read-failure"));
    await act(async () => {
      try {
        await slowUpload;
      } catch {
        // No-op: stale promise rejection should not mutate current controller state.
      }
    });

    expect(latestController?.store.schemaName).toBe("schema-latest-success.json");
    expect(latestController?.store.runIssues).toEqual([]);

    await act(async () => {
      await latestController?.handleFrdUpload([makeJsonFile("still-works.json", { id: 9 })]);
    });

    await waitFor(() => {
      expect(latestController?.store.summary.passed).toBe(1);
      expect(latestController?.store.files[0]?.fileName).toBe("still-works.json");
    });
  });

  it("keeps progress counters and final files aligned to the latest overlapping FRD upload", async () => {
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
    });

    await waitFor(() => {
      expect(latestController?.store.schemaName).toBe("schema.json");
    });

    const firstBatchSlowA = createDeferred<string>();
    const firstBatchSlowB = createDeferred<string>();
    const firstUpload = latestController?.handleFrdUpload([
      makeDeferredTextFile("stale-a.json", firstBatchSlowA),
      makeDeferredTextFile("stale-b.json", firstBatchSlowB),
    ]);

    const secondBatchFast = createDeferred<string>();
    const secondUpload = latestController?.handleFrdUpload([
      makeDeferredTextFile("latest.json", secondBatchFast),
    ]);

    secondBatchFast.resolve(JSON.stringify({ title: "latest-result" }));
    await act(async () => {
      await secondUpload;
    });

    await waitFor(() => {
      expect(latestController?.store.summary).toEqual({
        total: 1,
        passed: 1,
        failed: 0,
        parseFailed: 0,
      });
      expect(latestController?.store.files.map((file) => file.fileName)).toEqual(["latest.json"]);
      expect(latestController?.processedFiles).toBe(1);
      expect(latestController?.totalFiles).toBe(1);
    });

    firstBatchSlowA.resolve(JSON.stringify({ title: "stale-a" }));
    firstBatchSlowB.resolve(JSON.stringify({ title: "stale-b" }));
    await act(async () => {
      await firstUpload;
    });

    expect(latestController?.store.files.map((file) => file.fileName)).toEqual(["latest.json"]);
    expect(latestController?.processedFiles).toBe(1);
    expect(latestController?.totalFiles).toBe(1);
  });
});
