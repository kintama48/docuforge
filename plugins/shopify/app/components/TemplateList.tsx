import { useNavigate } from "@remix-run/react";
import {
  ResourceList,
  ResourceItem,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  EmptyState,
} from "@shopify/polaris";
import type { TemplateSummary } from "~/lib/docuforge-client";

interface TemplateListProps {
  templates: TemplateSummary[];
}

export function TemplateList({ templates }: TemplateListProps) {
  const navigate = useNavigate();

  if (templates.length === 0) {
    return (
      <EmptyState
        heading="No templates found"
        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
      >
        <p>
          Create templates in the DocuForge dashboard, then return here to set
          up automatic PDF generation.
        </p>
      </EmptyState>
    );
  }

  return (
    <ResourceList
      resourceName={{ singular: "template", plural: "templates" }}
      items={templates}
      renderItem={(template) => {
        const { id, name, description, updatedAt } = template;

        return (
          <ResourceItem
            id={id}
            onClick={() => navigate(`/app/templates/${id}`)}
            accessibilityLabel={`Configure template: ${name}`}
          >
            <BlockStack gap="100">
              <InlineStack gap="200" align="start" blockAlign="center">
                <Text as="span" variant="bodyMd" fontWeight="bold">
                  {name}
                </Text>
                <Badge tone="info">Template</Badge>
              </InlineStack>
              {description && (
                <Text as="p" variant="bodySm" tone="subdued">
                  {description.length > 120
                    ? description.slice(0, 120) + "..."
                    : description}
                </Text>
              )}
              <Text as="p" variant="bodySm" tone="subdued">
                Updated {new Date(updatedAt).toLocaleDateString()}
              </Text>
            </BlockStack>
          </ResourceItem>
        );
      }}
    />
  );
}
