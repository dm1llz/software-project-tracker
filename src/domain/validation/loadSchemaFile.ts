import type { RunIssue, SchemaBundle } from "../../types/reviewContracts";
import { mapSchemaParseIssue } from "./mapSchemaParseIssue";
import { DEFAULT_SCHEMA_DRAFT, normalizeDeclaredDraft } from "./schemaDraftSupport";

export { DEFAULT_SCHEMA_DRAFT } from "./schemaDraftSupport";

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

const mapSchemaReadIssue = (fileName: string, error: unknown): RunIssue => ({
  level: "error",
  code: "SCHEMA_ERROR",
  message: `Failed to read schema file \"${fileName}\": ${
    error instanceof Error ? error.message : String(error)
  }`,
  path: "/",
});

export const loadSchemaFile = async (source: SchemaFileSource): Promise<SchemaLoadResult> => {
  let rawText: string;
  try {
    rawText = await readSourceText(source);
  } catch (error) {
    return {
      ok: false,
      blocked: true,
      schema: null,
      runIssues: [mapSchemaReadIssue(source.name, error)],
    };
  }

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
  const declaredDraft = normalizeDeclaredDraft(raw.$schema);

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
