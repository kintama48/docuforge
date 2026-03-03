# DocuForge Bubble Integration Starter

This folder contains Bubble API Connector starter calls for DocuForge.

## Included calls

- `api-connector/render-pdf.json`
- `api-connector/render-image.json`

## Setup

1. Install the Bubble API Connector plugin.
2. Create app-level keys:
   - `DOCUFORGE_BASE_URL`
   - `DOCUFORGE_API_KEY`
3. Import the JSON call definitions and map placeholders.
4. Expose the call in workflows or backend workflows.

For trigger automations, register Bubble backend workflow endpoints in DocuForge with `POST /v1/webhooks`.
