# Claude Setup (DocuForge MCP)

Use this when configuring DocuForge MCP in Claude clients that support remote MCP servers.

## Connection

- Transport: `streamable-http`
- URL: `https://mcp.docuforge.app/mcp`
- Header: `Authorization: Bearer <MCP_SERVER_TOKEN>`

## Recommended First Prompt

```text
Use DocuForge MCP tools to create a PDF invoice.
List templates first, pick the best one, then render with realistic sample data.
```

## Notes

- If template discovery fails, your MCP deployment likely lacks DocuForge JWT configuration.
- `docuforge_render_preview_pdf` is best during iteration.
- `docuforge_render_pdf` should be used for final render from a saved template.
- Use `password_protection_mode=client_blind` with `docuforge_render_pdf` for password-protected output without sharing passphrases with DocuForge.
