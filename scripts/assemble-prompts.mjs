#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_MANIFEST_PATH = "specs/frds/prompts/prompt-chains.json";
const DEFAULT_OUT_DIR = "specs/frds/prompts/dist";
const PART_KINDS = new Set(["base", "ci_overlay", "language_overlay", "overlay"]);

const normalizeLineEndings = (value) => value.replace(/\r\n/g, "\n");
const normalizePromptBody = (value) => normalizeLineEndings(value).trimEnd();
const normalizeHeading = (value) => value.trim().toLowerCase();

const toRecord = (chains) => {
  const lookup = new Map();
  for (const chain of chains) {
    lookup.set(chain.id, chain);
  }
  return lookup;
};

const parseArgs = (argv) => {
  const options = {
    all: false,
    chain: null,
    manifest: DEFAULT_MANIFEST_PATH,
    outDir: DEFAULT_OUT_DIR,
    list: false,
    lint: false,
    stdout: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--all") {
      options.all = true;
      continue;
    }
    if (arg === "--list") {
      options.list = true;
      continue;
    }
    if (arg === "--lint") {
      options.lint = true;
      continue;
    }
    if (arg === "--stdout") {
      options.stdout = true;
      continue;
    }
    if (arg === "--chain" || arg === "--manifest" || arg === "--out-dir") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }
      i += 1;
      if (arg === "--chain") {
        options.chain = value;
      }
      if (arg === "--manifest") {
        options.manifest = value;
      }
      if (arg === "--out-dir") {
        options.outDir = value;
      }
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.list && (options.all || options.chain || options.stdout || options.lint)) {
    throw new Error("--list cannot be combined with --all, --chain, --stdout, or --lint");
  }

  if (options.all && options.chain) {
    throw new Error("Use either --all or --chain <id>, not both");
  }

  if (options.stdout && !options.chain) {
    throw new Error("--stdout requires --chain <id>");
  }

  if (options.stdout && options.lint) {
    throw new Error("--stdout cannot be combined with --lint");
  }

  if (!options.list && !options.all && !options.chain) {
    options.all = true;
  }

  return options;
};

const loadManifest = async (manifestPath) => {
  const manifestText = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestText);

  if (!manifest || !Array.isArray(manifest.chains)) {
    throw new Error("Manifest must include a chains array");
  }

  const seenChainIds = new Set();
  for (const chain of manifest.chains) {
    if (!chain || typeof chain.id !== "string" || chain.id.length === 0) {
      throw new Error("Every chain must include a non-empty string id");
    }
    if (seenChainIds.has(chain.id)) {
      throw new Error(`Duplicate chain id in manifest: ${chain.id}`);
    }
    seenChainIds.add(chain.id);

    if (!Array.isArray(chain.parts) || chain.parts.length === 0) {
      throw new Error(`Chain ${chain.id} must include a non-empty parts array`);
    }
    for (const part of chain.parts) {
      if (typeof part !== "string" || part.length === 0) {
        throw new Error(`Chain ${chain.id} contains an invalid part path`);
      }
    }
    if (
      chain.outputFile !== undefined &&
      (typeof chain.outputFile !== "string" || chain.outputFile.length === 0)
    ) {
      throw new Error(`Chain ${chain.id} outputFile must be a non-empty string`);
    }
  }

  return manifest;
};

const resolveChainIds = (manifest, options) => {
  if (options.all) {
    return manifest.chains.map((chain) => chain.id);
  }
  return [options.chain];
};

const parseJsonFrontmatter = (text, relativePath) => {
  const normalizedText = normalizeLineEndings(text);
  if (!normalizedText.startsWith("---\n")) {
    throw new Error(`Part file ${relativePath} must start with JSON frontmatter delimited by ---`);
  }

  const endIndex = normalizedText.indexOf("\n---\n", 4);
  if (endIndex === -1) {
    throw new Error(`Part file ${relativePath} is missing closing --- frontmatter delimiter`);
  }

  const metadataText = normalizedText.slice(4, endIndex).trim();
  if (!metadataText.startsWith("{")) {
    throw new Error(`Part file ${relativePath} frontmatter must be a JSON object`);
  }

  let metadata;
  try {
    metadata = JSON.parse(metadataText);
  } catch (error) {
    throw new Error(
      `Part file ${relativePath} has invalid JSON frontmatter: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const body = normalizedText.slice(endIndex + 5).replace(/^\n/, "");
  return { metadata, body };
};

const assertStringArray = (value, fieldName, relativePath, { allowEmpty = true } = {}) => {
  if (!Array.isArray(value)) {
    throw new Error(`Part file ${relativePath} metadata.${fieldName} must be an array`);
  }
  if (!allowEmpty && value.length === 0) {
    throw new Error(`Part file ${relativePath} metadata.${fieldName} must not be empty`);
  }
  for (const entry of value) {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      throw new Error(`Part file ${relativePath} metadata.${fieldName} must contain non-empty strings`);
    }
  }
};

const validatePartMetadata = (metadata, relativePath) => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new Error(`Part file ${relativePath} metadata must be an object`);
  }

  if (typeof metadata.id !== "string" || metadata.id.trim().length === 0) {
    throw new Error(`Part file ${relativePath} metadata.id must be a non-empty string`);
  }

  if (typeof metadata.kind !== "string" || !PART_KINDS.has(metadata.kind)) {
    throw new Error(
      `Part file ${relativePath} metadata.kind must be one of: ${Array.from(PART_KINDS).join(", ")}`,
    );
  }

  assertStringArray(metadata.appliesWhen, "appliesWhen", relativePath, { allowEmpty: false });
  assertStringArray(metadata.conflictsWith, "conflictsWith", relativePath);
  assertStringArray(metadata.overridesSections, "overridesSections", relativePath);

  if (!Number.isInteger(metadata.priority) || metadata.priority < 0) {
    throw new Error(`Part file ${relativePath} metadata.priority must be an integer >= 0`);
  }
};

const extractSectionTitles = (body) => {
  const headings = [];
  const matcher = /^##+\s+(.+?)\s*$/gm;
  let match = matcher.exec(body);
  while (match) {
    headings.push(match[1].trim());
    match = matcher.exec(body);
  }
  return headings;
};

const loadPromptContext = async (manifestPath) => {
  const manifest = await loadManifest(manifestPath);
  const manifestDir = path.dirname(manifestPath);
  const relativePartPaths = Array.from(
    new Set(manifest.chains.flatMap((chain) => chain.parts)),
  );

  const partByRelativePath = new Map();
  const partById = new Map();
  for (const relativePartPath of relativePartPaths) {
    const absolutePartPath = path.resolve(manifestDir, relativePartPath);
    const text = await readFile(absolutePartPath, "utf8");
    const { metadata, body } = parseJsonFrontmatter(text, relativePartPath);
    validatePartMetadata(metadata, relativePartPath);
    const normalizedBody = normalizePromptBody(body);
    const sectionTitles = extractSectionTitles(normalizedBody);

    if (partById.has(metadata.id)) {
      const existing = partById.get(metadata.id);
      throw new Error(
        `Duplicate part metadata.id '${metadata.id}' in ${relativePartPath} and ${existing.relativePath}`,
      );
    }

    const partEntry = {
      relativePath: relativePartPath,
      absolutePath: absolutePartPath,
      metadata: {
        ...metadata,
        id: metadata.id.trim(),
        kind: metadata.kind,
        appliesWhen: metadata.appliesWhen.map((entry) => entry.trim()),
        conflictsWith: metadata.conflictsWith.map((entry) => entry.trim()),
        overridesSections: metadata.overridesSections.map((entry) => entry.trim()),
        priority: metadata.priority,
      },
      body: normalizedBody,
      sectionTitles,
      overrideSet: new Set(metadata.overridesSections.map((entry) => normalizeHeading(entry))),
    };

    partByRelativePath.set(relativePartPath, partEntry);
    partById.set(partEntry.metadata.id, partEntry);
  }

  for (const partEntry of partByRelativePath.values()) {
    for (const conflictId of partEntry.metadata.conflictsWith) {
      if (!partById.has(conflictId)) {
        throw new Error(
          `Part ${partEntry.relativePath} declares unknown conflict id '${conflictId}'`,
        );
      }
    }
  }

  return {
    manifest,
    manifestDir,
    partByRelativePath,
    partById,
  };
};

const lintChainsFromContext = (context, chainIds) => {
  const chainLookup = toRecord(context.manifest.chains);
  const errors = [];
  const checkedChainIds = [];

  for (const chainId of chainIds) {
    const chain = chainLookup.get(chainId);
    if (!chain) {
      errors.push(`Unknown chain id: ${chainId}`);
      continue;
    }

    checkedChainIds.push(chainId);
    const partEntries = chain.parts.map((relativePath) => {
      const partEntry = context.partByRelativePath.get(relativePath);
      if (!partEntry) {
        errors.push(`Chain ${chain.id} references unknown part path: ${relativePath}`);
      }
      return partEntry;
    });

    if (partEntries.some((entry) => !entry)) {
      continue;
    }

    const chainPartIds = new Set(partEntries.map((entry) => entry.metadata.id));

    let previousPriority = Number.NEGATIVE_INFINITY;
    for (const partEntry of partEntries) {
      if (partEntry.metadata.priority < previousPriority) {
        errors.push(
          `Chain ${chain.id} has non-monotonic priorities at part ${partEntry.relativePath} (${partEntry.metadata.priority} after ${previousPriority})`,
        );
      }
      previousPriority = partEntry.metadata.priority;
    }

    for (const partEntry of partEntries) {
      for (const conflictId of partEntry.metadata.conflictsWith) {
        if (chainPartIds.has(conflictId)) {
          errors.push(
            `Chain ${chain.id} includes conflicting parts: ${partEntry.metadata.id} conflicts with ${conflictId}`,
          );
        }
      }
    }

    const firstSeenByHeading = new Map();
    for (const partEntry of partEntries) {
      const seenInPart = new Set();
      for (const sectionTitle of partEntry.sectionTitles) {
        const normalizedTitle = normalizeHeading(sectionTitle);
        if (seenInPart.has(normalizedTitle)) {
          continue;
        }
        seenInPart.add(normalizedTitle);

        const previous = firstSeenByHeading.get(normalizedTitle);
        if (!previous) {
          firstSeenByHeading.set(normalizedTitle, {
            sectionTitle,
            partId: partEntry.metadata.id,
            relativePath: partEntry.relativePath,
          });
          continue;
        }

        if (previous.partId === partEntry.metadata.id) {
          continue;
        }

        const isAllowedOverride = partEntry.overrideSet.has(normalizedTitle);
        if (!isAllowedOverride) {
          errors.push(
            `Chain ${chain.id} duplicates section title '${sectionTitle}' in ${partEntry.relativePath}; first seen in ${previous.relativePath}. Add metadata.overridesSections entry to allow this override.`,
          );
        }
      }
    }
  }

  return { checkedChainIds, errors };
};

export const lintPromptChains = async ({
  manifestPath = DEFAULT_MANIFEST_PATH,
  chainIds = null,
} = {}) => {
  const resolvedManifestPath = path.resolve(process.cwd(), manifestPath);
  const context = await loadPromptContext(resolvedManifestPath);
  const selectedChainIds =
    chainIds ?? context.manifest.chains.map((chain) => chain.id);
  const result = lintChainsFromContext(context, selectedChainIds);
  return {
    manifestPath: resolvedManifestPath,
    checkedChainIds: result.checkedChainIds,
    errors: result.errors,
    isValid: result.errors.length === 0,
  };
};

export const listChains = async ({ manifestPath = DEFAULT_MANIFEST_PATH } = {}) => {
  const resolvedManifestPath = path.resolve(process.cwd(), manifestPath);
  const context = await loadPromptContext(resolvedManifestPath);

  return context.manifest.chains.map((chain) => {
    const parts = chain.parts.map((relativePath) => {
      const part = context.partByRelativePath.get(relativePath);
      return {
        path: relativePath,
        id: part.metadata.id,
        kind: part.metadata.kind,
        priority: part.metadata.priority,
      };
    });
    return {
      id: chain.id,
      title: chain.title ?? chain.id,
      parts,
      outputFile: chain.outputFile ?? `${chain.id}.md`,
    };
  });
};

const renderChain = (chain, context) => {
  const sections = [];
  for (const relativePartPath of chain.parts) {
    const partEntry = context.partByRelativePath.get(relativePartPath);
    sections.push(partEntry.body);
  }
  return `${sections.join("\n\n")}\n`;
};

export const assemblePromptChains = async ({
  manifestPath = DEFAULT_MANIFEST_PATH,
  outDir = DEFAULT_OUT_DIR,
  chainIds = null,
  writeFiles = true,
  lint = true,
} = {}) => {
  const resolvedManifestPath = path.resolve(process.cwd(), manifestPath);
  const resolvedOutDir = path.resolve(process.cwd(), outDir);
  const context = await loadPromptContext(resolvedManifestPath);
  const chainLookup = toRecord(context.manifest.chains);
  const requestedIds = chainIds ?? context.manifest.chains.map((chain) => chain.id);

  for (const chainId of requestedIds) {
    if (!chainLookup.has(chainId)) {
      throw new Error(`Unknown chain id: ${chainId}`);
    }
  }

  if (lint) {
    const lintResult = lintChainsFromContext(context, requestedIds);
    if (lintResult.errors.length > 0) {
      throw new Error(`Prompt lint failed:\n- ${lintResult.errors.join("\n- ")}`);
    }
  }

  if (writeFiles) {
    await mkdir(resolvedOutDir, { recursive: true });
  }

  const outputs = [];
  for (const chainId of requestedIds) {
    const chain = chainLookup.get(chainId);
    const outputFile = chain.outputFile ?? `${chain.id}.md`;
    const outputPath = path.resolve(resolvedOutDir, outputFile);
    const body = renderChain(chain, context);
    if (writeFiles) {
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, body, "utf8");
    }
    outputs.push({
      id: chain.id,
      title: chain.title ?? chain.id,
      outputFile,
      outputPath,
      body,
      partCount: chain.parts.length,
    });
  }

  return {
    manifestPath: resolvedManifestPath,
    outDir: resolvedOutDir,
    chains: outputs,
  };
};

const runCli = async () => {
  const options = parseArgs(process.argv.slice(2));
  const resolvedManifestPath = path.resolve(process.cwd(), options.manifest);

  if (options.list) {
    const chains = await listChains({ manifestPath: options.manifest });
    for (const chain of chains) {
      console.log(`${chain.id}\t${chain.outputFile}\tparts=${chain.parts.length}`);
    }
    return;
  }

  const manifest = await loadManifest(resolvedManifestPath);
  const chainIds = resolveChainIds(manifest, options);

  if (options.lint) {
    const lintResult = await lintPromptChains({
      manifestPath: options.manifest,
      chainIds,
    });
    if (!lintResult.isValid) {
      throw new Error(`Prompt lint failed:\n- ${lintResult.errors.join("\n- ")}`);
    }
    console.log(`lint passed for ${lintResult.checkedChainIds.length} chain(s)`);
    return;
  }

  const result = await assemblePromptChains({
    manifestPath: options.manifest,
    outDir: options.outDir,
    chainIds,
    writeFiles: !options.stdout,
    lint: true,
  });

  if (options.stdout) {
    if (result.chains.length !== 1) {
      throw new Error("--stdout can only render exactly one chain");
    }
    process.stdout.write(result.chains[0].body);
    return;
  }

  for (const chain of result.chains) {
    console.log(
      `assembled ${chain.id} -> ${path.relative(process.cwd(), chain.outputPath)} (${chain.partCount} parts)`,
    );
  }
};

const isMainModule = () => {
  const entryPath = process.argv[1];
  if (!entryPath) {
    return false;
  }
  return fileURLToPath(import.meta.url) === path.resolve(entryPath);
};

if (isMainModule()) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
