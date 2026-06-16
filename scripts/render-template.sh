#!/usr/bin/env bash
# scripts/render-template.sh — local template render + PNG preview helper.
# Usage: ./scripts/render-template.sh <template-dir-name> [output-dir]
# Reads api/templates/<name>/{main.typ,defaults.json}, posts to the local
# engine (127.0.0.1:3010), saves PDF, converts to PNG via pdftoppm.
# Outputs to /tmp/template-previews/ by default.

set -euo pipefail

TEMPLATE="${1:?template name required (e.g. invoice)}"
OUT_DIR="${2:-/tmp/template-previews}"
ENGINE_URL="${ENGINE_URL:-http://127.0.0.1:3010}"

TEMPLATE_DIR="api/templates/${TEMPLATE}"
MAIN_TYP="${TEMPLATE_DIR}/main.typ"
DEFAULTS_JSON="${TEMPLATE_DIR}/defaults.json"

[[ -f "$MAIN_TYP" ]] || { echo "missing $MAIN_TYP" >&2; exit 1; }
[[ -f "$DEFAULTS_JSON" ]] || { echo "missing $DEFAULTS_JSON" >&2; exit 1; }

mkdir -p "$OUT_DIR"

# Build the engine RenderRequest:
#   { "template": { "main": "main.typ", "files": { "main.typ": "<source>" } },
#     "data": <defaults.json content> }
REQUEST_JSON=$(python3 - <<PY
import json, pathlib, os
template_dir = pathlib.Path("${TEMPLATE_DIR}")
shared_dir = pathlib.Path("api/templates/_shared")

files = {"main.typ": (template_dir / "main.typ").read_text()}
# Bundle shared design module if present
shared_design = shared_dir / "design.typ"
if shared_design.exists():
  files["design.typ"] = shared_design.read_text()
# Bundle sibling .typ files (e.g. components.typ)
for entry in template_dir.iterdir():
  if entry.suffix == ".typ" and entry.name != "main.typ":
    files[entry.name] = entry.read_text()

data = json.loads((template_dir / "defaults.json").read_text())
print(json.dumps({
  "template": {"main": "main.typ", "files": files},
  "data": data,
}))
PY
)

PDF_PATH="${OUT_DIR}/${TEMPLATE}.pdf"
PNG_PREFIX="${OUT_DIR}/${TEMPLATE}"

HTTP_CODE=$(echo "$REQUEST_JSON" | curl -s -o "$PDF_PATH" -w "%{http_code}" \
  -X POST "${ENGINE_URL}/render" \
  -H "Content-Type: application/json" \
  --data-binary @-)

if [[ "$HTTP_CODE" != "200" ]]; then
  echo "render failed (HTTP $HTTP_CODE):" >&2
  cat "$PDF_PATH" >&2
  exit 1
fi

# Convert all pages to PNG at 120 dpi for visual review.
pdftoppm -r 120 -png "$PDF_PATH" "$PNG_PREFIX" >/dev/null

echo "Rendered: $PDF_PATH ($(stat -f%z "$PDF_PATH" 2>/dev/null || stat -c%s "$PDF_PATH") bytes)"
echo "Pages:"
ls -1 "${OUT_DIR}/${TEMPLATE}"-*.png 2>/dev/null
