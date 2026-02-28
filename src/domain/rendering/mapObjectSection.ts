import type {
  RenderedObjectField,
  RenderedScalarValue,
  RenderedSection,
} from "../../types/reviewContracts";

type ObjectFieldSchema = {
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

const isRenderedScalarValue = (value: unknown): value is RenderedScalarValue =>
  value === null ||
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean";

const mapFieldValue = (value: unknown): RenderedScalarValue | RenderedScalarValue[] => {
  if (isRenderedScalarValue(value)) {
    return value;
  }

  if (Array.isArray(value) && value.every((item) => isRenderedScalarValue(item))) {
    return value;
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
  const fields: RenderedObjectField[] = Object.entries(value).map(([key, rawValue]) => {
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
