import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";

type ToolId = "docuforge" | "puppeteer" | "wkhtmltopdf" | "weasyprint";

type Percentiles = {
  mean: number;
  p50: number;
  p95: number;
  p99: number;
};

type ToolReport = {
  id: ToolId;
  name: string;
  available: boolean;
  samples?: number;
  version?: string;
  reasonUnavailable?: string;
  speedMs?: Percentiles;
  coldStartMs?: Percentiles;
  peakMemoryMb?: Percentiles;
};

type BenchmarkReport = {
  schemaVersion: 1;
  generatedAt: string;
  source: "measured";
  scenario: {
    id: string;
    title: string;
    description: string;
  };
  iterations: number;
  coldStartIterations: number;
  methodology: {
    summary: string;
    command: string;
  };
  tools: ToolReport[];
};

const TOOL_NAMES: Record<ToolId, string> = {
  docuforge: "DocuForge",
  puppeteer: "Puppeteer",
  wkhtmltopdf: "wkhtmltopdf",
  weasyprint: "WeasyPrint",
};

const FRONTEND_DIR = resolve(__dirname, "..", "..");
const REPO_ROOT = resolve(FRONTEND_DIR, "..");
const ENGINE_DIR = resolve(REPO_ROOT, "engine");
const ENGINE_BINARY_PATH = resolve(ENGINE_DIR, "target", "release", "docuforge-engine");
const OUTPUT_PATH = resolve(
  FRONTEND_DIR,
  process.env.BENCH_OUTPUT_JSON || "src/data/benchmarks/latest.json"
);
const ITERATIONS = parsePositiveInt(process.env.BENCH_ITERATIONS, 25);
const COLD_START_ITERATIONS = parsePositiveInt(process.env.BENCH_COLD_START_ITERATIONS, 8);
const REQUEST_TIMEOUT_MS = parsePositiveInt(process.env.BENCH_REQUEST_TIMEOUT_MS, 25_000);
const ENGINE_BOOT_TIMEOUT_MS = parsePositiveInt(process.env.BENCH_ENGINE_BOOT_TIMEOUT_MS, 240_000);
const SKIP_ENGINE_BUILD = String(process.env.BENCH_SKIP_ENGINE_BUILD || "0") === "1";
const REQUIRE_ALL_TOOLS = String(process.env.BENCH_REQUIRE_ALL_TOOLS || "0") === "1";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Usage: bun run scripts/benchmarks/run-competitor-benchmarks.ts

Environment variables:
  BENCH_ITERATIONS                Number of steady-state runs per tool (default: 25)
  BENCH_COLD_START_ITERATIONS     Number of cold-start runs per tool (default: 8)
  BENCH_REQUEST_TIMEOUT_MS        Per-run timeout in milliseconds (default: 25000)
  BENCH_ENGINE_BOOT_TIMEOUT_MS    Engine boot timeout in milliseconds (default: 240000)
  BENCH_SKIP_ENGINE_BUILD         Set to 1 to skip cargo build when binary exists
  BENCH_OUTPUT_JSON               Output path relative to frontend/ (default: src/data/benchmarks/latest.json)
  BENCH_REQUIRE_ALL_TOOLS         Set to 1 to fail when any competitor is unavailable
`);
  process.exit(0);
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function commandExists(command: string): boolean {
  const probe = spawnSync("sh", ["-lc", `command -v ${command}`], {
    stdio: "ignore",
  });
  return probe.status === 0;
}

function getRandomPort(): number {
  return 3400 + Math.floor(Math.random() * 400);
}

function ensureEngineBinary(): void {
  if (SKIP_ENGINE_BUILD && existsSync(ENGINE_BINARY_PATH)) {
    return;
  }

  const build = spawnSync("cargo", ["build", "--release"], {
    cwd: ENGINE_DIR,
    stdio: "inherit",
  });

  invariant(build.status === 0, "Failed to build DocuForge engine binary");
  invariant(existsSync(ENGINE_BINARY_PATH), `Engine binary not found at ${ENGINE_BINARY_PATH}`);
}

function getTemplatePayload() {
  const source = `#set page(paper: "a4", margin: 1.4cm)
#set text(font: "Inter", size: 11pt)

= Invoice #sys.inputs.invoice_id

Customer: #sys.inputs.customer
Date: #sys.inputs.date

#for item in sys.inputs.items [
  - #item.description
]

#align(right)[*Grand total: #sys.inputs.total*]
`;

  const items = Array.from({ length: 36 }, (_, index) => ({
    description: `Line item ${index + 1}`,
    qty: (index % 4) + 1,
    price: 14 + (index % 7),
  }));

  const total = items.reduce((sum, item) => sum + item.qty * item.price, 0);

  return {
    typst: {
      template: {
        main: "main.typ",
        files: {
          "main.typ": source,
        },
      },
      data: {
        invoice_id: "INV-2026-BENCH",
        customer: "Benchmark Industries",
        date: "2026-02-24",
        items,
        total,
      },
      options: {
        timeout_ms: REQUEST_TIMEOUT_MS,
      },
    },
    html: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; font-size: 13px; color: #111827; }
      h1 { font-size: 24px; margin-bottom: 8px; }
      .meta { margin-bottom: 16px; color: #374151; }
      table { border-collapse: collapse; width: 100%; margin-top: 12px; }
      th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; }
      th { background: #f3f4f6; }
      .right { text-align: right; }
      .total { margin-top: 16px; text-align: right; font-weight: bold; }
    </style>
  </head>
  <body>
    <h1>Invoice INV-2026-BENCH</h1>
    <div class="meta">Customer: Benchmark Industries</div>
    <div class="meta">Date: 2026-02-24</div>
    <table>
      <thead>
        <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `<tr><td>${item.description}</td><td>${item.qty}</td><td>$${item.price}</td><td>$${item.qty * item.price}</td></tr>`
          )
          .join("\n")}
      </tbody>
    </table>
    <div class="total">Grand total: $${total}</div>
  </body>
</html>`,
  };
}

function computePercentiles(values: number[]): Percentiles {
  invariant(values.length > 0, "Cannot compute percentiles for empty input");
  const sorted = [...values].sort((a, b) => a - b);
  const at = (percentile: number) => {
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * percentile)));
    return sorted[idx];
  };
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  return {
    mean: Number(mean.toFixed(3)),
    p50: Number(at(0.5).toFixed(3)),
    p95: Number(at(0.95).toFixed(3)),
    p99: Number(at(0.99).toFixed(3)),
  };
}

function readRssKbForPid(pid: number): number {
  const out = spawnSync("ps", ["-o", "rss=", "-p", String(pid)], {
    encoding: "utf8",
  });
  if (out.status !== 0) return 0;
  const parsed = Number(String(out.stdout).trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function listChildrenPids(pid: number): number[] {
  const out = spawnSync("pgrep", ["-P", String(pid)], {
    encoding: "utf8",
  });
  if (out.status !== 0 || !out.stdout) return [];
  return String(out.stdout)
    .split("\n")
    .map((line) => Number(line.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function readProcessTreeRssKb(pid: number, seen = new Set<number>()): number {
  if (seen.has(pid)) return 0;
  seen.add(pid);

  let total = readRssKbForPid(pid);
  const children = listChildrenPids(pid);
  for (const child of children) {
    total += readProcessTreeRssKb(child, seen);
  }

  return total;
}

function startPeakTracker(pid: number, intervalMs = 40): { stop: () => number } {
  let maxRssKb = 0;
  const sample = () => {
    const rss = readProcessTreeRssKb(pid);
    if (rss > maxRssKb) {
      maxRssKb = rss;
    }
  };
  sample();
  const timer = setInterval(() => {
    sample();
  }, intervalMs);

  return {
    stop: () => {
      clearInterval(timer);
      sample();
      return Number((maxRssKb / 1024).toFixed(3));
    },
  };
}

async function waitForHealthyEngine(baseUrl: string, timeoutMs = ENGINE_BOOT_TIMEOUT_MS): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // retry
    }
    await delay(200);
  }
  throw new Error(`Engine health check timed out for ${baseUrl}`);
}

function killProcess(processRef: ReturnType<typeof spawn>): Promise<void> {
  return new Promise((resolvePromise) => {
    if (processRef.killed || processRef.exitCode !== null) {
      resolvePromise();
      return;
    }

    const timeout = setTimeout(() => {
      try {
        processRef.kill("SIGKILL");
      } catch {
        // noop
      }
    }, 4_000);

    processRef.once("close", () => {
      clearTimeout(timeout);
      resolvePromise();
    });

    try {
      processRef.kill("SIGTERM");
    } catch {
      clearTimeout(timeout);
      resolvePromise();
    }
  });
}

async function spawnEngine(port: number): Promise<ReturnType<typeof spawn>> {
  const engine = spawn(ENGINE_BINARY_PATH, [], {
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      LOG_LEVEL: "error",
      LOG_FORMAT: "pretty",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  engine.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
  });

  try {
    await waitForHealthyEngine(`http://127.0.0.1:${port}`);
  } catch (error) {
    await killProcess(engine);
    throw new Error(
      `Failed to boot engine on port ${port}. ${
        error instanceof Error ? error.message : String(error)
      }\n${stderr.slice(-1000)}`
    );
  }

  return engine;
}

async function renderViaEngine(baseUrl: string, payload: unknown): Promise<number> {
  const response = await fetch(`${baseUrl}/render`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Engine render failed (${response.status}): ${text.slice(0, 220)}`);
  }

  const bytes = await response.arrayBuffer();
  invariant(bytes.byteLength > 100, "Engine returned unexpectedly small PDF payload");
  return bytes.byteLength;
}

async function benchmarkDocuForge(payload: unknown): Promise<ToolReport> {
  const speedDurations: number[] = [];
  const coldStartDurations: number[] = [];
  const speedPeaks: number[] = [];
  const coldPeaks: number[] = [];

  // Speed benchmark: single long-running engine process.
  const speedPort = getRandomPort();
  const speedEngine = await spawnEngine(speedPort);
  const speedTracker = startPeakTracker(speedEngine.pid ?? 0);

  try {
    for (let run = 0; run < ITERATIONS; run += 1) {
      const started = performance.now();
      await renderViaEngine(`http://127.0.0.1:${speedPort}`, payload);
      speedDurations.push(performance.now() - started);
    }
  } finally {
    speedPeaks.push(speedTracker.stop());
    await killProcess(speedEngine);
  }

  // Cold-start benchmark: boot fresh engine each round.
  for (let run = 0; run < COLD_START_ITERATIONS; run += 1) {
    const port = getRandomPort();
    const started = performance.now();
    const engine = await spawnEngine(port);
    const tracker = startPeakTracker(engine.pid ?? 0);
    try {
      await renderViaEngine(`http://127.0.0.1:${port}`, payload);
      coldStartDurations.push(performance.now() - started);
    } finally {
      coldPeaks.push(tracker.stop());
      await killProcess(engine);
    }
  }

  return {
    id: "docuforge",
    name: TOOL_NAMES.docuforge,
    available: true,
    samples: ITERATIONS,
    version: "engine-local",
    speedMs: computePercentiles(speedDurations),
    coldStartMs: computePercentiles(coldStartDurations),
    peakMemoryMb: computePercentiles([...speedPeaks, ...coldPeaks]),
  };
}

async function runCommandWithPeak(
  command: string,
  args: string[],
  options?: {
    cwd?: string;
    timeoutMs?: number;
    input?: string;
  }
): Promise<{ durationMs: number; peakMemoryMb: number; stdout: string; stderr: string; exitCode: number }> {
  const started = performance.now();

  const child = spawn(command, args, {
    cwd: options?.cwd,
    stdio: "pipe",
  });

  let stdout = "";
  let stderr = "";

  if (options?.input) {
    child.stdin.write(options.input);
    child.stdin.end();
  }

  child.stdout.on("data", (chunk) => {
    stdout += String(chunk);
  });
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });

  const tracker = startPeakTracker(child.pid ?? 0);

  let timeout: NodeJS.Timeout | null = null;
  if (options?.timeoutMs) {
    timeout = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        // noop
      }
    }, options.timeoutMs);
  }

  const exitCode = await new Promise<number>((resolvePromise) => {
    child.on("close", (code) => {
      resolvePromise(code ?? 1);
    });
  });

  if (timeout) clearTimeout(timeout);

  const durationMs = performance.now() - started;
  const peakMemoryMb = tracker.stop();

  return {
    durationMs,
    peakMemoryMb,
    stdout,
    stderr,
    exitCode,
  };
}

async function benchmarkCommandTool(params: {
  id: ToolId;
  command: string;
  makeArgs: (outputPath: string) => string[];
}): Promise<ToolReport> {
  const speedDurations: number[] = [];
  const speedPeaks: number[] = [];
  const coldDurations: number[] = [];
  const coldPeaks: number[] = [];
  const tempDir = mkdtempSync(join(tmpdir(), `docuforge-${params.id}-`));

  try {
    for (let run = 0; run < ITERATIONS; run += 1) {
      const outputPath = join(tempDir, `speed-${run}.pdf`);
      const result = await runCommandWithPeak(params.command, params.makeArgs(outputPath), {
        timeoutMs: REQUEST_TIMEOUT_MS,
      });
      if (result.exitCode !== 0) {
        throw new Error(`${params.command} failed: ${result.stderr.slice(-300)}`);
      }
      const size = statSync(outputPath).size;
      invariant(size > 100, `${params.id} output PDF is too small (${size} bytes)`);
      unlinkSync(outputPath);
      speedDurations.push(result.durationMs);
      speedPeaks.push(result.peakMemoryMb);
    }

    for (let run = 0; run < COLD_START_ITERATIONS; run += 1) {
      const outputPath = join(tempDir, `cold-${run}.pdf`);
      const result = await runCommandWithPeak(params.command, params.makeArgs(outputPath), {
        timeoutMs: REQUEST_TIMEOUT_MS,
      });
      if (result.exitCode !== 0) {
        throw new Error(`${params.command} failed: ${result.stderr.slice(-300)}`);
      }
      const size = statSync(outputPath).size;
      invariant(size > 100, `${params.id} cold-start output PDF is too small (${size} bytes)`);
      unlinkSync(outputPath);
      coldDurations.push(result.durationMs);
      coldPeaks.push(result.peakMemoryMb);
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  return {
    id: params.id,
    name: TOOL_NAMES[params.id],
    available: true,
    samples: ITERATIONS,
    speedMs: computePercentiles(speedDurations),
    coldStartMs: computePercentiles(coldDurations),
    peakMemoryMb: computePercentiles([...speedPeaks, ...coldPeaks]),
  };
}

async function benchmarkPuppeteer(htmlPath: string): Promise<ToolReport> {
  const worker = resolve(FRONTEND_DIR, "scripts/benchmarks/adapters/puppeteer-worker.mjs");

  const speedResult = await runCommandWithPeak(
    "node",
    [
      worker,
      "--mode",
      "speed",
      "--iterations",
      String(ITERATIONS),
      "--html",
      htmlPath,
      "--timeout-ms",
      String(Math.max(REQUEST_TIMEOUT_MS, 120_000)),
    ],
    {
      cwd: FRONTEND_DIR,
      timeoutMs: Math.max(REQUEST_TIMEOUT_MS, 120_000),
    }
  );

  if (speedResult.exitCode === 2) {
    return {
      id: "puppeteer",
      name: TOOL_NAMES.puppeteer,
      available: false,
      reasonUnavailable: "Install puppeteer in frontend workspace to benchmark this tool.",
    };
  }

  if (speedResult.exitCode !== 0) {
    throw new Error(`Puppeteer speed benchmark failed: ${speedResult.stderr.slice(-500)}`);
  }

  const coldResult = await runCommandWithPeak(
    "node",
    [
      worker,
      "--mode",
      "cold",
      "--iterations",
      String(COLD_START_ITERATIONS),
      "--html",
      htmlPath,
      "--timeout-ms",
      String(Math.max(REQUEST_TIMEOUT_MS, 120_000)),
    ],
    {
      cwd: FRONTEND_DIR,
      timeoutMs: Math.max(REQUEST_TIMEOUT_MS, 120_000),
    }
  );

  if (coldResult.exitCode !== 0) {
    throw new Error(`Puppeteer cold-start benchmark failed: ${coldResult.stderr.slice(-500)}`);
  }

  const speedJson = JSON.parse(speedResult.stdout.trim()) as { durationsMs: number[] };
  const coldJson = JSON.parse(coldResult.stdout.trim()) as { durationsMs: number[] };

  invariant(Array.isArray(speedJson.durationsMs) && speedJson.durationsMs.length > 0, "Invalid Puppeteer speed output");
  invariant(Array.isArray(coldJson.durationsMs) && coldJson.durationsMs.length > 0, "Invalid Puppeteer cold output");

  return {
    id: "puppeteer",
    name: TOOL_NAMES.puppeteer,
    available: true,
    samples: ITERATIONS,
    speedMs: computePercentiles(speedJson.durationsMs),
    coldStartMs: computePercentiles(coldJson.durationsMs),
    peakMemoryMb: computePercentiles([speedResult.peakMemoryMb, coldResult.peakMemoryMb]),
  };
}

function unavailableReport(id: ToolId, reasonUnavailable: string): ToolReport {
  return {
    id,
    name: TOOL_NAMES[id],
    available: false,
    reasonUnavailable,
  };
}

async function run(): Promise<void> {
  const fixture = getTemplatePayload();
  const tempDir = mkdtempSync(join(tmpdir(), "docuforge-bench-"));
  const htmlPath = join(tempDir, "invoice.html");
  writeFileSync(htmlPath, fixture.html, "utf8");

  const tools: ToolReport[] = [];

  try {
    console.log("Ensuring DocuForge release binary is built...");
    ensureEngineBinary();

    console.log(`Running DocuForge benchmark (${ITERATIONS} iterations, ${COLD_START_ITERATIONS} cold starts)...`);
    tools.push(await benchmarkDocuForge(fixture.typst));

    console.log("Running Puppeteer benchmark...");
    tools.push(await benchmarkPuppeteer(htmlPath));

    if (commandExists("wkhtmltopdf")) {
      console.log("Running wkhtmltopdf benchmark...");
      tools.push(
        await benchmarkCommandTool({
          id: "wkhtmltopdf",
          command: "wkhtmltopdf",
          makeArgs: (outputPath) => ["--quiet", htmlPath, outputPath],
        })
      );
    } else {
      tools.push(unavailableReport("wkhtmltopdf", "wkhtmltopdf command not found"));
    }

    if (commandExists("weasyprint")) {
      console.log("Running WeasyPrint benchmark...");
      tools.push(
        await benchmarkCommandTool({
          id: "weasyprint",
          command: "weasyprint",
          makeArgs: (outputPath) => [htmlPath, outputPath],
        })
      );
    } else {
      tools.push(unavailableReport("weasyprint", "weasyprint command not found"));
    }

    if (REQUIRE_ALL_TOOLS) {
      const missing = tools.filter((tool) => !tool.available).map((tool) => `${tool.name}: ${tool.reasonUnavailable}`);
      invariant(missing.length === 0, `Missing required tools:\n- ${missing.join("\n- ")}`);
    }

    const report: BenchmarkReport = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      source: "measured",
      scenario: {
        id: "invoice_3_page",
        title: "3-page invoice render",
        description:
          "Equivalent invoice payload rendered with comparable visual complexity across engines.",
      },
      iterations: ITERATIONS,
      coldStartIterations: COLD_START_ITERATIONS,
      methodology: {
        summary:
          "Measured on local machine with the same fixture payload. Speed and cold-start use p50/p95/p99 percentiles.",
        command: "cd frontend && bun run bench:competitors",
      },
      tools,
    };

    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

    console.log(`\nBenchmark report written to ${OUTPUT_PATH}\n`);

    tools.forEach((tool) => {
      if (!tool.available) {
        console.log(`- ${tool.name}: unavailable (${tool.reasonUnavailable})`);
        return;
      }
      console.log(
        `- ${tool.name}: speed p50 ${tool.speedMs?.p50}ms, cold p50 ${tool.coldStartMs?.p50}ms, memory p50 ${tool.peakMemoryMb?.p50}MB`
      );
    });
  } finally {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // noop
    }
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
