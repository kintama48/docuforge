import { describe, expect, test } from "bun:test";
import {
  buildBenchmarkReportFromK6,
  metricValues,
} from "../lib/summary-to-benchmark.mjs";

const k6SummaryFixture = {
  metrics: {
    docuforge_public_preview_duration_ms: {
      values: {
        avg: 412.123,
        med: 390.45,
        "p(95)": 821.22,
        "p(99)": 990.1,
        count: 180,
      },
    },
    docuforge_cold_start_probe_duration_ms: {
      values: {
        avg: 640.11,
        med: 612.12,
        "p(95)": 910.5,
        "p(99)": 990.44,
        count: 12,
      },
    },
    docuforge_public_preview_pdf_bytes: {
      values: {
        avg: 48200,
        med: 47850,
        "p(95)": 52000,
        "p(99)": 53000,
        count: 180,
      },
    },
  },
};

describe("summary-to-benchmark", () => {
  test("extracts percentile values from k6 metric shape", () => {
    const metric = metricValues(k6SummaryFixture, "docuforge_public_preview_duration_ms");

    expect(metric.count).toBe(180);
    expect(metric.percentiles.mean).toBe(412.123);
    expect(metric.percentiles.p50).toBe(390.45);
    expect(metric.percentiles.p95).toBe(821.22);
    expect(metric.percentiles.p99).toBe(990.1);
  });

  test("builds benchmark report and preserves competitor rows", () => {
    const existingReport = {
      tools: [
        {
          id: "docuforge",
          peakMemoryMb: { mean: 18.2, p50: 17.9, p95: 20.3, p99: 21.1 },
        },
        {
          id: "puppeteer",
          name: "Puppeteer",
          available: true,
          speedMs: { mean: 900, p50: 870, p95: 1200, p99: 1600 },
          coldStartMs: { mean: 2800, p50: 2700, p95: 3200, p99: 3600 },
          peakMemoryMb: { mean: 290, p50: 280, p95: 330, p99: 360 },
        },
      ],
    };

    const report = buildBenchmarkReportFromK6({
      k6Summary: k6SummaryFixture,
      existingReport,
      profile: "baseline",
      command: "cd load-test && ./scripts/run-k6-benchmark.sh baseline",
      generatedAt: "2026-02-25T00:00:00.000Z",
    });

    expect(report.schemaVersion).toBe(1);
    expect(report.source).toBe("measured");
    expect(report.iterations).toBe(180);
    expect(report.coldStartIterations).toBe(12);

    const docuforge = report.tools.find((tool) => tool.id === "docuforge");
    expect(docuforge?.speedMs?.p50).toBe(390.45);
    expect(docuforge?.coldStartMs?.p95).toBe(910.5);
    expect(docuforge?.peakMemoryMb?.p50).toBe(17.9);

    const puppeteer = report.tools.find((tool) => tool.id === "puppeteer");
    expect(puppeteer?.available).toBe(true);
  });

  test("falls back to response-size-based memory proxy when needed", () => {
    const report = buildBenchmarkReportFromK6({
      k6Summary: k6SummaryFixture,
      existingReport: { tools: [] },
      profile: "smoke",
      command: "k6 run ...",
      generatedAt: "2026-02-25T00:00:00.000Z",
    });

    const docuforge = report.tools.find((tool) => tool.id === "docuforge");
    expect(docuforge?.peakMemoryMb?.p50).toBeGreaterThan(0);
  });

  test("throws on missing required k6 metrics", () => {
    expect(() =>
      buildBenchmarkReportFromK6({
        k6Summary: { metrics: {} },
        existingReport: null,
        profile: "baseline",
        command: "k6 run ...",
      })
    ).toThrow("Missing k6 metric");
  });
});
