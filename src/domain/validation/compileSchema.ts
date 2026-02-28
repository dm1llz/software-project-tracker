import Ajv2020, { type ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";

import type { RunIssue, SchemaBundle } from "../../types/reviewContracts";
import { detectUnsupportedDraft } from "./detectUnsupportedDraft";
import { mapRunIssue } from "./mapRunIssue";

type CompileSchemaOptions = {
  registerFormats?: boolean;
};

type CompileSchemaSuccess = {
  ok: true;
  runIssues: [];
  validator: ValidateFunction;
};

type CompileSchemaFailure = {
  ok: false;
  runIssues: [RunIssue, ...RunIssue[]];
  validator: null;
};

export type CompileSchemaResult = CompileSchemaSuccess | CompileSchemaFailure;

export const compileSchema = (
  schemaBundle: SchemaBundle,
  options?: CompileSchemaOptions,
): CompileSchemaResult => {
  const unsupportedDraftIssue = detectUnsupportedDraft({
    declaredDraft: schemaBundle.declaredDraft,
    effectiveDraft: schemaBundle.effectiveDraft,
  });
  if (unsupportedDraftIssue) {
    return {
      ok: false,
      runIssues: [unsupportedDraftIssue],
      validator: null,
    };
  }

  const ajv = new Ajv2020({
    strict: true,
    allErrors: true,
    validateFormats: true,
  });

  if (options?.registerFormats !== false) {
    addFormats(ajv);
  }

  try {
    const validator = ajv.compile(schemaBundle.raw);
    return {
      ok: true,
      runIssues: [],
      validator,
    };
  } catch (error) {
    return {
      ok: false,
      runIssues: [
        mapRunIssue({
          message: `Schema compilation failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
          path: "/",
        }),
      ],
      validator: null,
    };
  }
};
