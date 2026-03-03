#!/usr/bin/env bash
set -euo pipefail

PROFILE="${1:-baseline}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"
RESULTS_DIR="${ROOT_DIR}/load-test/results"
SUMMARY_PATH="${RESULTS_DIR}/k6-summary.json"
OUTPUT_PATH="${ROOT_DIR}/frontend/src/data/benchmarks/latest.json"

mkdir -p "${RESULTS_DIR}"

if ! command -v k6 >/dev/null 2>&1; then
  echo "k6 is not installed. Install from https://grafana.com/docs/k6/latest/set-up/install-k6/"
  exit 1
fi

K6_PROFILE="${PROFILE}" \
K6_RESULTS_DIR="${RESULTS_DIR}" \
k6 run "${ROOT_DIR}/load-test/k6/public-preview.benchmark.js"

node "${ROOT_DIR}/load-test/scripts/export-benchmark-report.mjs" \
  --summary "${SUMMARY_PATH}" \
  --output "${OUTPUT_PATH}" \
  --profile "${PROFILE}" \
  --command "cd load-test && ./scripts/run-k6-benchmark.sh ${PROFILE}"
