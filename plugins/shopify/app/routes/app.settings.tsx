import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit } from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  Banner,
  BlockStack,
  Text,
  InlineStack,
  Badge,
} from "@shopify/polaris";
import { authenticate, prisma } from "~/shopify.server";
import { encrypt, decrypt } from "~/lib/encryption";
import { DocuForgeClient } from "~/lib/docuforge-client";
import type { UsageStats } from "~/lib/docuforge-client";

interface LoaderData {
  hasApiKey: boolean;
  maskedKey: string;
}

interface ActionData {
  success?: boolean;
  error?: string;
  usage?: UsageStats;
  action?: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const config = await prisma.shopConfig.findUnique({
    where: { shop },
  });

  let maskedKey = "";
  if (config) {
    try {
      const key = decrypt(config.docuforgeApiKey);
      maskedKey =
        key.length > 8
          ? key.slice(0, 4) + "*".repeat(key.length - 8) + key.slice(-4)
          : "*".repeat(key.length);
    } catch {
      maskedKey = "********";
    }
  }

  return json<LoaderData>({
    hasApiKey: !!config,
    maskedKey,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "save") {
    const apiKey = formData.get("apiKey") as string;
    if (!apiKey || apiKey.trim().length === 0) {
      return json<ActionData>({
        error: "API key is required.",
        action: "save",
      });
    }

    const encryptedKey = encrypt(apiKey.trim());

    await prisma.shopConfig.upsert({
      where: { shop },
      create: {
        shop,
        docuforgeApiKey: encryptedKey,
      },
      update: {
        docuforgeApiKey: encryptedKey,
      },
    });

    return json<ActionData>({
      success: true,
      action: "save",
    });
  }

  if (intent === "test") {
    const config = await prisma.shopConfig.findUnique({
      where: { shop },
    });

    if (!config) {
      return json<ActionData>({
        error: "No API key configured. Please save an API key first.",
        action: "test",
      });
    }

    try {
      const apiKey = decrypt(config.docuforgeApiKey);
      const client = new DocuForgeClient(apiKey);
      const usage = await client.getUsage();

      return json<ActionData>({
        success: true,
        usage,
        action: "test",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Connection test failed.";
      return json<ActionData>({
        error: message,
        action: "test",
      });
    }
  }

  if (intent === "delete") {
    await prisma.shopConfig.deleteMany({
      where: { shop },
    });
    return json<ActionData>({
      success: true,
      action: "delete",
    });
  }

  return json<ActionData>({ error: "Unknown action." });
}

export default function SettingsPage() {
  const { hasApiKey, maskedKey } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const submit = useSubmit();

  const [apiKey, setApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(!hasApiKey);

  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.set("intent", "save");
    formData.set("apiKey", apiKey);
    submit(formData, { method: "post" });
  }, [apiKey, submit]);

  const handleTest = useCallback(() => {
    const formData = new FormData();
    formData.set("intent", "test");
    submit(formData, { method: "post" });
  }, [submit]);

  const handleDelete = useCallback(() => {
    const formData = new FormData();
    formData.set("intent", "delete");
    submit(formData, { method: "post" });
  }, [submit]);

  return (
    <Page title="Settings" narrowWidth>
      <BlockStack gap="500">
        {actionData?.success && actionData.action === "save" && (
          <Banner tone="success" title="API key saved">
            <p>
              Your DocuForge API key has been saved securely. Use the test button
              to verify the connection.
            </p>
          </Banner>
        )}

        {actionData?.success && actionData.action === "delete" && (
          <Banner tone="info" title="API key removed">
            <p>Your DocuForge API key has been removed.</p>
          </Banner>
        )}

        {actionData?.error && (
          <Banner tone="critical" title="Error">
            <p>{actionData.error}</p>
          </Banner>
        )}

        {actionData?.success && actionData.action === "test" && actionData.usage && (
          <Banner tone="success" title="Connection Successful">
            <BlockStack gap="200">
              <InlineStack gap="200">
                <Text as="span" variant="bodyMd">
                  Plan:
                </Text>
                <Badge tone="success">
                  {actionData.usage.plan.charAt(0).toUpperCase() +
                    actionData.usage.plan.slice(1)}
                </Badge>
              </InlineStack>
              <Text as="p" variant="bodyMd">
                Renders: {actionData.usage.renders.used.toLocaleString()} /{" "}
                {actionData.usage.renders.limit.toLocaleString()} (
                {actionData.usage.renders.remaining.toLocaleString()} remaining)
              </Text>
            </BlockStack>
          </Banner>
        )}

        <Layout>
          <Layout.AnnotatedSection
            title="DocuForge API Key"
            description="Enter your DocuForge API key to connect this Shopify store. You can find your API key in the DocuForge dashboard under Settings > API Keys."
          >
            <Card>
              <BlockStack gap="400">
                {hasApiKey && !showKeyInput ? (
                  <BlockStack gap="300">
                    <TextField
                      label="Current API Key"
                      value={maskedKey}
                      disabled
                      autoComplete="off"
                    />
                    <InlineStack gap="300">
                      <Button onClick={() => setShowKeyInput(true)}>
                        Update Key
                      </Button>
                      <Button onClick={handleTest}>Test Connection</Button>
                      <Button tone="critical" onClick={handleDelete}>
                        Remove Key
                      </Button>
                    </InlineStack>
                  </BlockStack>
                ) : (
                  <FormLayout>
                    <TextField
                      label="API Key"
                      value={apiKey}
                      onChange={setApiKey}
                      type="password"
                      autoComplete="off"
                      placeholder="df_live_..."
                      helpText="Your DocuForge API key starting with df_live_ or df_test_"
                    />
                    <InlineStack gap="300">
                      <Button variant="primary" onClick={handleSave}>
                        Save API Key
                      </Button>
                      {hasApiKey && (
                        <Button onClick={() => setShowKeyInput(false)}>
                          Cancel
                        </Button>
                      )}
                    </InlineStack>
                  </FormLayout>
                )}
              </BlockStack>
            </Card>
          </Layout.AnnotatedSection>
        </Layout>
      </BlockStack>
    </Page>
  );
}
