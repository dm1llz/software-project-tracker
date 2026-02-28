import type { RenderedSection, ReviewResult } from "../../types/reviewContracts";

export type ReadableFrdViewModel = {
  visible: boolean;
  sections: RenderedSection[];
};

export const deriveReadableFrdViewModel = (file: ReviewResult | null): ReadableFrdViewModel => {
  if (!file || file.status !== "passed") {
    return {
      visible: false,
      sections: [],
    };
  }

  return {
    visible: true,
    sections: file.sections ?? [],
  };
};
