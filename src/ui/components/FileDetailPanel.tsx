import type { ReviewResult } from "../../types/reviewContracts";
import { deriveFileIssueTableModel } from "./FileIssueTable";
import { deriveReadableFrdViewModel } from "./ReadableFrdView";

export type FileDetailTab = "issues" | "readable";

export type FileDetailPanelModel = {
  fileId: string | null;
  availableTabs: FileDetailTab[];
  activeTab: FileDetailTab;
  issueTable: ReturnType<typeof deriveFileIssueTableModel>;
  readableView: ReturnType<typeof deriveReadableFrdViewModel>;
};

export type FileDetailPanelInput = {
  file: ReviewResult | null;
  preferredTab?: FileDetailTab | undefined;
};

export const deriveFileDetailPanelModel = ({
  file,
  preferredTab,
}: FileDetailPanelInput): FileDetailPanelModel => {
  const readableView = deriveReadableFrdViewModel(file);
  const availableTabs: FileDetailTab[] = readableView.visible ? ["issues", "readable"] : ["issues"];

  const activeTab =
    preferredTab && availableTabs.includes(preferredTab)
      ? preferredTab
      : (availableTabs[0] ?? "issues");

  return {
    fileId: file?.id ?? null,
    availableTabs,
    activeTab,
    issueTable: deriveFileIssueTableModel(file?.issues ?? []),
    readableView,
  };
};
