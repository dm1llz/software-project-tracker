import type {
  RenderedObjectField,
  RenderedSection,
} from "../../types/reviewContracts";
import type { RenderedScalarValue } from "../../types/reviewContracts";
import { assertSemanticPreservation } from "./assertSemanticPreservation";
import { isRenderedScalarValue } from "./guards";
import { orderFields } from "./orderFields";

export type ObjectFieldSchema = {
  description?: string;
  title?: string;
};

type MapObjectSectionInput = {
  id: string;
  title: string;
  path: string;
  value: Record<string, unknown>;
  fieldSchemas?: Record<string, ObjectFieldSchema | undefined>;
};

const mapFieldValue = (value: unknown): RenderedScalarValue | RenderedScalarValue[] => {
  if (isRenderedScalarValue(value)) {
    assertSemanticPreservation({
      source: value,
      rendered: value,
      context: "object field scalar",
    });
    return value;
  }

  if (Array.isArray(value) && value.every((item) => isRenderedScalarValue(item))) {
    const rendered = [...value];
    assertSemanticPreservation({
      source: value,
      rendered,
      context: "object field scalar array",
    });
    return rendered;
  }

  throw new Error("Object mapper only supports scalar values or arrays of scalars for fields.");
};

const toLabel = (key: string, title?: string): string => {
  if (title && title.trim().length > 0) {
    return title;
  }

  return key;
};

const escapeJsonPointerKey = (key: string): string => key.replace(/~/g, "~0").replace(/\//g, "~1");

const normalizePath = (parentPath: string, key: string): string =>
  parentPath === "/" ? `/${escapeJsonPointerKey(key)}` : `${parentPath}/${escapeJsonPointerKey(key)}`;

export const mapObjectSection = ({
  id,
  title,
  path,
  value,
  fieldSchemas = {},
}: MapObjectSectionInput): Extract<RenderedSection, { kind: "object" }> => {
  const orderedKeys = orderFields({ value, fieldSchemas });
  const fields: RenderedObjectField[] = orderedKeys.map((key) => {
    const rawValue = value[key];
    const schema = fieldSchemas[key];
    return {
      key,
      label: toLabel(key, schema?.title),
      path: normalizePath(path, key),
      value: mapFieldValue(rawValue),
      ...(schema?.description ? { description: schema.description } : {}),
    };
  });

  return {
    id,
    title,
    path,
    kind: "object",
    content: {
      fields,
    },
  };
};
