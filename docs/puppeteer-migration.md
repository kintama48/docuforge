# Puppeteer to DocuForge Migration Guide

_Target audience: engineering teams that generate PDFs with Puppeteer/headless Chrome and want a simpler, faster alternative._

---

## Why migrate

- **No browser process.** Puppeteer launches a full Chromium instance per worker (or per request without pooling). DocuForge renders via a Rust engine backed by Typst — no browser, no V8, no 300 MB RAM spike at startup.
- **Deterministic output.** Typst-compiled PDFs are bit-for-bit reproducible given the same template and data. Puppeteer's output depends on font rendering, GPU, and Chromium version.
- **Single HTTP call.** One POST, one PDF. No browser lifecycle management, no pool warming, no timeout juggling.
- **Smaller infra footprint.** Headless Chrome typically needs 256–512 MB per concurrent render. The DocuForge engine is substantially lighter, which matters on constrained hosts or serverless environments.
- **Honest caveat.** DocuForge templates are authored in Typst, not HTML/CSS. If your PDFs are tightly coupled to complex HTML rendering, there is porting work upfront.

---

## Before / After

### Before — typical Puppeteer flow

```javascript
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });
const page    = await browser.newPage();

await page.setContent(`
  <html>
    <body>
      <h1>Invoice #${data.invoiceNumber}</h1>
      <p>Customer: ${data.customerName}</p>
      <p>Total: $${data.total}</p>
    </body>
  </html>
`, { waitUntil: 'networkidle0' });

const pdf = await page.pdf({
  format: 'A4',
  margin: { top: '40px', right: '40px', bottom: '40px', left: '40px' },
  printBackground: true,
});

await browser.close();
// `pdf` is a Buffer — write to disk, stream to S3, etc.
```

### After — DocuForge API call

```javascript
const response = await fetch('https://api.docuforge.app/v1/render', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.DOCUFORGE_API_KEY,
  },
  body: JSON.stringify({
    template_id: 'your-template-id',
    data: {
      invoiceNumber: data.invoiceNumber,
      customerName:  data.customerName,
      total:         data.total,
    },
  }),
});

if (!response.ok) {
  const err = await response.json();
  throw new Error(`DocuForge error: ${err.message}`);
}

const pdf = Buffer.from(await response.arrayBuffer());
// Same Buffer interface — write to disk, stream to S3, etc.
```

The template lives in DocuForge (created once via the console or `POST /console/templates`). At render time you only send the data.

---

## Mapping common Puppeteer options to DocuForge

| Puppeteer option | DocuForge equivalent | Notes |
|---|---|---|
| `format: 'A4'` | Set in template Typst source: `#set page(paper: "a4")` | One-time template setting, not per-render |
| `format: 'Letter'` | `#set page(paper: "us-letter")` | Same |
| `margin: { top, right, bottom, left }` | `#set page(margin: (top: 40pt, ...))` | Template-level |
| `printBackground: true` | Backgrounds render by default in Typst | No equivalent needed |
| `displayHeaderFooter` + `headerTemplate` | Typst `header`/`footer` in `#set page(...)` | Template-level Typst; more control, not per-render |
| Page numbers | `#set page(numbering: "1")` in template | Standard Typst feature |
| `scale` | `#set page(...)` width/height overrides | Not a direct mapping; adjust layout instead |
| Password protection | Pass `password_protection_mode: "client_blind"` in request body, plus `X-Pdf-Password` header | See `/v1/render` schema |
| Multiple pages | Typst handles pagination automatically | No option needed |

---

## What changes in your codebase

- [ ] **Remove Puppeteer dependency.** `npm uninstall puppeteer` / `bun remove puppeteer`. Remove any `PUPPETEER_EXECUTABLE_PATH` or `CHROME_BIN` env vars and Docker layer tricks.
- [ ] **Replace `page.pdf(...)` call sites.** Each one becomes a `fetch('https://api.docuforge.app/v1/render', ...)` call. Search for `page.pdf(` and `.pdf({`.
- [ ] **Add `DOCUFORGE_API_KEY` to your environment.** Generate one in the DocuForge console under API keys.
- [ ] **Add `template_id` per document type.** Each distinct PDF layout needs a template. Create them once via the console or `POST /console/templates`.
- [ ] **Update error handling.** Puppeteer throws `Error` on timeout/crash. DocuForge returns structured JSON errors:
  - `422` — validation error (bad request shape)
  - `402` — monthly render limit reached (plan upgrade needed)
  - `404` — template not found or no published version
  - `401` — invalid or missing API key
  - Successful responses include `X-Render-Id` and `X-Render-Duration` headers.
- [ ] **Remove browser pool / warm-up logic.** If you had code that kept a Puppeteer browser instance warm between requests, delete it.
- [ ] **Update Docker images.** Remove the `puppeteer`/`chromium` install step; replace with nothing — DocuForge is an external HTTP service.

---

## Caveats — what Puppeteer does that DocuForge does not

Be honest with yourself on these before committing to a migration:

- **Arbitrary JavaScript execution.** Puppeteer renders real HTML/CSS/JS. If your PDFs rely on client-side JS (charts rendered in Canvas, React components, etc.), you'll need to port that logic into Typst or pre-compute the data server-side before sending it to DocuForge.
- **Custom fonts loaded at runtime.** With Puppeteer you can inject any font via CSS `@font-face`. DocuForge supports custom font assets (`.ttf`, `.otf`, `.woff2` uploaded via `POST /v1/assets`), but fonts must be registered in advance, not pushed per-render.
- **Screenshot / image output as primary use case.** DocuForge's primary output is PDF. It does support image export (`POST /v1/render/image` with `format: "png" | "jpeg"`, `dpi`, `quality`, `page_numbers`), but if you're using Puppeteer mainly for screenshots of web pages, DocuForge is not a drop-in replacement.
- **Arbitrary HTML as input.** DocuForge templates are Typst source files, not HTML. There is no "send me raw HTML, get back a PDF" endpoint. If your callers supply arbitrary HTML, you need to translate that to Typst or use the preview endpoint for trusted internal use only.
- **Full page load simulation.** Puppeteer can wait for network requests, lazy-loaded images, and client-side rendering to settle (`waitUntil: 'networkidle0'`). DocuForge does not fetch external URLs at render time — all assets must be pre-uploaded.

---

## Get started in 60 seconds

1. **Create a free account** at [https://www.docuforge.app](https://www.docuforge.app) and generate an API key.

2. **Create a minimal template** in the console — or paste this Typst source to create one via API:

```bash
curl -X POST https://api.docuforge.app/console/templates \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $DOCUFORGE_API_KEY" \
  -d '{
    "name": "Hello World",
    "source": "#set page(paper: \"a4\", margin: 40pt)\n= Hello, {{name}}!\n\nGenerated by DocuForge."
  }'
```

Note the `id` field in the response — that is your `template_id`.

3. **Render it:**

```bash
curl -X POST https://api.docuforge.app/v1/render \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $DOCUFORGE_API_KEY" \
  -o hello.pdf \
  -d '{
    "template_id": "<your-template-id>",
    "data": { "name": "World" }
  }'
```

`hello.pdf` now exists. No browser launched.

---

## Response headers (useful for observability)

| Header | Value |
|---|---|
| `X-Render-Id` | Unique ID for this render (use in logs/traces) |
| `X-Render-Duration` | Server-side render time in milliseconds |
| `X-Pdf-Protection-Mode` | `none` or `client_blind` |
| `Content-Type` | `application/pdf` |

---

## Further reading

- API spec: `api/spec.md`
- Low-code block editor: `api/src/lib/low-code.ts`
- Render route source: `api/src/routes/render.ts`
- MCP server (AI agent integration): `mcp-server/README.md`
