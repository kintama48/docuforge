import { describe, expect, it } from "vitest";
import {
  getBenchmarkReport,
  getCompareBenchmarkModel,
  getHomeBenchmarkModel,
} from "@/src/lib/benchmark-report";

describe("benchmark report module", () => {
  it("loads benchmark report with required docuforge tool", () => {
    const report = getBenchmarkReport();
    const docuforge = report.tools.find((tool) => tool.id === "docuforge");

    expect(report.schemaVersion).toBe(1);
    expect(docuforge).toBeDefined();
    expect(docuforge?.available).toBe(true);
    expect(docuforge?.speedMs?.p50).toBeGreaterThan(0);
  });

  it("builds home snapshot rows with sane widths", () => {
    const model = getHomeBenchmarkModel();

    expect(model.rows).toHaveLength(3);
    expect(model.baselineName.length).toBeGreaterThan(0);

    model.rows.forEach((row) => {
      expect(row.widthPercent).toBeGreaterThanOrEqual(2);
      expect(row.widthPercent).toBeLessThanOrEqual(100);
      expect(row.docuforgeLabel.length).toBeGreaterThan(1);
      expect(row.baselineLabel.length).toBeGreaterThan(1);
    });
  });

  it("builds compare benchmark series with numeric points", () => {
    const model = getCompareBenchmarkModel();

    expect(model.series.speed.data.length).toBeGreaterThanOrEqual(1);
    expect(model.series.memory.data.length).toBeGreaterThanOrEqual(1);
    expect(model.series.coldStart.data.length).toBeGreaterThanOrEqual(1);

    Object.values(model.series).forEach((series) => {
      expect(series.data.some((point) => point.tool === "docuforge")).toBe(true);
      series.data.forEach((point) => {
        expect(point.value).toBeGreaterThan(0);
        expect(point.label.length).toBeGreaterThan(1);
      });
    });
  });
});
