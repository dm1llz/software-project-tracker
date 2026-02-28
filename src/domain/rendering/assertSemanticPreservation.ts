import type { RenderedScalarValue } from "../../types/reviewContracts";
import { isRenderedScalarValue } from "./guards";

type SemanticValue = RenderedScalarValue | RenderedScalarValue[];

type AssertSemanticPreservationInput = {
  source: unknown;
  rendered: SemanticValue;
  context: string;
};

const isScalarArray = (value: unknown): value is RenderedScalarValue[] =>
  Array.isArray(value) && value.every((item) => isRenderedScalarValue(item));

export const assertSemanticPreservation = ({
  source,
  rendered,
  context,
}: AssertSemanticPreservationInput): void => {
  if (isRenderedScalarValue(source) && isRenderedScalarValue(rendered)) {
    if (!Object.is(source, rendered)) {
      throw new Error(`Semantic preservation failed at ${context}: scalar value was transformed.`);
    }
    return;
  }

  if (isScalarArray(source) && isScalarArray(rendered)) {
    if (source.length !== rendered.length) {
      throw new Error(`Semantic preservation failed at ${context}: array length changed.`);
    }

    for (let index = 0; index < source.length; index += 1) {
      if (!Object.is(source[index], rendered[index])) {
        throw new Error(
          `Semantic preservation failed at ${context}: array item ${index} was transformed.`,
        );
      }
    }
    return;
  }

  throw new Error(`Semantic preservation failed at ${context}: unsupported value mapping.`);
};
