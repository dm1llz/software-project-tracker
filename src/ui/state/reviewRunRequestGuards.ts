import type { MutableRefObject } from "react";

export const beginRequest = (requestVersionRef: MutableRefObject<number>): number => {
  requestVersionRef.current += 1;
  return requestVersionRef.current;
};

export const isCurrentRequest = (
  requestVersionRef: MutableRefObject<number>,
  requestVersion: number,
): boolean => requestVersionRef.current === requestVersion;
