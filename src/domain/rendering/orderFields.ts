import type { ObjectFieldSchema } from "./mapObjectSection";

type OrderFieldsInput = {
  value: Record<string, unknown>;
  fieldSchemas?: Record<string, ObjectFieldSchema | undefined>;
};

export const orderFields = ({ value, fieldSchemas = {} }: OrderFieldsInput): string[] => {
  const sourceKeys = Object.keys(value);
  const schemaKeys = Object.keys(fieldSchemas);

  if (schemaKeys.length === 0) {
    return sourceKeys;
  }

  const orderedFromSchema = schemaKeys.filter((key) =>
    Object.prototype.hasOwnProperty.call(value, key),
  );
  const seen = new Set(orderedFromSchema);
  const sourceRemainder = sourceKeys.filter((key) => !seen.has(key));

  return [...orderedFromSchema, ...sourceRemainder];
};
