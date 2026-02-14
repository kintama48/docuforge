import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit } from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  Select,
  TextField,
  Button,
  Banner,
  BlockStack,
  Text,
  InlineStack,
  Badge,
  Divider,
} from "@shopify/polaris";
import { authenticate, prisma } from "~/shopify.server";
import { DocuForgeClient } from "~/lib/docuforge-client";
import type { Template } from "~/lib/docuforge-client";
import { decrypt } from "~/lib/encryption";
import { DataMapper } from "~/components/DataMapper";

const TRIGGER_EVENTS = [
  { label: "Order Created", value: "orders/create" },
  { label: "Order Paid", value: "orders/paid" },
  { label: "Order Fulfilled", value: "orders/fulfilled" },
  { label: "Manual Only", value: "manual" },
];

interface LoaderData {
  template: Template;
  existingMapping: {
    id: string;
    name: string;
    triggerEvent: string;
    fieldMapping: Record<string, string>;
    isActive: boolean;
  } | null;
}

interface ActionData {
  success?: boolean;
  error?: string;
  action?: string;
  testResult?: {
    renderId: string;
    durationMs: number;
    sizeBytes: number;
  };
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const templateId = params.id!;

  const config = await prisma.shopConfig.findUnique({
    where: { shop },
  });

  if (!config) {
    return redirect("/app/settings");
  }

  const apiKey = decrypt(config.docuforgeApiKey);
  const client = new DocuForgeClient(apiKey);
  const template = await client.getTemplate(templateId);

  const existingMapping = await prisma.renderMapping.findFirst({
    where: { shop, templateId },
  });

  return json<LoaderData>({
    template,
    existingMapping: existingMapping
      ? {
          id: existingMapping.id,
          name: existingMapping.name,
          triggerEvent: existingMapping.triggerEvent,
          fieldMapping: existingMapping.fieldMapping as Record<string, string>,
          isActive: existingMapping.isActive,
        }
      : null,
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const templateId = params.id!;
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "save-mapping") {
    const name = formData.get("name") as string;
    const triggerEvent = formData.get("triggerEvent") as string;
    const fieldMappingRaw = formData.get("fieldMapping") as string;
    const isActive = formData.get("isActive") === "true";

    if (!name || !triggerEvent) {
      return json<ActionData>({
        error: "Name and trigger event are required.",
        action: "save",
      });
    }

    let fieldMapping: Record<string, string>;
    try {
      fieldMapping = JSON.parse(fieldMappingRaw);
    } catch {
      return json<ActionData>({
        error: "Invalid field mapping data.",
        action: "save",
      });
    }

    await prisma.renderMapping.upsert({
      where: { shop_name: { shop, name } },
      create: {
        shop,
        name,
        templateId,
        triggerEvent,
        fieldMapping,
        isActive,
      },
      update: {
        templateId,
        triggerEvent,
        fieldMapping,
        isActive,
      },
    });

    return json<ActionData>({ success: true, action: "save" });
  }

  if (intent === "test-render") {
    const config = await prisma.shopConfig.findUnique({
      where: { shop },
    });

    if (!config) {
      return json<ActionData>({
        error: "No API key configured.",
        action: "test",
      });
    }

    try {
      const apiKey = decrypt(config.docuforgeApiKey);
      const client = new DocuForgeClient(apiKey);

      // Use template defaults as test data
      const template = await client.getTemplate(templateId);
      const testData = template.defaults as Record<string, unknown>;

      const result = await client.renderPdf(templateId, testData);

      return json<ActionData>({
        success: true,
        action: "test",
        testResult: {
          renderId: result.renderId,
          durationMs: result.durationMs,
          sizeBytes: result.pdf.length,
        },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Test render failed.";
      return json<ActionData>({ error: message, action: "test" });
    }
  }

  if (intent === "delete-mapping") {
    const mappingId = formData.get("mappingId") as string;
    if (mappingId) {
      await prisma.renderMapping.delete({ where: { id: mappingId } });
    }
    return json<ActionData>({ success: true, action: "delete" });
  }

  return json<ActionData>({ error: "Unknown action." });
}

export default function TemplateDetailPage() {
  const { template, existingMapping } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const submit = useSubmit();

  const [mappingName, setMappingName] = useState(
    existingMapping?.name || `${template.name} Mapping`
  );
  const [triggerEvent, setTriggerEvent] = useState(
    existingMapping?.triggerEvent || "orders/paid"
  );
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>(
    existingMapping?.fieldMapping || {}
  );
  const [isActive, setIsActive] = useState(
    existingMapping?.isActive ?? true
  );

  const templateFields = Object.keys(template.defaults || {});

  const handleSaveMapping = useCallback(() => {
    const formData = new FormData();
    formData.set("intent", "save-mapping");
    formData.set("name", mappingName);
    formData.set("triggerEvent", triggerEvent);
    formData.set("fieldMapping", JSON.stringify(fieldMapping));
    formData.set("isActive", String(isActive));
    submit(formData, { method: "post" });
  }, [mappingName, triggerEvent, fieldMapping, isActive, submit]);

  const handleTestRender = useCallback(() => {
    const formData = new FormData();
    formData.set("intent", "test-render");
    submit(formData, { method: "post" });
  }, [submit]);

  const handleDeleteMapping = useCallback(() => {
    if (!existingMapping) return;
    const formData = new FormData();
    formData.set("intent", "delete-mapping");
    formData.set("mappingId", existingMapping.id);
    submit(formData, { method: "post" });
  }, [existingMapping, submit]);

  const latestVersion =
    template.versions && template.versions.length > 0
      ? template.versions[template.versions.length - 1]
      : null;

  return (
    <Page
      title={template.name}
      backAction={{ url: "/app" }}
      titleMetadata={
        latestVersion ? (
          <Badge>v{latestVersion.version}</Badge>
        ) : undefined
      }
    >
      <BlockStack gap="500">
        {actionData?.success && actionData.action === "save" && (
          <Banner tone="success" title="Mapping saved">
            <p>Your data mapping has been saved successfully.</p>
          </Banner>
        )}

        {actionData?.success && actionData.action === "delete" && (
          <Banner tone="info" title="Mapping deleted">
            <p>The data mapping has been removed.</p>
          </Banner>
        )}

        {actionData?.error && (
          <Banner tone="critical" title="Error">
            <p>{actionData.error}</p>
          </Banner>
        )}

        {actionData?.success && actionData.action === "test" && actionData.testResult && (
          <Banner tone="success" title="Test Render Successful">
            <BlockStack gap="100">
              <Text as="p" variant="bodyMd">
                Render ID: {actionData.testResult.renderId}
              </Text>
              <Text as="p" variant="bodyMd">
                Duration: {actionData.testResult.durationMs}ms
              </Text>
              <Text as="p" variant="bodyMd">
                PDF Size:{" "}
                {(actionData.testResult.sizeBytes / 1024).toFixed(1)} KB
              </Text>
            </BlockStack>
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Template Details
                </Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">
                    {template.description || "No description provided."}
                  </Text>
                  {latestVersion && (
                    <Text as="p" variant="bodySm" tone="subdued">
                      Latest version: v{latestVersion.version} (created{" "}
                      {new Date(latestVersion.createdAt).toLocaleDateString()})
                    </Text>
                  )}
                  <Text as="p" variant="bodySm" tone="subdued">
                    Template fields: {templateFields.length > 0 ? templateFields.join(", ") : "None defined"}
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Data Mapping Configuration
                </Text>
                <FormLayout>
                  <TextField
                    label="Mapping Name"
                    value={mappingName}
                    onChange={setMappingName}
                    autoComplete="off"
                    helpText="A unique name for this mapping configuration"
                  />
                  <Select
                    label="Trigger Event"
                    options={TRIGGER_EVENTS}
                    value={triggerEvent}
                    onChange={setTriggerEvent}
                    helpText="When should this PDF be automatically generated?"
                  />
                </FormLayout>

                <Divider />

                <Text as="h3" variant="headingSm">
                  Field Mappings
                </Text>
                {templateFields.length > 0 ? (
                  <DataMapper
                    fields={templateFields}
                    mapping={fieldMapping}
                    onChange={setFieldMapping}
                  />
                ) : (
                  <Text as="p" variant="bodyMd" tone="subdued">
                    No template fields defined. The template&apos;s default
                    values will be used.
                  </Text>
                )}

                <Divider />

                <InlineStack gap="300" align="start">
                  <Button variant="primary" onClick={handleSaveMapping}>
                    {existingMapping ? "Update Mapping" : "Save Mapping"}
                  </Button>
                  <Button onClick={handleTestRender}>
                    Test Render
                  </Button>
                  {existingMapping && (
                    <Button tone="critical" onClick={handleDeleteMapping}>
                      Delete Mapping
                    </Button>
                  )}
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
