# DocuForge Coda Integration Starter

This folder contains Coda Pack action starters for DocuForge render APIs.

## Included actions

- `pack-actions/render-pdf.json`
- `pack-actions/render-image.json`

## Setup

1. Create or edit your Coda Pack.
2. Add authentication header:
   - `X-API-Key`
3. Point the base URL to your DocuForge API host.
4. Add actions from the JSON definitions.

Use Coda Automations + webhooks for trigger flows (`render.completed`, `render.failed`).
