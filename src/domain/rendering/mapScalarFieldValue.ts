import type { RenderedScalarValue } from "../../types/reviewContracts";
import { assertSemanticPreservation } from "./assertSemanticPreservation";
import { isRenderedScalarValue } from "./guards";

export const mapScalarFieldValue = (
  value: unknown,
  context: string,
  unsupportedMessage: string,
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

  throw new Error(unsupportedMessage);
};
