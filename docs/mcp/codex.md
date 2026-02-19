# Codex Setup (DocuForge MCP)

Configure DocuForge as a remote MCP server in your Codex MCP settings.

## Server Configuration

- Identifier: `docuforge`
- Transport: `streamable-http`
- URL: `https://mcp.docuforge.app/mcp`
- Headers:
  - `Authorization: Bearer <MCP_SERVER_TOKEN>`

## Smoke Test Prompt

```text
Use docuforge_get_usage. Then list templates and render a sample shipping-label PDF.
```

## Expected Behavior

- Codex should discover all `docuforge_*` tools.
- Render tools return structured metadata plus PDF resource content/link.
- For sensitive files, set `password_protection_mode=client_blind` and encrypt the rendered PDF locally so DocuForge never sees your passphrase.
