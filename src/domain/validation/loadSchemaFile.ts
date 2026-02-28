import type { RunIssue, SchemaBundle, SupportedSchemaDraft } from "../../types/reviewContracts";
import { mapSchemaParseIssue } from "./mapSchemaParseIssue";

export const DEFAULT_SCHEMA_DRAFT: SupportedSchemaDraft = "2020-12";

type SchemaFileSource = {
  name: string;
  text: string | (() => Promise<string>);
};

type SchemaLoadSuccess = {
  ok: true;
  blocked: false;
  schema: SchemaBundle;
  runIssues: [];
};

type SchemaLoadFailure = {
  ok: false;
  blocked: true;
  schema: null;
  runIssues: [RunIssue, ...RunIssue[]];
};

export type SchemaLoadResult = SchemaLoadSuccess | SchemaLoadFailure;

const readSourceText = async (source: SchemaFileSource): Promise<string> =>
  typeof source.text === "string" ? source.text : source.text();

const mapInvalidRootIssue = (fileName: string): RunIssue => ({
  level: "error",
  code: "SCHEMA_ERROR",
  message: `Schema file \"${fileName}\" must contain a JSON object at the root.`,
  path: "/",
});

export const loadSchemaFile = async (source: SchemaFileSource): Promise<SchemaLoadResult> => {
  const rawText = await readSourceText(source);

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    return {
      ok: false,
      blocked: true,
      schema: null,
      runIssues: [mapSchemaParseIssue(source.name, rawText, error)],
    };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      ok: false,
      blocked: true,
      schema: null,
      runIssues: [mapInvalidRootIssue(source.name)],
    };
  }

  const raw = parsed as Record<string, unknown>;
  const declaredDraft = typeof raw.$schema === "string" ? raw.$schema : null;

  return {
    ok: true,
    blocked: false,
    schema: {
      id: `schema:${source.name}`,
      name: source.name,
      raw,
      declaredDraft,
      effectiveDraft: DEFAULT_SCHEMA_DRAFT,
    },
    runIssues: [],
  };
};
