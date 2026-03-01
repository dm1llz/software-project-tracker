import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "prompt-assembler-"));
  tempDirs.push(tempDir);
  return tempDir;
};

const writeJson = async (targetPath: string, value: unknown): Promise<void> => {
  await writeFile(targetPath, JSON.stringify(value, null, 2), "utf8");
};

const promptPart = ({
  id,
  kind,
  appliesWhen,
  priority,
  conflictsWith = [],
  overridesSections = [],
  body,
}: {
  id: string;
  kind: "base" | "overlay" | "language_overlay" | "ci_overlay";
  appliesWhen: string[];
  priority: number;
  conflictsWith?: string[];
  overridesSections?: string[];
  body: string;
}): string =>
  `---
${JSON.stringify(
  {
    id,
    kind,
    appliesWhen,
    priority,
    conflictsWith,
    overridesSections,
  },
  null,
  2,
)}
---

${body}
`;

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(async (tempDir) => {
      await rm(tempDir, { recursive: true, force: true });
    }),
  );
});

describe("assemble-prompts script", () => {
  it("assembles a selected chain in declared part order", async () => {
    const tempDir = await makeTempDir();
    const promptsDir = path.join(tempDir, "prompts");
    const outputDir = path.join(tempDir, "dist");
    await mkdir(promptsDir, { recursive: true });
    await writeFile(
      path.join(promptsDir, "base.md"),
      promptPart({
        id: "base",
        kind: "base",
        appliesWhen: ["always"],
        priority: 10,
        body: "Base prompt section",
      }),
      "utf8",
    );
    await writeFile(
      path.join(promptsDir, "overlay.md"),
      promptPart({
        id: "overlay",
        kind: "overlay",
        appliesWhen: ["mode:default"],
        priority: 20,
        body: "Overlay section",
      }),
      "utf8",
    );
    const manifestPath = path.join(promptsDir, "prompt-chains.json");
    await writeJson(manifestPath, {
      version: 1,
      chains: [
        {
          id: "combo",
          outputFile: "combo.md",
          parts: ["base.md", "overlay.md"],
        },
      ],
    });

    const { assemblePromptChains } = await import("../../scripts/assemble-prompts.mjs");
    const result = await assemblePromptChains({
      manifestPath,
      outDir: outputDir,
      chainIds: ["combo"],
    });

    expect(result.chains).toHaveLength(1);
    expect(result.chains[0].id).toBe("combo");
    const assembled = await readFile(path.join(outputDir, "combo.md"), "utf8");
    expect(assembled).toBe("Base prompt section\n\nOverlay section\n");
  });

  it("lists chains with output file defaults", async () => {
    const tempDir = await makeTempDir();
    const promptsDir = path.join(tempDir, "prompts");
    await mkdir(promptsDir, { recursive: true });
    await writeFile(
      path.join(promptsDir, "base.md"),
      promptPart({
        id: "base",
        kind: "base",
        appliesWhen: ["always"],
        priority: 10,
        body: "Base prompt",
      }),
      "utf8",
    );
    const manifestPath = path.join(promptsDir, "prompt-chains.json");
    await writeJson(manifestPath, {
      version: 1,
      chains: [
        {
          id: "base-only",
          title: "Base Only",
          parts: ["base.md"],
        },
      ],
    });

    const { listChains } = await import("../../scripts/assemble-prompts.mjs");
    const chains = await listChains({ manifestPath });
    expect(chains).toEqual([
      {
        id: "base-only",
        title: "Base Only",
        parts: [
          {
            path: "base.md",
            id: "base",
            kind: "base",
            priority: 10,
          },
        ],
        outputFile: "base-only.md",
      },
    ]);
  });

  it("fails when an unknown chain id is requested", async () => {
    const tempDir = await makeTempDir();
    const promptsDir = path.join(tempDir, "prompts");
    const outputDir = path.join(tempDir, "dist");
    await mkdir(promptsDir, { recursive: true });
    await writeFile(
      path.join(promptsDir, "base.md"),
      promptPart({
        id: "base",
        kind: "base",
        appliesWhen: ["always"],
        priority: 10,
        body: "Base prompt",
      }),
      "utf8",
    );
    const manifestPath = path.join(promptsDir, "prompt-chains.json");
    await writeJson(manifestPath, {
      version: 1,
      chains: [
        {
          id: "base-only",
          parts: ["base.md"],
        },
      ],
    });

    const { assemblePromptChains } = await import("../../scripts/assemble-prompts.mjs");
    await expect(
      assemblePromptChains({
        manifestPath,
        outDir: outputDir,
        chainIds: ["missing-chain"],
      }),
    ).rejects.toThrow(/Unknown chain id: missing-chain/);
  });

  it("fails lint when duplicate section titles appear without override metadata", async () => {
    const tempDir = await makeTempDir();
    const promptsDir = path.join(tempDir, "prompts");
    await mkdir(promptsDir, { recursive: true });
    await writeFile(
      path.join(promptsDir, "base.md"),
      promptPart({
        id: "base",
        kind: "base",
        appliesWhen: ["always"],
        priority: 10,
        body: "## Shared Section\n- base",
      }),
      "utf8",
    );
    await writeFile(
      path.join(promptsDir, "overlay.md"),
      promptPart({
        id: "overlay",
        kind: "overlay",
        appliesWhen: ["mode:default"],
        priority: 20,
        body: "## Shared Section\n- overlay",
      }),
      "utf8",
    );

    const manifestPath = path.join(promptsDir, "prompt-chains.json");
    await writeJson(manifestPath, {
      version: 1,
      chains: [
        {
          id: "chain",
          parts: ["base.md", "overlay.md"],
        },
      ],
    });

    const { lintPromptChains } = await import("../../scripts/assemble-prompts.mjs");
    const lintResult = await lintPromptChains({ manifestPath, chainIds: ["chain"] });
    expect(lintResult.isValid).toBe(false);
    expect(lintResult.errors.join("\n")).toMatch(/duplicates section title/i);
  });

  it("allows duplicate section titles when overridesSections is declared", async () => {
    const tempDir = await makeTempDir();
    const promptsDir = path.join(tempDir, "prompts");
    const outputDir = path.join(tempDir, "dist");
    await mkdir(promptsDir, { recursive: true });
    await writeFile(
      path.join(promptsDir, "base.md"),
      promptPart({
        id: "base",
        kind: "base",
        appliesWhen: ["always"],
        priority: 10,
        body: "## Shared Section\n- base",
      }),
      "utf8",
    );
    await writeFile(
      path.join(promptsDir, "overlay.md"),
      promptPart({
        id: "overlay",
        kind: "overlay",
        appliesWhen: ["mode:default"],
        priority: 20,
        overridesSections: ["Shared Section"],
        body: "## Shared Section\n- overlay",
      }),
      "utf8",
    );

    const manifestPath = path.join(promptsDir, "prompt-chains.json");
    await writeJson(manifestPath, {
      version: 1,
      chains: [
        {
          id: "chain",
          outputFile: "chain.md",
          parts: ["base.md", "overlay.md"],
        },
      ],
    });

    const { lintPromptChains, assemblePromptChains } = await import(
      "../../scripts/assemble-prompts.mjs"
    );
    const lintResult = await lintPromptChains({ manifestPath, chainIds: ["chain"] });
    expect(lintResult.isValid).toBe(true);
    expect(lintResult.errors).toEqual([]);

    await expect(
      assemblePromptChains({
        manifestPath,
        outDir: outputDir,
        chainIds: ["chain"],
      }),
    ).resolves.toBeDefined();
  });
});
