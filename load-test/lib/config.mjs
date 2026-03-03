function parsePositiveInt(raw, fallback) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function parsePositiveFloat(raw, fallback) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseDuration(raw, fallback) {
  if (!raw || typeof raw !== "string") return fallback;
  const value = raw.trim();
  if (!/^\d+(ms|s|m|h)$/.test(value)) return fallback;
  return value;
}

function parseProfile(raw) {
  const value = String(raw || "baseline").toLowerCase();
  if (value === "smoke" || value === "stress" || value === "baseline") {
    return value;
  }
  return "baseline";
}

function parseBaseUrl(raw) {
  const fallback = "http://127.0.0.1:3000";
  if (!raw) return fallback;
  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}`;
  } catch {
    return fallback;
  }
}

export function resolveLoadTestConfig(rawEnv = {}) {
  const profile = parseProfile(rawEnv.K6_PROFILE);

  const profileDefaults = {
    smoke: {
      steadyRate: 2,
      steadyDuration: "20s",
      spikeStartRate: 2,
      spikeStages: [
        { target: 3, duration: "10s" },
        { target: 1, duration: "10s" },
      ],
      preAllocatedVUs: 4,
      maxVUs: 12,
      coldStartVUs: 3,
      coldStartIterations: 3,
    },
    baseline: {
      steadyRate: 8,
      steadyDuration: "1m",
      spikeStartRate: 8,
      spikeStages: [
        { target: 18, duration: "30s" },
        { target: 22, duration: "30s" },
        { target: 8, duration: "20s" },
      ],
      preAllocatedVUs: 18,
      maxVUs: 70,
      coldStartVUs: 8,
      coldStartIterations: 8,
    },
    stress: {
      steadyRate: 18,
      steadyDuration: "90s",
      spikeStartRate: 18,
      spikeStages: [
        { target: 40, duration: "30s" },
        { target: 60, duration: "40s" },
        { target: 20, duration: "30s" },
      ],
      preAllocatedVUs: 40,
      maxVUs: 180,
      coldStartVUs: 16,
      coldStartIterations: 16,
    },
  }[profile];

  return {
    profile,
    apiBaseUrl: parseBaseUrl(rawEnv.K6_API_BASE_URL),
    originHeader: String(rawEnv.K6_ORIGIN || "http://localhost:5173"),
    resultsDir: String(rawEnv.K6_RESULTS_DIR || "load-test/results"),
    requestTimeout: parseDuration(rawEnv.K6_REQUEST_TIMEOUT, "20s"),
    steadyRate: parsePositiveInt(rawEnv.K6_STEADY_RATE, profileDefaults.steadyRate),
    steadyDuration: parseDuration(rawEnv.K6_STEADY_DURATION, profileDefaults.steadyDuration),
    spikeStartRate: parsePositiveInt(rawEnv.K6_SPIKE_START_RATE, profileDefaults.spikeStartRate),
    spikeStages: profileDefaults.spikeStages,
    preAllocatedVUs: parsePositiveInt(rawEnv.K6_PREALLOCATED_VUS, profileDefaults.preAllocatedVUs),
    maxVUs: parsePositiveInt(rawEnv.K6_MAX_VUS, profileDefaults.maxVUs),
    coldStartVUs: parsePositiveInt(rawEnv.K6_COLD_START_VUS, profileDefaults.coldStartVUs),
    coldStartIterations: parsePositiveInt(rawEnv.K6_COLD_START_ITERATIONS, profileDefaults.coldStartIterations),
    previewP95BudgetMs: parsePositiveFloat(rawEnv.K6_PREVIEW_P95_BUDGET_MS, 1800),
    previewErrorBudget: parsePositiveFloat(rawEnv.K6_PREVIEW_ERROR_BUDGET, 0.02),
  };
}

export function buildK6Options(config) {
  return {
    discardResponseBodies: false,
    noConnectionReuse: false,
    userAgent: `docuforge-k6/${config.profile}`,
    scenarios: {
      public_preview_steady: {
        executor: "constant-arrival-rate",
        exec: "publicPreviewSteady",
        rate: config.steadyRate,
        timeUnit: "1s",
        duration: config.steadyDuration,
        preAllocatedVUs: config.preAllocatedVUs,
        maxVUs: config.maxVUs,
      },
      public_preview_spike: {
        executor: "ramping-arrival-rate",
        exec: "publicPreviewSpike",
        startRate: config.spikeStartRate,
        timeUnit: "1s",
        preAllocatedVUs: config.preAllocatedVUs,
        maxVUs: config.maxVUs,
        stages: config.spikeStages,
      },
      cold_start_probe: {
        executor: "per-vu-iterations",
        exec: "coldStartProbe",
        vus: config.coldStartVUs,
        iterations: config.coldStartIterations,
        maxDuration: "10m",
      },
    },
    thresholds: {
      http_req_failed: [`rate<${config.previewErrorBudget}`],
      docuforge_public_preview_errors: [`rate<${config.previewErrorBudget}`],
      docuforge_public_preview_duration_ms: [`p(95)<${config.previewP95BudgetMs}`],
    },
  };
}
