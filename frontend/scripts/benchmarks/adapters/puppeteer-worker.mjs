import fs from "node:fs/promises";
import { performance } from "node:perf_hooks";

function parseArgs(argv) {
  const args = {
    mode: "speed",
    iterations: 10,
    html: "",
    timeoutMs: 30000,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const value = argv[index + 1];
    if (token === "--mode" && value) {
      args.mode = value;
      index += 1;
    } else if (token === "--iterations" && value) {
      args.iterations = Number(value);
      index += 1;
    } else if (token === "--html" && value) {
      args.html = value;
      index += 1;
    } else if (token === "--timeout-ms" && value) {
      args.timeoutMs = Number(value);
      index += 1;
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.html) {
    throw new Error("Missing --html path");
  }
  if (!Number.isFinite(args.iterations) || args.iterations < 1) {
    throw new Error("--iterations must be >= 1");
  }
  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs < 1) {
    throw new Error("--timeout-ms must be >= 1");
  }

  const html = await fs.readFile(args.html, "utf8");

  let puppeteer;
  try {
    ({ default: puppeteer } = await import("puppeteer"));
  } catch {
    console.error("puppeteer package is not installed");
    process.exit(2);
  }

  const durationsMs = [];

  if (args.mode === "speed") {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      for (let run = 0; run < args.iterations; run += 1) {
        const started = performance.now();
        await page.setContent(html, { waitUntil: "load", timeout: args.timeoutMs });
        await page.pdf({ format: "A4", printBackground: true });
        durationsMs.push(performance.now() - started);
      }
    } finally {
      await browser.close();
    }
  } else if (args.mode === "cold") {
    for (let run = 0; run < args.iterations; run += 1) {
      const started = performance.now();
      const browser = await puppeteer.launch({ headless: true });
      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "load", timeout: args.timeoutMs });
        await page.pdf({ format: "A4", printBackground: true });
      } finally {
        await browser.close();
      }
      durationsMs.push(performance.now() - started);
    }
  } else {
    throw new Error(`Unsupported --mode: ${args.mode}`);
  }

  process.stdout.write(`${JSON.stringify({ durationsMs })}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
