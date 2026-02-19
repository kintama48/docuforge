# DocuForge MCP Operations Runbook

## Required environment

- `MCP_SERVER_TOKEN`
- `DOCUFORGE_API_BASE_URL`
- `DOCUFORGE_API_KEY`
- One of:
  - `DOCUFORGE_JWT_TOKEN`
  - `DOCUFORGE_EMAIL` and `DOCUFORGE_PASSWORD`

## Health and smoke checks

1. Health:

```bash
curl -s http://localhost:3200/health | jq
```

2. Unauthorized check:

```bash
curl -i -X POST http://localhost:3200/mcp -H 'Content-Type: application/json' -d '{}'
```

Expected: `401`.

3. Authorized initialize (basic transport check):

```bash
curl -i -X POST http://localhost:3200/mcp \
  -H 'Authorization: Bearer <MCP_SERVER_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0",
    "id":"1",
    "method":"initialize",
    "params":{
      "protocolVersion":"2025-11-05",
      "capabilities":{},
      "clientInfo":{"name":"ops-smoke","version":"1.0.0"}
    }
  }'
```

## Troubleshooting

- `401 Unauthorized`: missing/invalid bearer token.
- `400 Bad Request: No valid session ID provided`: missing MCP session lifecycle flow.
- Template tools failing with auth errors: check JWT config values in MCP server env.
- Upstream failures: verify `DOCUFORGE_API_BASE_URL` and API availability.
- For zero-knowledge protection, set `password_protection_mode=client_blind` and encrypt returned bytes locally with your passphrase.

## Release checklist

1. `cd mcp-server && bun test`
2. `cd mcp-server && bun run typecheck`
3. `cd mcp-server && bun run validate:registry`
4. Verify docs links under `docs/mcp/`.
