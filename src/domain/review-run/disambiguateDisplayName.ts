import type { ReviewInputFile } from "../../types/reviewContracts";

export type DisplayNameTarget = Pick<ReviewInputFile, "id" | "fileName" | "uploadIndex">;

export const disambiguateDisplayName = (
  fileName: string,
  duplicateIndex: number,
  duplicateCount: number,
): string => {
  if (duplicateCount <= 1) {
    return fileName;
  }

  return `${fileName} (${duplicateIndex + 1})`;
};

export const buildDisplayNameMap = (
  files: readonly DisplayNameTarget[],
): Record<string, string> => {
  const byName = new Map<string, DisplayNameTarget[]>();

  for (const file of files) {
    const existing = byName.get(file.fileName) ?? [];
    existing.push(file);
    byName.set(file.fileName, existing);
  }

  const map: Record<string, string> = {};
  for (const [fileName, duplicates] of byName.entries()) {
    const ordered = [...duplicates].sort((left, right) =>
      left.uploadIndex === right.uploadIndex
        ? left.id.localeCompare(right.id)
        : left.uploadIndex - right.uploadIndex,
    );

    for (const [duplicateIndex, file] of ordered.entries()) {
      map[file.id] = disambiguateDisplayName(fileName, duplicateIndex, ordered.length);
    }
  }

  return map;
};

export type DisplayNameRow = {
  id: string;
  fileName: string;
  uploadIndex: number;
  displayName: string;
};

export const buildDisplayNameRows = (files: readonly DisplayNameTarget[]): DisplayNameRow[] => {
  const displayNameById = buildDisplayNameMap(files);
  return [...files]
    .sort((left, right) => left.uploadIndex - right.uploadIndex)
    .map((file) => ({
      id: file.id,
      fileName: file.fileName,
      uploadIndex: file.uploadIndex,
      displayName: displayNameById[file.id] ?? file.fileName,
    }));
};
