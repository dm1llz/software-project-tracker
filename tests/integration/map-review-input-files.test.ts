import { describe, expect, it } from "vitest";

import { mapReviewInputFiles } from "../../src/domain/review-run/mapReviewInputFiles";

describe("mapReviewInputFiles", () => {
  it("maps uniquely named files to unique ids and ordered uploadIndex values", async () => {
    const result = await mapReviewInputFiles([
      { name: "a.json", text: "{\"title\":\"a\"}" },
      { name: "b.json", text: "{\"title\":\"b\"}" },
      { name: "c.json", text: "{\"title\":\"c\"}" },
    ]);

    expect(result.files).toHaveLength(3);
    expect(new Set(result.files.map((file) => file.id)).size).toBe(3);
    expect(result.files.map((file) => file.uploadIndex)).toEqual([0, 1, 2]);
    expect(result.fileIssues).toHaveLength(0);
  });

  it("continues ingesting remaining files when one file read fails", async () => {
    const result = await mapReviewInputFiles([
      { name: "ok-1.json", text: "{\"title\":\"ok-1\"}" },
      {
        name: "bad.json",
        text: async () => {
          throw new Error("browser read failure");
        },
      },
      { name: "ok-2.json", text: "{\"title\":\"ok-2\"}" },
    ]);

    expect(result.files.map((file) => file.fileName)).toEqual(["ok-1.json", "ok-2.json"]);
    expect(result.files.map((file) => file.uploadIndex)).toEqual([0, 2]);
    expect(result.fileIssues).toHaveLength(1);
    const [issue] = result.fileIssues;
    expect(issue.code).toBe("PARSE_ERROR");
    expect(issue.path).toBe("/");
    expect(issue.fileName).toBe("bad.json");
    expect(issue.message).toContain("Failed to read FRD file");
  });

  it("keeps duplicate names distinct by id and indexed display names", async () => {
    const result = await mapReviewInputFiles([
      { name: "dup.json", text: "{\"title\":\"same\"}" },
      { name: "dup.json", text: "{\"title\":\"same\"}" },
    ]);

    expect(result.files).toHaveLength(2);
    expect(result.files[0]?.id).not.toBe(result.files[1]?.id);
    expect(result.displayNameById[result.files[0]!.id]).toBe("dup.json (1)");
    expect(result.displayNameById[result.files[1]!.id]).toBe("dup.json (2)");
  });
});
