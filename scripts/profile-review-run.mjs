#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const index = args.indexOf(name);
  if (index === -1 || index + 1 >= args.length) {
    return fallback;
  }
  return args[index + 1];
};

const iterations = Number.parseInt(getArg("--iterations", "5"), 10);
const outPath = getArg("--out", "");

if (!Number.isFinite(iterations) || iterations < 1) {
  console.error("--iterations must be an integer >= 1");
  process.exit(1);
}

const fixture = async (...segments) =>
  readFile(path.resolve(process.cwd(), "src", "test-fixtures", ...segments), "utf8");

const validSchemaText = await fixture("schema", "valid-2020-12.json");
const validFrdText = await fixture("frd", "valid-frd.json");
const invalidSchemaFrdText = await fixture("frd", "invalid-schema.frd");
const invalidJsonFrdText = await fixture("frd", "invalid-json.frd");

const validSchema = JSON.parse(validSchemaText);

const makeLargeValidFrd = (index) =>
  JSON.stringify({
    title: `Large FRD ${index + 1}`,
    description: `Synthetic large payload ${index + 1}`,
  });

const measureScenario = (name, fileTexts) => {
  const perIteration = [];

  for (let i = 0; i < iterations; i += 1) {
    const t0 = performance.now();

    const compileStart = performance.now();
    const ajv = new Ajv2020({ strict: true, allErrors: true, validateFormats: true });
    addFormats(ajv);
    const validator = ajv.compile(validSchema);
    const compileMs = performance.now() - compileStart;

    const parseValidateStart = performance.now();
    let passed = 0;
    let validationFailed = 0;
    let parseFailed = 0;

    for (const text of fileTexts) {
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parseFailed += 1;
        continue;
      }

      const ok = validator(parsed);
      if (ok) {
        passed += 1;
      } else {
        validationFailed += 1;
      }
    }

    const parseValidateMs = performance.now() - parseValidateStart;
    const totalMs = performance.now() - t0;

    perIteration.push({
      compileMs,
      parseValidateMs,
      totalMs,
      passed,
      validationFailed,
      parseFailed,
      totalFiles: fileTexts.length,
    });
  }

  const avg = (key) => perIteration.reduce((sum, row) => sum + row[key], 0) / perIteration.length;

  const last = perIteration[perIteration.length - 1];
  return {
    name,
    iterations,
    totalFiles: last.totalFiles,
    counts: {
      passed: last.passed,
      validationFailed: last.validationFailed,
      parseFailed: last.parseFailed,
    },
    timingsMs: {
      compileAvg: Number(avg("compileMs").toFixed(2)),
      parseValidateAvg: Number(avg("parseValidateMs").toFixed(2)),
      totalAvg: Number(avg("totalMs").toFixed(2)),
      perFileAvg: Number((avg("totalMs") / last.totalFiles).toFixed(3)),
    },
  };
};

const scenarios = [
  {
    name: "success_mixed_size",
    files: [
      validFrdText,
      validFrdText,
      JSON.stringify({ title: "Small FRD" }),
      JSON.stringify({ title: "Medium FRD", description: "x".repeat(1000) }),
      JSON.stringify({ title: "Large FRD", description: "x".repeat(8000) }),
    ],
  },
  {
    name: "error_parse_and_validation",
    files: [
      validFrdText,
      invalidSchemaFrdText,
      invalidJsonFrdText,
      JSON.stringify({ description: "missing title" }),
      validFrdText,
    ],
  },
  {
    name: "edge_large_batch_60",
    files: Array.from({ length: 60 }, (_, index) => {
      if (index % 12 === 0) {
        return invalidJsonFrdText;
      }
      if (index % 7 === 0) {
        return invalidSchemaFrdText;
      }
      return makeLargeValidFrd(index);
    }),
  },
];

const results = scenarios.map((scenario) => measureScenario(scenario.name, scenario.files));

const output = {
  generatedAt: new Date().toISOString(),
  node: process.version,
  iterations,
  results,
};

if (outPath) {
  await writeFile(path.resolve(process.cwd(), outPath), JSON.stringify(output, null, 2));
}

const lines = [];
lines.push("Scenario | Files | Passed | Validation Failed | Parse Failed | Avg Total (ms) | Avg Per File (ms)");
lines.push("--- | ---:| ---:| ---:| ---:| ---:| ---:");
for (const result of results) {
  lines.push(
    `${result.name} | ${result.totalFiles} | ${result.counts.passed} | ${result.counts.validationFailed} | ${result.counts.parseFailed} | ${result.timingsMs.totalAvg} | ${result.timingsMs.perFileAvg}`,
  );
}

console.log(`profile-review-run (iterations=${iterations})`);
console.log(lines.join("\n"));
if (outPath) {
  console.log(`wrote JSON metrics to ${outPath}`);
}
