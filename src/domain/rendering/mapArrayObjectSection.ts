import type {
  RenderedArrayObjectItem,
  RenderedObjectField,
  RenderedScalarValue,
  RenderedSection,
} from "../../types/reviewContracts";
import { assertSemanticPreservation } from "./assertSemanticPreservation";
import { isPlainObject, isRenderedScalarValue } from "./guards";
import type { ObjectFieldSchema } from "./mapObjectSection";
import { orderFields } from "./orderFields";

type MapArrayObjectSectionInput = {
  id: string;
  title: string;
  path: string;
  value: Record<string, unknown>[];
  itemFieldSchemas?: Record<string, ObjectFieldSchema | undefined>;
};

const escapeJsonPointerKey = (key: string): string => key.replace(/~/g, "~0").replace(/\//g, "~1");

const normalizePath = (parentPath: string, key: string): string =>
  parentPath === "/" ? `/${escapeJsonPointerKey(key)}` : `${parentPath}/${escapeJsonPointerKey(key)}`;

const mapFieldValue = (
  value: unknown,
  context: string,
): RenderedScalarValue | RenderedScalarValue[] => {
  if (isRenderedScalarValue(value)) {
    assertSemanticPreservation({
      source: value,
      rendered: value,
      context,
    });
    return value;
  }

  if (Array.isArray(value) && value.every((item) => isRenderedScalarValue(item))) {
    const rendered = [...value];
    assertSemanticPreservation({
      source: value,
      rendered,
      context,
    });
    return rendered;
  }

  throw new Error("Array object mapper only supports scalar values or arrays of scalars for fields.");
};

const toLabel = (key: string, title?: string): string => {
  if (title && title.trim().length > 0) {
    return title;
  }

  return key;
};

const mapItemFields = (
  item: Record<string, unknown>,
  itemPath: string,
  itemFieldSchemas: Record<string, ObjectFieldSchema | undefined>,
): RenderedObjectField[] => {
  if (!isPlainObject(item)) {
    throw new Error(`Array object mapper only supports object items at path ${itemPath}.`);
  }

  const orderedKeys = orderFields({ value: item, fieldSchemas: itemFieldSchemas });
  return orderedKeys.flatMap((key) => {
    const rawValue = item[key];
    if (
      !isRenderedScalarValue(rawValue) &&
      !(Array.isArray(rawValue) && rawValue.every((entry) => isRenderedScalarValue(entry)))
    ) {
      return [];
    }

    const schema = itemFieldSchemas[key];
    return [{
      key,
      label: toLabel(key, schema?.title),
      path: normalizePath(itemPath, key),
      value: mapFieldValue(rawValue, `array object field (${itemPath}/${key})`),
      ...(schema?.description ? { description: schema.description } : {}),
    }];
  });
};

export const mapArrayObjectSection = ({
  id,
  title,
  path,
  value,
  itemFieldSchemas = {},
}: MapArrayObjectSectionInput): Extract<RenderedSection, { kind: "array" }> => {
  if (!value.every((item) => isPlainObject(item))) {
    throw new Error(`Array object mapper only supports object items at path ${path}.`);
  }

  const items: RenderedArrayObjectItem[] = value.map((item, index) => ({
    id: `${id}-item-${index + 1}`,
    title: `Item ${index + 1}`,
    fields: mapItemFields(item, normalizePath(path, String(index)), itemFieldSchemas),
  }));

  return {
    id,
    title,
    path,
    kind: "array",
    content: {
      itemKind: "object",
      items,
    },
  };
};
