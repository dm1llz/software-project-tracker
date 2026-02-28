import type { SupportedSchemaDraft } from "../../types/reviewContracts";

export const SUPPORTED_SCHEMA_DRAFTS: readonly SupportedSchemaDraft[] = ["2020-12"];

const [firstSupportedDraft] = SUPPORTED_SCHEMA_DRAFTS;
if (!firstSupportedDraft) {
  throw new Error("SUPPORTED_SCHEMA_DRAFTS must define at least one draft.");
}

export const DEFAULT_SCHEMA_DRAFT: SupportedSchemaDraft = firstSupportedDraft;

const SCHEMA_DRAFT_ALIASES: Readonly<Record<string, SupportedSchemaDraft>> = {
  "2020-12": "2020-12",
  "draft2020-12": "2020-12",
  "draft-2020-12": "2020-12",
  "https://json-schema.org/draft/2020-12/schema": "2020-12",
  "http://json-schema.org/draft/2020-12/schema": "2020-12",
  "https://json-schema.org/draft/2020-12/schema#": "2020-12",
  "http://json-schema.org/draft/2020-12/schema#": "2020-12",
};

const DRAFT_TOKEN_PATTERNS: ReadonlyArray<[RegExp, SupportedSchemaDraft]> = [
  [/(^|[^0-9])2020-12([^0-9]|$)/, "2020-12"],
];

export const normalizeDeclaredDraft = (value: unknown): SupportedSchemaDraft | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  const aliasMatch = SCHEMA_DRAFT_ALIASES[normalized];
  if (aliasMatch) {
    return aliasMatch;
  }

  for (const [pattern, draft] of DRAFT_TOKEN_PATTERNS) {
    if (pattern.test(normalized)) {
      return draft;
    }
  }

  return null;
};
