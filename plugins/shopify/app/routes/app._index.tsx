import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Banner,
  Text,
  BlockStack,
  InlineStack,
  ProgressBar,
  Badge,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/shopify.server";
import { DocuForgeClient } from "~/lib/docuforge-client";
import { decrypt } from "~/lib/encryption";
import { TemplateList } from "~/components/TemplateList";
import type { TemplateSummary, UsageStats } from "~/lib/docuforge-client";

interface LoaderData {
  templates: TemplateSummary[];
  usage: UsageStats | null;
  error: string | null;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const config = await prisma.shopConfig.findUnique({
    where: { shop },
  });

  if (!config) {
    return redirect("/app/settings");
  }

  try {
    const apiKey = decrypt(config.docuforgeApiKey);
    const client = new DocuForgeClient(apiKey);

    const [templateResult, usage] = await Promise.all([
      client.listTemplates(1, 50),
      client.getUsage(),
    ]);

    return json<LoaderData>({
      templates: templateResult.templates,
      usage,
      error: null,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to connect to DocuForge.";
    return json<LoaderData>({
      templates: [],
      usage: null,
      error: message,
    });
  }
}

export default function DashboardPage() {
  const { templates, usage, error } = useLoaderData<LoaderData>();

  const usagePercentage = usage
    ? Math.round((usage.renders.used / usage.renders.limit) * 100)
    : 0;

  return (
    <Page title="DocuForge Dashboard">
      <BlockStack gap="500">
        {error && (
          <Banner tone="critical" title="Connection Error">
            <p>{error}</p>
          </Banner>
        )}

        {usage && (
          <Layout>
            <Layout.Section variant="oneHalf">
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      Usage
                    </Text>
                    <Badge tone={usage.plan === "free" ? "info" : "success"}>
                      {usage.plan.charAt(0).toUpperCase() +
                        usage.plan.slice(1)}{" "}
                      Plan
                    </Badge>
                  </InlineStack>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Renders used
                      </Text>
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {usage.renders.used.toLocaleString()} /{" "}
                        {usage.renders.limit.toLocaleString()}
                      </Text>
                    </InlineStack>
                    <ProgressBar
                      progress={usagePercentage}
                      tone={usagePercentage > 90 ? "critical" : "primary"}
                      size="small"
                    />
                    <Text
                      as="span"
                      variant="bodySm"
                      tone={
                        usage.renders.remaining < 100 ? "critical" : "subdued"
                      }
                    >
                      {usage.renders.remaining.toLocaleString()} renders
                      remaining
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Card>
            </Layout.Section>

            <Layout.Section variant="oneHalf">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Quick Stats
                  </Text>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodyMd">
                      Templates
                    </Text>
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      {templates.length}
                    </Text>
                  </InlineStack>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        )}

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Templates
                </Text>
                <TemplateList templates={templates} />
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
