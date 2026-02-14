import { useState, useCallback } from "react";
import {
  Card,
  FormLayout,
  TextField,
  Button,
  InlineStack,
  BlockStack,
  Banner,
  Text,
  Badge,
} from "@shopify/polaris";
import type { UsageStats } from "~/lib/docuforge-client";

interface ApiKeyFormProps {
  hasExistingKey: boolean;
  maskedKey: string;
  onSave: (apiKey: string) => void;
  onTest: () => void;
  onDelete: () => void;
  isSaving?: boolean;
  isTesting?: boolean;
  saveResult?: { success: boolean; error?: string };
  testResult?: { success: boolean; error?: string; usage?: UsageStats };
}

export function ApiKeyForm({
  hasExistingKey,
  maskedKey,
  onSave,
  onTest,
  onDelete,
  isSaving = false,
  isTesting = false,
  saveResult,
  testResult,
}: ApiKeyFormProps) {
  const [apiKey, setApiKey] = useState("");
  const [isEditing, setIsEditing] = useState(!hasExistingKey);

  const handleSave = useCallback(() => {
    if (apiKey.trim()) {
      onSave(apiKey.trim());
      setApiKey("");
      setIsEditing(false);
    }
  }, [apiKey, onSave]);

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">
          DocuForge API Key
        </Text>

        {saveResult?.success && (
          <Banner tone="success" title="Saved">
            <p>API key saved securely.</p>
          </Banner>
        )}

        {saveResult?.error && (
          <Banner tone="critical" title="Save Failed">
            <p>{saveResult.error}</p>
          </Banner>
        )}

        {testResult?.success && testResult.usage && (
          <Banner tone="success" title="Connection Successful">
            <BlockStack gap="100">
              <InlineStack gap="200">
                <Text as="span" variant="bodyMd">Plan:</Text>
                <Badge tone="success">
                  {testResult.usage.plan.charAt(0).toUpperCase() +
                    testResult.usage.plan.slice(1)}
                </Badge>
              </InlineStack>
              <Text as="p" variant="bodyMd">
                Renders: {testResult.usage.renders.used} /{" "}
                {testResult.usage.renders.limit} (
                {testResult.usage.renders.remaining} remaining)
              </Text>
            </BlockStack>
          </Banner>
        )}

        {testResult?.error && (
          <Banner tone="critical" title="Connection Failed">
            <p>{testResult.error}</p>
          </Banner>
        )}

        {isEditing ? (
          <FormLayout>
            <TextField
              label="API Key"
              value={apiKey}
              onChange={setApiKey}
              type="password"
              autoComplete="off"
              placeholder="df_live_..."
              helpText="Your DocuForge API key from the dashboard"
            />
            <InlineStack gap="300">
              <Button
                variant="primary"
                onClick={handleSave}
                loading={isSaving}
                disabled={!apiKey.trim()}
              >
                Save API Key
              </Button>
              {hasExistingKey && (
                <Button onClick={() => setIsEditing(false)}>Cancel</Button>
              )}
            </InlineStack>
          </FormLayout>
        ) : (
          <BlockStack gap="300">
            <TextField
              label="Current API Key"
              value={maskedKey}
              disabled
              autoComplete="off"
            />
            <InlineStack gap="300">
              <Button onClick={() => setIsEditing(true)}>Update Key</Button>
              <Button onClick={onTest} loading={isTesting}>
                Test Connection
              </Button>
              <Button tone="critical" onClick={onDelete}>
                Remove Key
              </Button>
            </InlineStack>
          </BlockStack>
        )}
      </BlockStack>
    </Card>
  );
}
