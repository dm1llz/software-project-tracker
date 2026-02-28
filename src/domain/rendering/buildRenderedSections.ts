import type { RenderedSection } from "../../types/reviewContracts";
import { isPlainObject, isRenderedScalarValue } from "./guards";
import { mapArrayObjectSection } from "./mapArrayObjectSection";
import { mapArrayScalarSection } from "./mapArrayScalarSection";
import { mapObjectSection, type ObjectFieldSchema } from "./mapObjectSection";
import { mapScalarSection } from "./mapScalarSection";
import { orderFields } from "./orderFields";
import { joinJsonPointerPath } from "./pathUtils";
import { pickDisplayTitle } from "./textUtils";

type SchemaNode = {
  title?: string;
  description?: string;
  properties?: Record<string, SchemaNode | undefined>;
  items?: SchemaNode;
};

type BuildRenderedSectionsInput = {
  id: string;
  title: string;
  path: string;
  value: unknown;
  schema?: SchemaNode | undefined;
};

const toFieldSchemas = (schema?: SchemaNode): Record<string, ObjectFieldSchema | undefined> => {
  if (!schema?.properties) {
    return {};
  }

  const fields: Record<string, ObjectFieldSchema | undefined> = {};
  for (const [key, node] of Object.entries(schema.properties)) {
    if (!node) {
      continue;
    }

    fields[key] = {
      ...(node.title ? { title: node.title } : {}),
      ...(node.description ? { description: node.description } : {}),
    };
  }

  return fields;
};

const toIdSegment = (segment: string): string =>
  segment.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_");

const joinId = (parentId: string, childSegment: string): string =>
  `${parentId}-${toIdSegment(childSegment)}`;

const renderNode = ({
  id,
  title,
  path,
  value,
  schema,
}: BuildRenderedSectionsInput): RenderedSection[] => {
  if (isRenderedScalarValue(value)) {
    return [mapScalarSection({ id, title, path, value })];
  }

  if (Array.isArray(value)) {
    if (value.every((item) => isRenderedScalarValue(item))) {
      return [mapArrayScalarSection({ id, title, path, value })];
    }

    if (!value.every((item) => isPlainObject(item))) {
      throw new Error(`Unsupported mixed array item types at path ${path}.`);
    }

    const itemFieldSchemas = toFieldSchemas(schema?.items);
    const arraySection = mapArrayObjectSection({
      id,
      title,
      path,
      value: value as Record<string, unknown>[],
      itemFieldSchemas,
    });

    const nestedSections: RenderedSection[] = [];
    value.forEach((item, index) => {
      const orderedKeys = orderFields({ value: item, fieldSchemas: itemFieldSchemas });
      orderedKeys.forEach((key) => {
        const nestedValue = item[key];
        if (!Array.isArray(nestedValue) && !isPlainObject(nestedValue)) {
          return;
        }

        const nextPath = joinJsonPointerPath(joinJsonPointerPath(path, String(index)), key);
        nestedSections.push(
          ...renderNode({
            id: joinId(id, `${index}-${key}`),
            title: pickDisplayTitle(key, schema?.items?.properties?.[key]?.title),
            path: nextPath,
            value: nestedValue,
            schema: schema?.items?.properties?.[key],
          }),
        );
      });
    });

    return [arraySection, ...nestedSections];
  }

  if (isPlainObject(value)) {
    const fieldSchemas = toFieldSchemas(schema);
    const orderedKeys = orderFields({ value, fieldSchemas });
    const scalarOnlyFields: Record<string, unknown> = {};
    const nestedEntries: Array<{ key: string; value: unknown }> = [];

    orderedKeys.forEach((key) => {
      const childValue = value[key];
      if (isRenderedScalarValue(childValue)) {
        scalarOnlyFields[key] = childValue;
        return;
      }

      if (Array.isArray(childValue) || isPlainObject(childValue)) {
        nestedEntries.push({ key, value: childValue });
        return;
      }

      throw new Error(`Unsupported runtime value at path ${joinJsonPointerPath(path, key)}.`);
    });

    const objectSection = mapObjectSection({
      id,
      title,
      path,
      value: scalarOnlyFields,
      fieldSchemas,
    });

    const nestedSections = nestedEntries.flatMap((entry) =>
      renderNode({
        id: joinId(id, entry.key),
        title: pickDisplayTitle(entry.key, schema?.properties?.[entry.key]?.title),
        path: joinJsonPointerPath(path, entry.key),
        value: entry.value,
        schema: schema?.properties?.[entry.key],
      }),
    );

    return [objectSection, ...nestedSections];
  }

  throw new Error(`Unsupported runtime value for rendered section at path ${path}.`);
};

export const buildRenderedSections = (input: BuildRenderedSectionsInput): RenderedSection[] =>
  renderNode(input);
