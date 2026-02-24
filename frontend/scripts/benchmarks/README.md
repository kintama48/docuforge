# Competitor Benchmark Module

This benchmark harness produces the dataset consumed by:

- `frontend/src/app/home-client.tsx` (benchmark snapshot card)
- `frontend/src/app/compare/compare-showcase.tsx` (benchmark charts)

## Run

```bash
cd frontend
bun run bench:competitors
```

Strict mode (fail if any competitor is missing):

```bash
cd frontend
bun run bench:competitors:strict
```

## Output

`frontend/src/data/benchmarks/latest.json`

## Environment knobs

- `BENCH_ITERATIONS` (default: `25`)
- `BENCH_COLD_START_ITERATIONS` (default: `8`)
- `BENCH_REQUEST_TIMEOUT_MS` (default: `25000`)
- `BENCH_ENGINE_BOOT_TIMEOUT_MS` (default: `240000`)
- `BENCH_SKIP_ENGINE_BUILD` (`1` to skip `cargo build --release` when binary already exists)
- `BENCH_OUTPUT_JSON` (default: `src/data/benchmarks/latest.json`)
- `BENCH_REQUIRE_ALL_TOOLS` (`1` to fail when tools are unavailable)

## Tool requirements

- DocuForge engine: Rust toolchain (`cargo`) available locally
- Puppeteer: install with `cd frontend && bun add -d puppeteer && bun pm trust puppeteer esbuild`
- wkhtmltopdf: `wkhtmltopdf` command in PATH
- WeasyPrint: `weasyprint` command in PATH
