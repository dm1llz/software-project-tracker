import type { FileIssue, RenderedSection, ReviewInputFile, ReviewResult } from "../../types/reviewContracts";
import type { ParseFrdFileResult } from "./parseFrdFile";

type BuildReviewResultInput = {
  file: ReviewInputFile;
  displayName: string;
  parseResult: ParseFrdFileResult;
  validationIssues?: readonly FileIssue[];
  sections?: RenderedSection[];
};

const hasErrorIssues = (issues: readonly FileIssue[]): boolean =>
  issues.some((issue) => issue.level === "error");

export const buildReviewResult = ({
  file,
  displayName,
  parseResult,
  validationIssues = [],
  sections,
}: BuildReviewResultInput): ReviewResult => {
  if (!parseResult.ok) {
    return {
      id: file.id,
      uploadIndex: file.uploadIndex,
      fileName: file.fileName,
      displayName,
      status: "parse_failed",
      parseOk: false,
      valid: false,
      issues: [...parseResult.issues],
    };
  }

  const issues = [...validationIssues];
  const hasErrors = hasErrorIssues(issues);
  const passed = !hasErrors;

  return {
    id: file.id,
    uploadIndex: file.uploadIndex,
    fileName: file.fileName,
    displayName,
    status: passed ? "passed" : "validation_failed",
    parseOk: true,
    valid: passed,
    issues,
    ...(passed && sections ? { sections } : {}),
  };
};
