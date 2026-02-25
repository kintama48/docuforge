#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildBenchmarkReportFromK6, safeParseJsonFile } from "../lib/summary-to-benchmark.mjs";

function parseArgs(argv) {
  const args = {
    summary: "load-test/results/k6-summary.json",
    output: "frontend/src/data/benchmarks/latest.json",
    profile: process.env.K6_PROFILE || "baseline",
    command: "cd load-test && ./scripts/run-k6-benchmark.sh",
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--summary") args.summary = argv[++index];
    else if (arg === "--output") args.output = argv[++index];
    else if (arg === "--profile") args.profile = argv[++index];
    else if (arg === "--command") args.command = argv[++index];
  }

  return args;
}

function main() {
  const args = parseArgs(process.argv);
  const summaryPath = resolve(process.cwd(), args.summary);
  const outputPath = resolve(process.cwd(), args.output);

  const k6Summary = JSON.parse(readFileSync(summaryPath, "utf8"));
  const existingReport = safeParseJsonFile(outputPath);

  const report = buildBenchmarkReportFromK6({
    k6Summary,
    existingReport,
    profile: args.profile,
    command: args.command,
  });

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Benchmark report updated: ${outputPath}`);
  console.log(`DocuForge speed p50: ${report.tools[0].speedMs.p50}ms`);
  console.log(`DocuForge cold-start probe p50: ${report.tools[0].coldStartMs.p50}ms`);
}

main();
