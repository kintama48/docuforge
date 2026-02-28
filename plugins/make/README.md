# DocuForge Make Integration Starter

This folder contains starter module blueprints for Make.

## Included modules

- `modules/render-pdf.json`
- `modules/render-image.json`

## Setup

1. Create a custom app/module in Make.
2. Use the JSON payload examples from this folder.
3. Set connection headers:
   - `X-API-Key: {{connection.api_key}}`
4. Configure base URL to your API host.

For event triggers, connect Make webhooks to DocuForge using `POST /v1/webhooks`.
