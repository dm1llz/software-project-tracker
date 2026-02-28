import type { RenderedSection } from "../../types/reviewContracts";
import { isRenderedScalarValue } from "./guards";

type MapScalarSectionInput = {
  id: string;
  title: string;
  path: string;
  value: unknown;
};

export const mapScalarSection = ({
  id,
  title,
  path,
  value,
}: MapScalarSectionInput): Extract<RenderedSection, { kind: "scalar" }> => {
  if (!isRenderedScalarValue(value)) {
    throw new Error(`Unsupported scalar value for path ${path}`);
  }

  return {
    id,
    title,
    path,
    kind: "scalar",
    content: {
      value,
    },
  };
};
