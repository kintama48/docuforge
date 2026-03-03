# DocuForge k6 Load Test Suite

This directory isolates load-testing logic from product code and keeps benchmark + stress workflows reusable.

## What this tests

- `POST /v1/render/public/session`
- `POST /v1/render/public/preview`

Scenario mix:

- `public_preview_steady`: sustained arrival rate
- `public_preview_spike`: burst traffic profile
- `cold_start_probe`: per-VU probe scenario for startup/tail behavior

## Quick start

```bash
# from repo root
./load-test/scripts/run-k6-benchmark.sh baseline
```

Profiles:

```bash
./load-test/scripts/run-k6-benchmark.sh smoke
./load-test/scripts/run-k6-benchmark.sh baseline
./load-test/scripts/run-k6-benchmark.sh stress
```

## Outputs

- Raw k6 summary: `load-test/results/k6-summary.json`
- Frontend benchmark dataset: `frontend/src/data/benchmarks/latest.json`

## Environment overrides

- `K6_API_BASE_URL` (default `http://127.0.0.1:3000`)
- `K6_ORIGIN` (default `http://localhost:5173`)
- `K6_RESULTS_DIR` (default `load-test/results`)
- `K6_REQUEST_TIMEOUT` (default `20s`)
- `K6_STEADY_RATE`
- `K6_STEADY_DURATION`
- `K6_SPIKE_START_RATE`
- `K6_PREALLOCATED_VUS`
- `K6_MAX_VUS`
- `K6_COLD_START_VUS`
- `K6_COLD_START_ITERATIONS`
- `K6_PREVIEW_P95_BUDGET_MS` (default `1800`)
- `K6_PREVIEW_ERROR_BUDGET` (default `0.02`)

## Notes

- Public preview endpoint enforces trusted origin and session controls. Keep `K6_ORIGIN` aligned with allowed origins in API env.
- Converter keeps non-DocuForge competitor entries from existing benchmark JSON so compare pages remain stable.
- For deeper backend bottleneck analysis, run this alongside infrastructure metrics (CPU, queue depth, Redis latency, DB latency).
