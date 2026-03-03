import { describe, expect, test } from "bun:test";
import { buildK6Options, resolveLoadTestConfig } from "../lib/config.mjs";

describe("load-test config", () => {
  test("uses baseline defaults", () => {
    const config = resolveLoadTestConfig({});

    expect(config.profile).toBe("baseline");
    expect(config.apiBaseUrl).toBe("http://127.0.0.1:3000");
    expect(config.steadyRate).toBe(8);
    expect(config.steadyDuration).toBe("1m");
    expect(config.spikeStages.length).toBeGreaterThan(0);
  });

  test("applies smoke profile defaults", () => {
    const config = resolveLoadTestConfig({ K6_PROFILE: "smoke" });

    expect(config.profile).toBe("smoke");
    expect(config.steadyRate).toBe(2);
    expect(config.coldStartIterations).toBe(3);
  });

  test("accepts explicit env overrides", () => {
    const config = resolveLoadTestConfig({
      K6_API_BASE_URL: "https://api.docuforge.app/v1",
      K6_STEADY_RATE: "13",
      K6_STEADY_DURATION: "75s",
      K6_COLD_START_ITERATIONS: "21",
      K6_PREVIEW_P95_BUDGET_MS: "920",
    });

    expect(config.apiBaseUrl).toBe("https://api.docuforge.app");
    expect(config.steadyRate).toBe(13);
    expect(config.steadyDuration).toBe("75s");
    expect(config.coldStartIterations).toBe(21);
    expect(config.previewP95BudgetMs).toBe(920);
  });

  test("falls back on malformed values", () => {
    const config = resolveLoadTestConfig({
      K6_API_BASE_URL: "not-a-url",
      K6_STEADY_RATE: "0",
      K6_STEADY_DURATION: "forever",
      K6_PREVIEW_ERROR_BUDGET: "-4",
    });

    expect(config.apiBaseUrl).toBe("http://127.0.0.1:3000");
    expect(config.steadyRate).toBe(8);
    expect(config.steadyDuration).toBe("1m");
    expect(config.previewErrorBudget).toBe(0.02);
  });

  test("builds k6 options with required scenarios and thresholds", () => {
    const config = resolveLoadTestConfig({ K6_PROFILE: "stress", K6_PREVIEW_ERROR_BUDGET: "0.01" });
    const options = buildK6Options(config);

    expect(options.scenarios.public_preview_steady).toBeDefined();
    expect(options.scenarios.public_preview_spike).toBeDefined();
    expect(options.scenarios.cold_start_probe).toBeDefined();
    expect(options.thresholds.http_req_failed).toEqual(["rate<0.01"]);
  });
});
