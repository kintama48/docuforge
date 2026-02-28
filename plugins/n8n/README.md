# DocuForge n8n Integration Starter

This folder contains importable n8n workflow templates for DocuForge.

## Included workflows

- `workflows/render-pdf.json`
- `workflows/render-image.json`

## Setup

1. In n8n, create credentials for your DocuForge API key.
2. Import one of the workflow JSON files.
3. Set:
   - `DOCUFORGE_BASE_URL` (example: `https://api.docuforge.app`)
   - `DOCUFORGE_API_KEY`
4. Provide your `template_id` and payload data in the trigger node.

## Trigger support

For trigger-based automations, register DocuForge webhooks via `POST /v1/webhooks` and point them to your n8n webhook URL.
