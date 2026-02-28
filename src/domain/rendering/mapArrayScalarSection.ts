import type { RenderedScalarValue, RenderedSection } from "../../types/reviewContracts";
import { assertSemanticPreservation } from "./assertSemanticPreservation";
import { isRenderedScalarValue } from "./guards";

type MapArrayScalarSectionInput = {
  id: string;
  title: string;
  path: string;
  value: unknown[];
};

export const mapArrayScalarSection = ({
  id,
  title,
  path,
  value,
}: MapArrayScalarSectionInput): Extract<RenderedSection, { kind: "array" }> => {
  if (!value.every((item) => isRenderedScalarValue(item))) {
    throw new Error(`Array scalar mapper only supports scalar items at path ${path}.`);
  }

  const items = [...value] as RenderedScalarValue[];
  assertSemanticPreservation({
    source: value,
    rendered: items,
    context: `array scalar section (${path})`,
  });

  return {
    id,
    title,
    path,
    kind: "array",
    content: {
      itemKind: "scalar",
      items,
    },
  };
};
