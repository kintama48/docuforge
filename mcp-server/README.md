# DocuForge MCP Server

Remote MCP server for DocuForge PDF rendering, optimized for Streamable HTTP clients.

## Features

- Streamable HTTP endpoint at `/mcp`
- Bearer auth for inbound MCP traffic
- Privacy posture: pipe-not-bucket flow with client-blind password mode
- Render-focused toolset:
  - `docuforge_get_usage`
  - `docuforge_list_templates`
  - `docuforge_get_template`
  - `docuforge_render_pdf` (`password_protection_mode=client_blind` keeps passphrases out of DocuForge)
  - `docuforge_render_preview_pdf`
- Discoverability resources/prompts:
  - `docuforge://capabilities`
  - `docuforge://templates/official`
  - `docuforge://security/client-blind-passwords`
  - `docuforge://renders/{artifactId}.pdf`
  - `docuforge_render_from_intent`

## Setup

```bash
cd mcp-server
cp .env.example .env
bun install
bun run dev
```

Health check:

```bash
curl http://localhost:3200/health
```

Registry metadata validation:

```bash
bun run validate:registry
```

Operational smoke/runbook: `docs/mcp/operations.md`.

## Required Environment

- `MCP_SERVER_TOKEN`
- `DOCUFORGE_API_BASE_URL`
- `DOCUFORGE_API_KEY`

Template discovery tools also require one of:

- `DOCUFORGE_JWT_TOKEN`
- `DOCUFORGE_EMAIL` + `DOCUFORGE_PASSWORD`

`docuforge_render_preview_pdf` also uses JWT auth because it calls `/v1/render/preview`.

## Transport

This server uses `streamable-http`. Client requests must include:

- `Authorization: Bearer <MCP_SERVER_TOKEN>`
