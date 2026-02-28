import { sortReviewResults } from "../../domain/review-run/sortReviewResults";
import type { ReviewResult } from "../../types/reviewContracts";

export type FileResultRow = {
  id: string;
  displayName: string;
  status: ReviewResult["status"];
  selected: boolean;
};

export type FileResultListModel = {
  rows: FileResultRow[];
};

export type FileResultListInput = {
  files: readonly ReviewResult[];
  selectedFileId: string | null;
};

export const deriveFileResultListModel = ({
  files,
  selectedFileId,
}: FileResultListInput): FileResultListModel => {
  const ordered = sortReviewResults(files);
  return {
    rows: ordered.map((file) => ({
      id: file.id,
      displayName: file.displayName,
      status: file.status,
      selected: file.id === selectedFileId,
    })),
  };
};
