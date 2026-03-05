import rawReport from "@/src/data/benchmarks/latest.json";
import { assertPresent, invariant } from "@/src/lib/assert";

export type BenchmarkToolId = "docuforge" | "puppeteer" | "wkhtmltopdf" | "weasyprint";
export type BenchmarkMetricKey = "speed" | "memory" | "coldStart";

type Percentiles = {
  mean: number;
  p50: number;
  p95: number;
  p99: number;
};

type BenchmarkTool = {
  id: BenchmarkToolId;
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
  source: "measured" | "seed";
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
  tools: BenchmarkTool[];
};

export type CompareBenchmarkPoint = {
  tool: BenchmarkToolId;
  value: number;
  label: string;
};

export type CompareBenchmarkSeries = {
  title: string;
  subtitle: string;
  lowerBetter: boolean;
  data: CompareBenchmarkPoint[];
};

export type CompareBenchmarkModel = {
  generatedAt: string;
  source: "measured" | "seed";
  methodologySummary: string;
  command: string;
  unavailableTools: string[];
  series: Record<BenchmarkMetricKey, CompareBenchmarkSeries>;
};

export type HomeBenchmarkRow = {
  label: string;
  docuforgeLabel: string;
  baselineLabel: string;
  widthPercent: number;
};

export type HomeBenchmarkModel = {
  generatedAt: string;
  source: "measured" | "seed";
  title: string;
  scenarioTitle: string;
  methodologySummary: string;
  baselineName: string;
  rows: HomeBenchmarkRow[];
};

const TOOL_ORDER: BenchmarkToolId[] = [
  "docuforge",
  "puppeteer",
  "wkhtmltopdf",
  "weasyprint",
];

function isFinitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function validatePercentiles(value: Percentiles | undefined, field: string) {
  invariant(Boolean(value), `${field} is missing`);
  invariant(isFinitePositive(value?.mean), `${field}.mean must be > 0`);
  invariant(isFinitePositive(value?.p50), `${field}.p50 must be > 0`);
  invariant(isFinitePositive(value?.p95), `${field}.p95 must be > 0`);
  invariant(isFinitePositive(value?.p99), `${field}.p99 must be > 0`);
  invariant(
    (value?.p50 ?? 0) <= (value?.p95 ?? 0) && (value?.p95 ?? 0) <= (value?.p99 ?? 0),
    `${field} percentiles must be ordered p50 <= p95 <= p99`
  );
}

function validateReport(input: unknown): BenchmarkReport {
  invariant(typeof input === "object" && input !== null, "report must be an object");
  const report = input as BenchmarkReport;

  invariant(report.schemaVersion === 1, "schemaVersion must equal 1");
  invariant(
    typeof report.generatedAt === "string" && !Number.isNaN(Date.parse(report.generatedAt)),
    "generatedAt must be an ISO date"
  );
  invariant(report.source === "measured" || report.source === "seed", "source must be measured or seed");
  invariant(isFinitePositive(report.iterations), "iterations must be > 0");
  invariant(isFinitePositive(report.coldStartIterations), "coldStartIterations must be > 0");
  invariant(Array.isArray(report.tools), "tools must be an array");
  invariant(report.tools.length > 0, "tools must not be empty");

  const uniqueIds = new Set<BenchmarkToolId>();
  report.tools.forEach((tool, index) => {
    invariant(TOOL_ORDER.includes(tool.id), `tools[${index}] id is not supported`);
    invariant(!uniqueIds.has(tool.id), `duplicate tool id: ${tool.id}`);
    uniqueIds.add(tool.id);

    invariant(typeof tool.name === "string" && tool.name.length > 0, `${tool.id}.name is required`);
    if (tool.available) {
      validatePercentiles(tool.speedMs, `${tool.id}.speedMs`);
      validatePercentiles(tool.coldStartMs, `${tool.id}.coldStartMs`);
      validatePercentiles(tool.peakMemoryMb, `${tool.id}.peakMemoryMb`);
      invariant(
        typeof tool.samples === "number" && tool.samples > 0,
        `${tool.id}.samples must be > 0 when tool is available`
      );
    } else {
      invariant(
        typeof tool.reasonUnavailable === "string" && tool.reasonUnavailable.length > 0,
        `${tool.id}.reasonUnavailable is required when tool is unavailable`
      );
    }
  });

  invariant(uniqueIds.has("docuforge"), "docuforge tool is required");

  return report;
}

const benchmarkReport = validateReport(rawReport);

function getTool(id: BenchmarkToolId): BenchmarkTool {
  const found = benchmarkReport.tools.find((tool) => tool.id === id);
  invariant(found, `missing tool ${id}`);
  return found;
}

function formatMs(value: number): string {
  if (value >= 1000) {
    const seconds = value / 1000;
    return `${Number(seconds.toFixed(seconds >= 10 ? 1 : 2))}s`;
  }
  return `${Math.round(value)}ms`;
}

function formatMb(value: number): string {
  return `${Math.round(value)}MB`;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 100;
  return Math.max(2, Math.min(100, value));
}

function choosePrimaryCompetitor(): BenchmarkTool | null {
  const candidates = TOOL_ORDER.filter((id) => id !== "docuforge")
    .map((id) => getTool(id))
    .filter((tool) => tool.available);

  if (candidates.length === 0) {
    return null;
  }

  const preferred = candidates.find((tool) => tool.id === "puppeteer");
  return preferred ?? candidates[0];
}

export function getBenchmarkReport(): BenchmarkReport {
  return benchmarkReport;
}

export function getHomeBenchmarkModel(): HomeBenchmarkModel {
  const docuforge = getTool("docuforge");
  invariant(docuforge.available, "docuforge must be available");
  const baseline = choosePrimaryCompetitor();

  const docSpeed = assertPresent(docuforge.speedMs, "docuforge.speedMs missing").p50;
  const baselineSpeed = baseline?.speedMs?.p50 ?? docSpeed;
  const docMemory = assertPresent(docuforge.peakMemoryMb, "docuforge.peakMemoryMb missing").p50;
  const baselineMemory = baseline?.peakMemoryMb?.p50 ?? docMemory;
  const docCold = assertPresent(docuforge.coldStartMs, "docuforge.coldStartMs missing").p50;
  const baselineCold = baseline?.coldStartMs?.p50 ?? docCold;

  return {
    generatedAt: benchmarkReport.generatedAt,
    source: benchmarkReport.source,
    title:
      benchmarkReport.source === "measured"
        ? "Last measured run"
        : "Reference run (replace before launch)",
    scenarioTitle: benchmarkReport.scenario.title,
    methodologySummary: benchmarkReport.methodology.summary,
    baselineName: baseline?.name ?? "Competitor unavailable",
    rows: [
      {
        label: "Speed",
        docuforgeLabel: formatMs(docSpeed),
        baselineLabel: baseline ? formatMs(baselineSpeed) : "N/A",
        widthPercent: clampPercent((docSpeed / baselineSpeed) * 100),
      },
      {
        label: "Memory",
        docuforgeLabel: formatMb(docMemory),
        baselineLabel: baseline ? formatMb(baselineMemory) : "N/A",
        widthPercent: clampPercent((docMemory / baselineMemory) * 100),
      },
      {
        label: "Cold start",
        docuforgeLabel: formatMs(docCold),
        baselineLabel: baseline ? formatMs(baselineCold) : "N/A",
        widthPercent: clampPercent((docCold / baselineCold) * 100),
      },
    ],
  };
}

export function getCompareBenchmarkModel(): CompareBenchmarkModel {
  const available = TOOL_ORDER.map((id) => getTool(id)).filter((tool) => tool.available);
  invariant(available.length >= 1, "need at least one available tool for comparison charts");

  const unavailableTools = TOOL_ORDER.map((id) => getTool(id))
    .filter((tool) => !tool.available)
    .map((tool) => `${tool.name}: ${tool.reasonUnavailable}`);

  const speedData = available.map((tool) => ({
    tool: tool.id,
    value: assertPresent(tool.speedMs, `${tool.id}.speedMs missing`).p50,
    label: formatMs(assertPresent(tool.speedMs, `${tool.id}.speedMs missing`).p50),
  }));

  const memoryData = available.map((tool) => ({
    tool: tool.id,
    value: assertPresent(tool.peakMemoryMb, `${tool.id}.peakMemoryMb missing`).p50,
    label: formatMb(assertPresent(tool.peakMemoryMb, `${tool.id}.peakMemoryMb missing`).p50),
  }));

  const coldStartData = available.map((tool) => ({
    tool: tool.id,
    value: assertPresent(tool.coldStartMs, `${tool.id}.coldStartMs missing`).p50,
    label: formatMs(assertPresent(tool.coldStartMs, `${tool.id}.coldStartMs missing`).p50),
  }));

  return {
    generatedAt: benchmarkReport.generatedAt,
    source: benchmarkReport.source,
    methodologySummary: benchmarkReport.methodology.summary,
    command: benchmarkReport.methodology.command,
    unavailableTools,
    series: {
      speed: {
        title: "Generation speed",
        subtitle: `${benchmarkReport.scenario.title} (p50)` ,
        lowerBetter: true,
        data: speedData,
      },
      memory: {
        title: "Memory footprint",
        subtitle: "Peak RSS during render (p50)",
        lowerBetter: true,
        data: memoryData,
      },
      coldStart: {
        title: "Cold start",
        subtitle: "Process start to first successful PDF (p50)",
        lowerBetter: true,
        data: coldStartData,
      },
    },
  };
}
