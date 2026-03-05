#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const ROOT = process.cwd();
const EXCLUDED_DIRS = new Set([
  ".git",
  "node_modules",
  "vendor",
  "target",
  ".next",
  "dist",
  "build",
  ".cache",
]);

const TS_ROOTS = [
  "api/src",
  "frontend/src",
  "mcp-server/src",
  "load-test/lib",
  "load-test/scripts",
  "load-test/k6",
];

const RUST_ROOT = "engine/src";
const TEST_PATH_PATTERN = /(^|\/)(tests?)\/|\.test\.[^/]+$|\.spec\.[^/]+$/;

function walkFiles(dir, collector) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) {
      continue;
    }
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, collector);
      continue;
    }
    collector.push(fullPath);
  }
}

function findFiles(roots, allowedExts) {
  const files = [];
  for (const root of roots) {
    const abs = join(ROOT, root);
    try {
      if (!statSync(abs).isDirectory()) continue;
      walkFiles(abs, files);
    } catch {
      // ignore missing roots
    }
  }
  return files.filter((path) => allowedExts.has(extname(path).toLowerCase()));
}

function toPosixPath(pathname) {
  return normalize(pathname).replace(/\\/g, "/");
}

function lineViolations(pathname, content, checks) {
  const violations = [];
  const lines = content.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const check of checks) {
      const regex = new RegExp(check.pattern.source, check.pattern.flags);
      let match;
      while ((match = regex.exec(line)) !== null) {
        violations.push({
          file: pathname,
          line: index + 1,
          column: (match.index ?? 0) + 1,
          rule: check.rule,
          snippet: line.trim(),
        });
      }
    }
  }
  return violations;
}

function scanTypeScriptSources() {
  const files = findFiles(TS_ROOTS, new Set([".ts", ".tsx", ".mts", ".cts"]));
  const checks = [
    {
      rule: "no-non-null-assertion",
      pattern: /[A-Za-z0-9_\]\)]!\s*(?:[.\[,);])/g,
    },
    {
      rule: "no-as-any",
      pattern: /\bas\s+any\b/g,
    },
    {
      rule: "no-as-unknown-as",
      pattern: /\bas\s+unknown\s+as\b/g,
    },
  ];

  const violations = [];
  for (const file of files) {
    const rel = toPosixPath(file.replace(`${ROOT}/`, ""));
    if (TEST_PATH_PATTERN.test(rel)) continue;
    const content = readFileSync(file, "utf8");
    violations.push(...lineViolations(rel, content, checks));
  }
  return violations;
}

function stripRustTestSection(content) {
  const marker = "\n#[cfg(test)]";
  const index = content.indexOf(marker);
  if (index === -1) return content;
  return content.slice(0, index);
}

function scanRustSources() {
  const files = findFiles([RUST_ROOT], new Set([".rs"]));
  const checks = [
    { rule: "no-panic", pattern: /\bpanic!\s*\(/g },
    { rule: "no-unwrap", pattern: /\.unwrap\s*\(/g },
    { rule: "no-expect", pattern: /\.expect\s*\(/g },
  ];

  const violations = [];
  for (const file of files) {
    const rel = toPosixPath(file.replace(`${ROOT}/`, ""));
    const raw = readFileSync(file, "utf8");
    const content = stripRustTestSection(raw);
    violations.push(...lineViolations(rel, content, checks));
  }
  return violations;
}

function main() {
  const violations = [...scanTypeScriptSources(), ...scanRustSources()];
  if (violations.length === 0) {
    console.log("assertions-check: ok");
    return;
  }

  console.error("assertions-check: violations detected");
  for (const violation of violations) {
    console.error(
      `${violation.file}:${violation.line}:${violation.column} ${violation.rule} :: ${violation.snippet}`
    );
  }
  process.exitCode = 1;
}

main();
