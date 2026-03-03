# DocuForge FlutterFlow Integration Starter

This folder contains FlutterFlow API Call definitions for DocuForge.

## Included calls

- `api-calls/render-pdf.json`
- `api-calls/render-image.json`

## Setup

1. In FlutterFlow, open API Calls.
2. Create app constants:
   - `docuforgeBaseUrl`
   - `docuforgeApiKey`
3. Import the request definitions and map constants/variables.
4. Use returned bytes for file download or upload to storage.

For event-driven workflows, use FlutterFlow backend endpoints + DocuForge webhooks.
