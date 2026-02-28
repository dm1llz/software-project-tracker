import type { ErrorObject, ValidateFunction } from "ajv";

import type { FileIssue } from "../../types/reviewContracts";

export type WarningDiagnostic = {
  path: string;
  message: string;
  keyword?: string;
};

type ValidateFrdFileInput = {
  fileId: string;
  fileName: string;
  parsed: unknown;
  validator: ValidateFunction;
  warningDiagnostics?: readonly WarningDiagnostic[];
};

const mapAjvErrorToFileIssue = (
  fileId: string,
  fileName: string,
  error: ErrorObject,
): FileIssue => ({
  fileId,
  level: "error",
  code: "VALIDATION_ERROR",
  fileName,
  path: error.instancePath || "/",
  message: error.message ? `${error.keyword}: ${error.message}` : error.keyword,
  keyword: error.keyword,
});

const mapWarningDiagnostic = (
  fileId: string,
  fileName: string,
  warning: WarningDiagnostic,
): FileIssue => ({
  fileId,
  level: "warning",
  code: "VALIDATION_ERROR",
  fileName,
  path: warning.path,
  message: warning.message,
  ...(warning.keyword === undefined ? {} : { keyword: warning.keyword }),
});

export const validateFrdFile = ({
  fileId,
  fileName,
  parsed,
  validator,
  warningDiagnostics = [],
}: ValidateFrdFileInput): FileIssue[] => {
  const issues: FileIssue[] = [];

  const isValid = validator(parsed);
  if (!isValid) {
    for (const error of validator.errors ?? []) {
      issues.push(mapAjvErrorToFileIssue(fileId, fileName, error));
    }
  }

  for (const warning of warningDiagnostics) {
    issues.push(mapWarningDiagnostic(fileId, fileName, warning));
  }

  return issues;
};
