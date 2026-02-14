import { useCallback } from "react";
import {
  FormLayout,
  Select,
  TextField,
  BlockStack,
  Text,
  InlineStack,
  Icon,
} from "@shopify/polaris";
import { SHOPIFY_FIELDS, getGroupedFieldOptions } from "~/lib/field-mapping";

interface DataMapperProps {
  fields: string[];
  mapping: Record<string, string>;
  onChange: (mapping: Record<string, string>) => void;
}

const STATIC_VALUE_SENTINEL = "__static__";

export function DataMapper({ fields, mapping, onChange }: DataMapperProps) {
  const groupedOptions = getGroupedFieldOptions();

  // Build flat options list with group headers
  const selectOptions = [
    { label: "-- Select a Shopify field --", value: "" },
    { label: "Static Value", value: STATIC_VALUE_SENTINEL },
    ...SHOPIFY_FIELDS.map((f) => ({
      label: `${f.category}: ${f.label}`,
      value: f.value,
    })),
  ];

  const handleFieldChange = useCallback(
    (templateField: string, value: string) => {
      const newMapping = { ...mapping };
      if (value === STATIC_VALUE_SENTINEL) {
        // Set a static prefix with empty value, user will fill in the text field
        newMapping[templateField] = "static:";
      } else {
        newMapping[templateField] = value;
      }
      onChange(newMapping);
    },
    [mapping, onChange]
  );

  const handleStaticValueChange = useCallback(
    (templateField: string, staticValue: string) => {
      const newMapping = { ...mapping };
      newMapping[templateField] = `static:${staticValue}`;
      onChange(newMapping);
    },
    [mapping, onChange]
  );

  const getSelectedValue = (templateField: string): string => {
    const val = mapping[templateField] || "";
    if (val.startsWith("static:")) {
      return STATIC_VALUE_SENTINEL;
    }
    return val;
  };

  const getStaticValue = (templateField: string): string => {
    const val = mapping[templateField] || "";
    if (val.startsWith("static:")) {
      return val.slice("static:".length);
    }
    return "";
  };

  const isStatic = (templateField: string): boolean => {
    return (mapping[templateField] || "").startsWith("static:");
  };

  return (
    <BlockStack gap="400">
      {fields.map((field) => (
        <BlockStack gap="200" key={field}>
          <InlineStack gap="200" blockAlign="center">
            <Text as="span" variant="bodyMd" fontWeight="semibold">
              {field}
            </Text>
          </InlineStack>
          <FormLayout>
            <FormLayout.Group condensed>
              <Select
                label="Source"
                labelHidden
                options={selectOptions}
                value={getSelectedValue(field)}
                onChange={(val) => handleFieldChange(field, val)}
              />
              {isStatic(field) && (
                <TextField
                  label="Static Value"
                  labelHidden
                  value={getStaticValue(field)}
                  onChange={(val) => handleStaticValueChange(field, val)}
                  autoComplete="off"
                  placeholder="Enter a static value"
                />
              )}
            </FormLayout.Group>
          </FormLayout>
        </BlockStack>
      ))}

      {fields.length === 0 && (
        <Text as="p" variant="bodyMd" tone="subdued">
          No template fields to map.
        </Text>
      )}
    </BlockStack>
  );
}
