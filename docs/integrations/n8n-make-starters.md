# No-Code Starter Integrations

This guide documents the first-party no-code starter integrations shipped with DocuForge.

## n8n

Import from:
- `plugins/n8n/workflows/render-pdf.json`
- `plugins/n8n/workflows/render-image.json`

Required environment variables in n8n:
- `DOCUFORGE_BASE_URL`
- `DOCUFORGE_API_KEY`

## Make

Use module blueprints from:
- `plugins/make/modules/render-pdf.json`
- `plugins/make/modules/render-image.json`

Connection header:
- `X-API-Key: {{connection.api_key}}`

## Bubble

Use API Connector definitions from:
- `plugins/bubble/api-connector/render-pdf.json`
- `plugins/bubble/api-connector/render-image.json`

Required app keys:
- `DOCUFORGE_BASE_URL`
- `DOCUFORGE_API_KEY`

## Coda

Use Pack action templates from:
- `plugins/coda/pack-actions/render-pdf.json`
- `plugins/coda/pack-actions/render-image.json`

Connection header:
- `X-API-Key: {{connection.api_key}}`

## FlutterFlow

Use API call templates from:
- `plugins/flutterflow/api-calls/render-pdf.json`
- `plugins/flutterflow/api-calls/render-image.json`

Required app constants:
- `docuforgeBaseUrl`
- `docuforgeApiKey`

## Trigger pattern (all platforms)

1. Create an inbound webhook URL in your automation platform.
2. Register it in DocuForge via `POST /v1/webhooks`.
3. Subscribe to events:
   - `render.completed`
   - `render.failed`
