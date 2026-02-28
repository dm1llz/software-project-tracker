import type { RunIssue } from "../../types/reviewContracts";

type ParseLocation = {
  line?: number;
  column?: number;
};

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

const toLineColumn = (text: string, position: number): ParseLocation => {
  if (position < 0 || position > text.length) {
    return {};
  }

  const prefix = text.slice(0, position);
  const line = prefix.split("\n").length;
  const lastNewline = prefix.lastIndexOf("\n");
  const column = position - lastNewline;
  return { line, column };
};

export const mapSchemaParseIssue = (
  fileName: string,
  text: string,
  error: unknown,
): RunIssue => {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const position = extractPosition(rawMessage);
  const location = position === null ? {} : toLineColumn(text, position);

  return {
    level: "error",
    code: "SCHEMA_ERROR",
    message: `Failed to parse schema file \"${fileName}\": ${rawMessage}`,
    path: "/",
    ...location,
  };
};
