import type { RunIssue, SupportedSchemaDraft } from "../../types/reviewContracts";
import { mapRunIssue } from "./mapRunIssue";

type UnsupportedDraftInput = {
  declaredDraft: string | null;
  effectiveDraft: SupportedSchemaDraft;
};

const normalizeDraftToken = (draft: string): string => {
  const normalized = draft.trim().toLowerCase();
  if (/draft-?07/.test(normalized) || normalized.includes("draft/07")) {
    return "draft-07";
  }

  return draft.trim();
};

export const detectUnsupportedDraft = ({
  declaredDraft,
  effectiveDraft,
}: UnsupportedDraftInput): RunIssue | null => {
  if (!declaredDraft || declaredDraft === effectiveDraft) {
    return null;
  }

  const detected = normalizeDraftToken(declaredDraft);
  return mapRunIssue({
    message:
      `Unsupported schema draft detected: expected ${effectiveDraft} but found ${detected}. ` +
      "Only schemas declaring 2020-12 are accepted in MVP.",
    path: "/$schema",
  });
};
