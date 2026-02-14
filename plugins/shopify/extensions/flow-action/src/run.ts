import type { ActionRun } from "@shopify/flow-action";

interface FlowActionInput {
  template_id: string;
  data?: string;
  shop: string;
}

interface FlowActionOutput {
  success: boolean;
  render_id: string;
  error_message: string;
}

/**
 * Shopify Flow action handler for rendering a DocuForge PDF.
 *
 * This action is triggered from a Shopify Flow workflow and calls the
 * DocuForge render API using the shop's configured API key.
 *
 * Input:
 *   - template_id: The DocuForge template ID
 *   - data: JSON string of template variables (optional)
 *   - shop: The Shopify shop domain (injected by Flow)
 *
 * Output:
 *   - success: Whether the render completed successfully
 *   - render_id: The DocuForge render ID (empty on failure)
 *   - error_message: Error details (empty on success)
 */
export const run: ActionRun<FlowActionInput, FlowActionOutput> = async (
  input
) => {
  const { template_id, data: dataRaw, shop } = input;

  // Parse the optional JSON data
  let data: Record<string, unknown> = {};
  if (dataRaw) {
    try {
      data = JSON.parse(dataRaw);
    } catch {
      return {
        success: false,
        render_id: "",
        error_message: `Invalid JSON in data field: ${dataRaw.slice(0, 100)}`,
      };
    }
  }

  // Fetch the shop's API key from the app's backend
  // In production, this would call our app's internal API endpoint
  // to retrieve the encrypted API key for this shop
  const appUrl = process.env.SHOPIFY_APP_URL || "";
  const internalSecret = process.env.INTERNAL_API_SECRET || "";

  if (!appUrl) {
    return {
      success: false,
      render_id: "",
      error_message: "App URL not configured.",
    };
  }

  try {
    // Step 1: Retrieve the shop's DocuForge API key via internal endpoint
    const configRes = await fetch(`${appUrl}/api/internal/shop-config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${internalSecret}`,
      },
      body: JSON.stringify({ shop }),
    });

    if (!configRes.ok) {
      return {
        success: false,
        render_id: "",
        error_message: `Failed to retrieve shop config: ${configRes.status}`,
      };
    }

    const { apiKey } = (await configRes.json()) as { apiKey: string };

    // Step 2: Call DocuForge render API
    const renderRes = await fetch("https://api.docuforge.dev/v1/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        template_id,
        data,
      }),
    });

    if (!renderRes.ok) {
      const errorBody = await renderRes.text();
      return {
        success: false,
        render_id: "",
        error_message: `DocuForge render failed (${renderRes.status}): ${errorBody.slice(0, 200)}`,
      };
    }

    const renderId = renderRes.headers.get("X-Render-Id") || "unknown";

    // Step 3: Log the render result via internal endpoint
    await fetch(`${appUrl}/api/internal/render-log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${internalSecret}`,
      },
      body: JSON.stringify({
        shop,
        templateId: template_id,
        status: "success",
        renderId,
      }),
    }).catch(() => {
      // Non-critical: logging failure should not fail the action
    });

    return {
      success: true,
      render_id: renderId,
      error_message: "",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      success: false,
      render_id: "",
      error_message: message,
    };
  }
};
