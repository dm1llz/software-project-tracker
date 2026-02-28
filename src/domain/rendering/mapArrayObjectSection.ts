import type {
  RenderedArrayObjectItem,
  RenderedObjectField,
  RenderedSection,
} from "../../types/reviewContracts";
import { isPlainObject, isRenderedScalarValue } from "./guards";
import { mapScalarFieldValue } from "./mapScalarFieldValue";
import type { ObjectFieldSchema } from "./mapObjectSection";
import { orderFields } from "./orderFields";
import { joinJsonPointerPath } from "./pathUtils";
import { pickDisplayTitle } from "./textUtils";

type MapArrayObjectSectionInput = {
  id: string;
  title: string;
  path: string;
  value: Record<string, unknown>[];
  itemFieldSchemas?: Record<string, ObjectFieldSchema | undefined>;
};

const mapItemFields = (
  item: Record<string, unknown>,
  itemPath: string,
  itemFieldSchemas: Record<string, ObjectFieldSchema | undefined>,
): RenderedObjectField[] => {
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
      label: pickDisplayTitle(key, schema?.title),
      path: joinJsonPointerPath(itemPath, key),
      value: mapScalarFieldValue(
        rawValue,
        `array object field (${itemPath}/${key})`,
        "Array object mapper only supports scalar values or arrays of scalars for fields.",
      ),
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
    fields: mapItemFields(item, joinJsonPointerPath(path, String(index)), itemFieldSchemas),
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
