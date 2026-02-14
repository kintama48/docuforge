import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate, prisma } from "~/shopify.server";
import { DocuForgeClient } from "~/lib/docuforge-client";
import { decrypt } from "~/lib/encryption";
import { applyFieldMapping } from "~/lib/field-mapping";

export async function action({ request }: ActionFunctionArgs) {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`[webhook] Received ${topic} for ${shop}`);

  // Map Shopify webhook topics to our trigger event names
  const topicToEvent: Record<string, string> = {
    ORDERS_CREATE: "orders/create",
    ORDERS_PAID: "orders/paid",
    ORDERS_FULFILLED: "orders/fulfilled",
  };

  const triggerEvent = topicToEvent[topic];
  if (!triggerEvent) {
    console.log(`[webhook] Unhandled topic: ${topic}`);
    return new Response("OK", { status: 200 });
  }

  // Find active render mappings for this shop and event
  const mappings = await prisma.renderMapping.findMany({
    where: {
      shop,
      triggerEvent,
      isActive: true,
    },
  });

  if (mappings.length === 0) {
    console.log(
      `[webhook] No active mappings for ${shop} / ${triggerEvent}`
    );
    return new Response("OK", { status: 200 });
  }

  // Get the shop's DocuForge API key
  const config = await prisma.shopConfig.findUnique({
    where: { shop },
  });

  if (!config) {
    console.error(`[webhook] No DocuForge config for shop: ${shop}`);
    return new Response("OK", { status: 200 });
  }

  let apiKey: string;
  try {
    apiKey = decrypt(config.docuforgeApiKey);
  } catch (err) {
    console.error(`[webhook] Failed to decrypt API key for ${shop}:`, err);
    return new Response("OK", { status: 200 });
  }

  const client = new DocuForgeClient(apiKey);
  const orderPayload = payload as Record<string, unknown>;
  const orderId = String(orderPayload.id || orderPayload.name || "unknown");

  // Process each mapping
  for (const mapping of mappings) {
    const fieldMapping = mapping.fieldMapping as Record<string, string>;

    // Create a pending log entry
    const logEntry = await prisma.renderLog.create({
      data: {
        shop,
        orderId,
        templateId: mapping.templateId,
        status: "pending",
      },
    });

    try {
      // Apply field mapping to transform order data into template data
      const templateData = applyFieldMapping(fieldMapping, orderPayload);

      // Render the PDF
      const result = await client.renderPdf(mapping.templateId, templateData);

      // Update log with success
      await prisma.renderLog.update({
        where: { id: logEntry.id },
        data: {
          status: "success",
          renderId: result.renderId,
        },
      });

      console.log(
        `[webhook] Rendered PDF for ${shop} order ${orderId} ` +
          `(template: ${mapping.templateId}, render: ${result.renderId}, ` +
          `${result.durationMs}ms, ${(result.pdf.length / 1024).toFixed(1)}KB)`
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown render error";

      // Update log with error
      await prisma.renderLog.update({
        where: { id: logEntry.id },
        data: {
          status: "error",
          errorMessage,
        },
      });

      console.error(
        `[webhook] Render failed for ${shop} order ${orderId} ` +
          `(template: ${mapping.templateId}): ${errorMessage}`
      );
    }
  }

  return new Response("OK", { status: 200 });
}
