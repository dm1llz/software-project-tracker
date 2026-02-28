import type { RenderedScalarValue } from "../../types/reviewContracts";

export const isRenderedScalarValue = (value: unknown): value is RenderedScalarValue =>
  value === null ||
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean";

export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
