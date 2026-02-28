import { describe, expect, it } from "vitest";

import {
  deriveReviewRunContentModel,
  replaceSchemaFromReviewRunPage,
  selectFileFromReviewRunPage,
} from "../../src/ui/ReviewRunPage";
import { deriveScreenState } from "../../src/ui/state/deriveScreenState";
import {
  completeReviewRun,
  createReviewRunStoreState,
  startReviewRun,
} from "../../src/ui/state/reviewRunStore";
import type { RenderedSection, ReviewResult, ReviewRunResult } from "../../src/types/reviewContracts";

const sectionFixture: RenderedSection = {
  id: "s-1",
  title: "Metadata",
  path: "/metadata",
  kind: "object",
  content: {
    fields: [
      {
        key: "name",
        label: "name",
        path: "/metadata/name",
        value: "FRD",
      },
    ],
  },
};

const makeReviewResult = (input: {
  id: string;
  fileName: string;
  displayName: string;
  uploadIndex: number;
  status: ReviewResult["status"];
}): ReviewResult => {
  const baseIssues =
    input.status === "parse_failed"
      ? [
          {
            fileId: input.id,
            level: "error" as const,
            code: "PARSE_ERROR" as const,
            fileName: input.fileName,
            path: "/",
            message: "Parse failed",
          },
        ]
      : [];

  return {
    id: input.id,
    uploadIndex: input.uploadIndex,
    fileName: input.fileName,
    displayName: input.displayName,
    status: input.status,
    parseOk: input.status !== "parse_failed",
    valid: input.status === "passed",
    issues: baseIssues,
    ...(input.status === "passed" ? { sections: [sectionFixture] } : {}),
  };
};

const makeRunResult = (input: {
  runIssues: ReviewRunResult["runIssues"];
  files: ReviewResult[];
}): ReviewRunResult => ({
  runIssues: input.runIssues,
  files: input.files,
  summary: {
    total: input.files.length,
    passed: input.files.filter((file) => file.status === "passed").length,
    failed: input.files.filter((file) => file.status === "validation_failed").length,
    parseFailed: input.files.filter((file) => file.status === "parse_failed").length,
  },
});

describe("ui results overview, detail panel, and schema reset behavior", () => {
  it("shows readable tab for passed files and hides it for parse_failed files", () => {
    const completed = completeReviewRun(
      createReviewRunStoreState("schema.json"),
      makeRunResult({
        runIssues: [],
        files: [
          makeReviewResult({
            id: "passed-1",
            fileName: "feature.json",
            displayName: "feature.json",
            uploadIndex: 0,
            status: "passed",
          }),
          makeReviewResult({
            id: "parse-1",
            fileName: "broken.json",
            displayName: "broken.json",
            uploadIndex: 1,
            status: "parse_failed",
          }),
        ],
      }),
    );

    const passedSelected = selectFileFromReviewRunPage(completed, "passed-1");
    const passedModel = deriveReviewRunContentModel(passedSelected);
    expect(passedModel.detailPanel.availableTabs).toEqual(["issues", "readable"]);

    const parseSelected = selectFileFromReviewRunPage(completed, "parse-1");
    const parseModel = deriveReviewRunContentModel(parseSelected);
    expect(parseModel.detailPanel.availableTabs).toEqual(["issues"]);
  });

  it("keeps duplicate file names distinct and selection keyed by stable file id", () => {
    const completed = completeReviewRun(
      createReviewRunStoreState("schema.json"),
      makeRunResult({
        runIssues: [],
        files: [
          makeReviewResult({
            id: "dup-1",
            fileName: "feature.json",
            displayName: "feature.json",
            uploadIndex: 0,
            status: "passed",
          }),
          makeReviewResult({
            id: "dup-2",
            fileName: "feature.json",
            displayName: "feature.json (2)",
            uploadIndex: 1,
            status: "validation_failed",
          }),
        ],
      }),
    );

    const selected = selectFileFromReviewRunPage(completed, "dup-2");
    const model = deriveReviewRunContentModel(selected);

    expect(model.fileList.rows.map((row) => row.displayName)).toEqual([
      "feature.json (2)",
      "feature.json",
    ]);
    expect(model.fileList.rows.find((row) => row.id === "dup-2")?.selected).toBe(true);
    expect(model.detailPanel.fileId).toBe("dup-2");
  });

  it("shows run-issue panel and hides file rows when run is blocked before file processing", () => {
    const blocked = completeReviewRun(
      createReviewRunStoreState("schema.json"),
      {
        runIssues: [
          {
            level: "error",
            code: "SCHEMA_ERROR",
            message: "Schema compile failure",
            path: "/$schema",
          },
        ],
        files: [],
        summary: {
          total: 0,
          passed: 0,
          failed: 0,
          parseFailed: 0,
        },
      },
    );

    const model = deriveReviewRunContentModel(blocked);
    expect(model.runIssuePanel.visible).toBe(true);
    expect(model.showFileRows).toBe(false);
    expect(model.fileList.rows).toEqual([]);
  });

  it("replacing schema clears prior run summary/files/issues and selection state", () => {
    const completed = completeReviewRun(
      createReviewRunStoreState("schema-v1.json"),
      makeRunResult({
        runIssues: [],
        files: [
          makeReviewResult({
            id: "f-1",
            fileName: "ok.json",
            displayName: "ok.json",
            uploadIndex: 0,
            status: "passed",
          }),
        ],
      }),
    );
    const selected = selectFileFromReviewRunPage(completed, "f-1");

    const screenState = deriveScreenState({
      schemaLoaded: selected.schemaName !== null,
      isRunning: selected.isRunning,
      hasCompletedRun: selected.hasCompletedRun,
      runIssues: selected.runIssues,
    });
    const reset = replaceSchemaFromReviewRunPage(selected, screenState, "schema-v2.json");

    expect(reset.schemaName).toBe("schema-v2.json");
    expect(reset.files).toEqual([]);
    expect(reset.runIssues).toEqual([]);
    expect(reset.selectedFileId).toBeNull();
    expect(reset.summary).toEqual({
      total: 0,
      passed: 0,
      failed: 0,
      parseFailed: 0,
    });
    expect(reset.isRunning).toBe(false);
    expect(reset.hasCompletedRun).toBe(false);
  });

  it("keeps run-issue panel hidden when run has no run-level issues", () => {
    const running = startReviewRun(createReviewRunStoreState("schema.json"));
    const completed = completeReviewRun(
      running,
      makeRunResult({
        runIssues: [],
        files: [
          makeReviewResult({
            id: "f-passed",
            fileName: "ok.json",
            displayName: "ok.json",
            uploadIndex: 0,
            status: "passed",
          }),
        ],
      }),
    );

    const model = deriveReviewRunContentModel(completed);
    expect(model.runIssuePanel.visible).toBe(false);
    expect(model.showFileRows).toBe(true);
  });
});
