import type { FileIssue, ReviewInputFile } from "../../types/reviewContracts";

export type ParseFrdFileSuccess = {
  ok: true;
  parsed: unknown;
  issues: [];
};

export type ParseFrdFileFailure = {
  ok: false;
  parsed: null;
  issues: [FileIssue, ...FileIssue[]];
};

export type ParseFrdFileResult = ParseFrdFileSuccess | ParseFrdFileFailure;

const extractPosition = (message: string): number | null => {
  const match = message.match(/\bposition\s+(\d+)\b/i);
  if (!match) {
    return null;
  }

  const value = match[1];
  if (!value) {
    return null;
  }

  return Number.parseInt(value, 10);
};

const toLineColumn = (text: string, position: number): { line?: number; column?: number } => {
  if (position < 0 || position > text.length) {
    return {};
  }

  const prefix = text.slice(0, position);
  const line = prefix.split("\n").length;
  const lastNewline = prefix.lastIndexOf("\n");
  const column = position - lastNewline;
  return { line, column };
};

const mapParseFailureIssue = (file: ReviewInputFile, error: unknown): FileIssue => {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const position = extractPosition(rawMessage);
  const location = position === null ? {} : toLineColumn(file.text, position);

  return {
    fileId: file.id,
    level: "error",
    code: "PARSE_ERROR",
    fileName: file.fileName,
    path: "/",
    message: `Failed to parse FRD file "${file.fileName}": ${rawMessage}`,
    ...location,
  };
};

export const parseFrdFile = (file: ReviewInputFile): ParseFrdFileResult => {
  try {
    return {
      ok: true,
      parsed: JSON.parse(file.text),
      issues: [],
    };
  } catch (error) {
    return {
      ok: false,
      parsed: null,
      issues: [mapParseFailureIssue(file, error)],
    };
  }
};
