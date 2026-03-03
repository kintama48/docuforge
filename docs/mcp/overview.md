# DocuForge MCP Overview

DocuForge MCP exposes a render-focused toolset so LLM clients can generate PDFs with DocuForge's Rust + Typst rendering engine.

## Privacy Value Prop

- DocuForge is a pipe, not a bucket: it renders documents without long-lived document storage.
- Use `password_protection_mode=client_blind` when a client-owned passphrase must stay out of DocuForge systems.
- Pair client-blind rendering with local encryption (for example qpdf) before distribution.

## Endpoint

- Transport: `streamable-http`
- URL: `https://mcp.docuforge.app/mcp`
- Auth: `Authorization: Bearer <MCP_SERVER_TOKEN>`

## Tools

- `docuforge_get_usage`
  - Read plan quota and current render usage.
- `docuforge_list_templates`
  - List available templates.
- `docuforge_get_template`
  - Inspect one template and its live version metadata.
- `docuforge_render_pdf`
  - Render final PDF from a template ID.
  - Optional input: `password_protection_mode=client_blind` so DocuForge never receives the passphrase.
- `docuforge_render_preview_pdf`
  - Render preview PDF directly from Typst source.

## Resources

- `docuforge://capabilities`
  - Capability guidance for tool selection.
- `docuforge://templates/official`
  - Official template catalog snapshot.
- `docuforge://security/client-blind-passwords`
  - Client-side passphrase encryption workflow and examples.
- `docuforge://renders/{artifactId}.pdf`
  - Binary artifact retrieval for previously rendered PDFs.

## Prompt

- `docuforge_render_from_intent`
  - Prompt scaffold for selecting template + data + render flow.

## Server Environment

Required:

- `MCP_SERVER_TOKEN`
- `DOCUFORGE_API_BASE_URL`
- `DOCUFORGE_API_KEY`

For JWT-backed tools (`docuforge_list_templates`, `docuforge_get_template`, `docuforge_render_preview_pdf`), set one of:

- `DOCUFORGE_JWT_TOKEN`
- `DOCUFORGE_EMAIL` and `DOCUFORGE_PASSWORD`

Operational runbook: `docs/mcp/operations.md`.

## Local Run

```bash
cd mcp-server
cp .env.example .env
bun install
bun run dev
```
