const MODULE_SEGMENTS = [
  "ui",
  "domain/review-run",
  "domain/validation",
  "domain/rendering",
  "infra/workers",
  "types",
] as const;

type ModuleSegment = (typeof MODULE_SEGMENTS)[number];

const ALLOWED_IMPORTS: Record<ModuleSegment, ReadonlySet<ModuleSegment>> = {
  ui: new Set(["domain/review-run", "domain/validation", "domain/rendering", "types"]),
  "domain/review-run": new Set(["domain/validation", "domain/rendering", "types"]),
  "domain/validation": new Set(["types"]),
  "domain/rendering": new Set(["types"]),
  "infra/workers": new Set(["domain/review-run", "domain/validation", "domain/rendering", "types"]),
  types: new Set(["types"]),
};

const normalizePath = (filePath: string): string => filePath.replace(/\\/g, "/");

export const classifyModulePath = (filePath: string): ModuleSegment | null => {
  const normalized = normalizePath(filePath);

  for (const segment of MODULE_SEGMENTS) {
    if (normalized.includes(`/src/${segment}/`) || normalized.startsWith(`src/${segment}/`)) {
      return segment;
    }
  }

  return null;
};

export const isImportAllowed = (importerPath: string, importTargetPath: string): boolean => {
  const importerSegment = classifyModulePath(importerPath);
  const importTargetSegment = classifyModulePath(importTargetPath);

  if (!importerSegment || !importTargetSegment) {
    // Enforce boundaries strictly: unclassified paths are treated as violations.
    return false;
  }

  if (importerSegment === importTargetSegment) {
    return true;
  }

  return ALLOWED_IMPORTS[importerSegment].has(importTargetSegment);
};

export const assertImportAllowed = (importerPath: string, importTargetPath: string): void => {
  if (!isImportAllowed(importerPath, importTargetPath)) {
    const importerSegment = classifyModulePath(importerPath);
    const importTargetSegment = classifyModulePath(importTargetPath);
    const importerLabel = importerSegment ?? `unclassified: ${importerPath}`;
    const importTargetLabel = importTargetSegment ?? `unclassified: ${importTargetPath}`;
    throw new Error(
      `Module boundary violation in assertImportAllowed (isImportAllowed/classifyModulePath): ${importerLabel} must not import ${importTargetLabel}.`,
    );
  }
};
