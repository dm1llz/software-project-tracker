import type { RenderedScalarValue, RenderedSection } from "../../types/reviewContracts";

type MapScalarSectionInput = {
  id: string;
  title: string;
  path: string;
  value: unknown;
};

const isRenderedScalarValue = (value: unknown): value is RenderedScalarValue =>
  value === null ||
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean";

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
