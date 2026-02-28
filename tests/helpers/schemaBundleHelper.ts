import { DEFAULT_SCHEMA_DRAFT } from "../../src/domain/validation/schemaDraftSupport";
import type { SchemaBundle } from "../../src/types/reviewContracts";

export { DEFAULT_SCHEMA_DRAFT };
export type { SchemaBundle };

export const makeSchemaBundle = (
  raw: Record<string, unknown>,
  declaredDraft: string | null,
  id = "schema-test",
  name = "schema.json",
): SchemaBundle => ({
  id,
  name,
  raw,
  declaredDraft,
  effectiveDraft: DEFAULT_SCHEMA_DRAFT,
});
