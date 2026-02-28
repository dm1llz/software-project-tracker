import type {
  RenderedObjectField,
  RenderedSection,
} from "../../types/reviewContracts";
import { mapScalarFieldValue } from "./mapScalarFieldValue";
import { orderFields } from "./orderFields";
import { joinJsonPointerPath } from "./pathUtils";
import { pickDisplayTitle } from "./textUtils";

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
      label: pickDisplayTitle(key, schema?.title),
      path: joinJsonPointerPath(path, key),
      value: mapScalarFieldValue(
        rawValue,
        `object field (${path}/${key})`,
        "Object mapper only supports scalar values or arrays of scalars for fields.",
      ),
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
