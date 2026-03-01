import type { FileIssue, ReviewInputFile } from "../../types/reviewContracts";
import { buildDisplayNameMap } from "./disambiguateDisplayName";

export type ReviewFileSource = {
  name: string;
  text: string | (() => Promise<string>);
};

export type MapReviewInputFilesResult = {
  files: ReviewInputFile[];
  fileIssues: FileIssue[];
  displayNameById: Record<string, string>;
};

const normalizeIdSegment = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const createFileId = (fileName: string, uploadIndex: number): string => {
  const normalizedName = normalizeIdSegment(fileName);
  return `frd-${uploadIndex}-${normalizedName || "file"}`;
};

export const uploadIndexFromFileId = (fileId: string, fallbackIndex: number): number => {
  const match = fileId.match(/^frd-(\d+)-/);
  if (!match || !match[1]) {
    return fallbackIndex;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isNaN(parsed) ? fallbackIndex : parsed;
};

const readSourceText = async (source: ReviewFileSource): Promise<string> =>
  typeof source.text === "string" ? source.text : source.text();

const mapReadFailureIssue = (fileId: string, fileName: string, error: unknown): FileIssue => ({
  fileId,
  level: "error",
  code: "PARSE_ERROR",
  fileName,
  path: "/",
  message: `Failed to read FRD file "${fileName}": ${
    error instanceof Error ? error.message : String(error)
  }`,
});

export const mapReviewInputFiles = async (
  sources: readonly ReviewFileSource[],
): Promise<MapReviewInputFilesResult> => {
  const displayTargets: Array<Pick<ReviewInputFile, "id" | "fileName" | "uploadIndex">> =
    sources.map((source, uploadIndex) => ({
      id: createFileId(source.name, uploadIndex),
      fileName: source.name,
      uploadIndex,
    }));

  const settled = await Promise.all(
    sources.map(async (source, uploadIndex) => {
      const target = displayTargets[uploadIndex];
      if (!target) {
        throw new Error(`Missing display target for upload index ${uploadIndex}.`);
      }
      try {
        const text = await readSourceText(source);
        const file: ReviewInputFile = {
          id: target.id,
          fileName: target.fileName,
          uploadIndex: target.uploadIndex,
          text,
        };
        return { ok: true as const, file };
      } catch (error) {
        return {
          ok: false as const,
          issue: mapReadFailureIssue(target.id, target.fileName, error),
        };
      }
    }),
  );

  const files: ReviewInputFile[] = [];
  const fileIssues: FileIssue[] = [];
  for (const entry of settled) {
    if (entry.ok) {
      files.push(entry.file);
    } else {
      fileIssues.push(entry.issue);
    }
  }

  return {
    files,
    fileIssues,
    displayNameById: buildDisplayNameMap(displayTargets),
  };
};
