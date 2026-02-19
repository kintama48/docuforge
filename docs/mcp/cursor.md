# Cursor Setup (DocuForge MCP)

Add a remote MCP server in Cursor with the values below.

## Server Values

- Name: `docuforge`
- Transport: `streamable-http`
- URL: `https://mcp.docuforge.app/mcp`
- Auth header: `Authorization: Bearer <MCP_SERVER_TOKEN>`

## Quick Verification

Ask Cursor:

```text
Call docuforge_get_usage and summarize my render quota.
```

If successful, test rendering:

```text
Call docuforge_list_templates, choose one template, then render a sample PDF.
```

For protected output, set `password_protection_mode=client_blind` in `docuforge_render_pdf` and encrypt locally.
