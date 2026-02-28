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
  const files: ReviewInputFile[] = [];
  const fileIssues: FileIssue[] = [];
  const displayTargets: Array<Pick<ReviewInputFile, "id" | "fileName" | "uploadIndex">> = [];

  for (const [uploadIndex, source] of sources.entries()) {
    const fileId = createFileId(source.name, uploadIndex);
    displayTargets.push({
      id: fileId,
      fileName: source.name,
      uploadIndex,
    });

    try {
      const text = await readSourceText(source);
      files.push({
        id: fileId,
        fileName: source.name,
        uploadIndex,
        text,
      });
    } catch (error) {
      fileIssues.push(mapReadFailureIssue(fileId, source.name, error));
    }
  }

  return {
    files,
    fileIssues,
    displayNameById: buildDisplayNameMap(displayTargets),
  };
};
