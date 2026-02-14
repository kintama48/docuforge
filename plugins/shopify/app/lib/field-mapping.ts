export interface ShopifyField {
  label: string;
  value: string;
  category: string;
}

export const SHOPIFY_FIELDS: ShopifyField[] = [
  // Order basics
  { label: "Order Number", value: "order.name", category: "Order" },
  { label: "Order ID", value: "order.id", category: "Order" },
  {
    label: "Order Created At",
    value: "order.created_at",
    category: "Order",
  },
  {
    label: "Order Processed At",
    value: "order.processed_at",
    category: "Order",
  },
  {
    label: "Financial Status",
    value: "order.financial_status",
    category: "Order",
  },
  {
    label: "Fulfillment Status",
    value: "order.fulfillment_status",
    category: "Order",
  },
  { label: "Order Note", value: "order.note", category: "Order" },
  { label: "Order Tags", value: "order.tags", category: "Order" },
  { label: "Cancel Reason", value: "order.cancel_reason", category: "Order" },
  { label: "Cancelled At", value: "order.cancelled_at", category: "Order" },

  // Pricing
  { label: "Total Price", value: "order.total_price", category: "Pricing" },
  { label: "Subtotal Price", value: "order.subtotal_price", category: "Pricing" },
  { label: "Total Tax", value: "order.total_tax", category: "Pricing" },
  {
    label: "Total Discounts",
    value: "order.total_discounts",
    category: "Pricing",
  },
  {
    label: "Total Shipping",
    value: "order.total_shipping_price_set.shop_money.amount",
    category: "Pricing",
  },
  { label: "Currency", value: "order.currency", category: "Pricing" },

  // Customer
  {
    label: "Customer First Name",
    value: "order.customer.first_name",
    category: "Customer",
  },
  {
    label: "Customer Last Name",
    value: "order.customer.last_name",
    category: "Customer",
  },
  {
    label: "Customer Email",
    value: "order.customer.email",
    category: "Customer",
  },
  {
    label: "Customer Phone",
    value: "order.customer.phone",
    category: "Customer",
  },
  {
    label: "Customer Orders Count",
    value: "order.customer.orders_count",
    category: "Customer",
  },
  {
    label: "Customer Total Spent",
    value: "order.customer.total_spent",
    category: "Customer",
  },

  // Billing address
  {
    label: "Billing First Name",
    value: "order.billing_address.first_name",
    category: "Billing Address",
  },
  {
    label: "Billing Last Name",
    value: "order.billing_address.last_name",
    category: "Billing Address",
  },
  {
    label: "Billing Company",
    value: "order.billing_address.company",
    category: "Billing Address",
  },
  {
    label: "Billing Address 1",
    value: "order.billing_address.address1",
    category: "Billing Address",
  },
  {
    label: "Billing Address 2",
    value: "order.billing_address.address2",
    category: "Billing Address",
  },
  {
    label: "Billing City",
    value: "order.billing_address.city",
    category: "Billing Address",
  },
  {
    label: "Billing Province",
    value: "order.billing_address.province",
    category: "Billing Address",
  },
  {
    label: "Billing Zip",
    value: "order.billing_address.zip",
    category: "Billing Address",
  },
  {
    label: "Billing Country",
    value: "order.billing_address.country",
    category: "Billing Address",
  },
  {
    label: "Billing Phone",
    value: "order.billing_address.phone",
    category: "Billing Address",
  },

  // Shipping address
  {
    label: "Shipping First Name",
    value: "order.shipping_address.first_name",
    category: "Shipping Address",
  },
  {
    label: "Shipping Last Name",
    value: "order.shipping_address.last_name",
    category: "Shipping Address",
  },
  {
    label: "Shipping Company",
    value: "order.shipping_address.company",
    category: "Shipping Address",
  },
  {
    label: "Shipping Address 1",
    value: "order.shipping_address.address1",
    category: "Shipping Address",
  },
  {
    label: "Shipping Address 2",
    value: "order.shipping_address.address2",
    category: "Shipping Address",
  },
  {
    label: "Shipping City",
    value: "order.shipping_address.city",
    category: "Shipping Address",
  },
  {
    label: "Shipping Province",
    value: "order.shipping_address.province",
    category: "Shipping Address",
  },
  {
    label: "Shipping Zip",
    value: "order.shipping_address.zip",
    category: "Shipping Address",
  },
  {
    label: "Shipping Country",
    value: "order.shipping_address.country",
    category: "Shipping Address",
  },
  {
    label: "Shipping Phone",
    value: "order.shipping_address.phone",
    category: "Shipping Address",
  },

  // Line items (array)
  { label: "Line Items", value: "order.line_items", category: "Line Items" },
  {
    label: "Line Items Count",
    value: "order.line_items.length",
    category: "Line Items",
  },

  // Shipping lines
  {
    label: "Shipping Method",
    value: "order.shipping_lines[0].title",
    category: "Shipping",
  },
  {
    label: "Shipping Price",
    value: "order.shipping_lines[0].price",
    category: "Shipping",
  },

  // Discount codes
  {
    label: "Discount Codes",
    value: "order.discount_codes",
    category: "Discounts",
  },
];

/**
 * Resolve a nested value from an object using a dot-notation path.
 * Supports array index notation like `line_items[0].title`.
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined) {
    return undefined;
  }

  const segments = path.replace(/\[(\d+)]/g, ".$1").split(".");
  let current: unknown = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

/**
 * Apply a field mapping to an order payload to produce template data.
 *
 * The mapping is a Record where keys are template field names and values are
 * either:
 *   - A Shopify field path (e.g., "order.customer.email")
 *   - A static value prefixed with "static:" (e.g., "static:My Company Name")
 */
export function applyFieldMapping(
  mapping: Record<string, string>,
  orderPayload: unknown
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [templateField, sourceExpression] of Object.entries(mapping)) {
    if (!sourceExpression) {
      continue;
    }

    if (sourceExpression.startsWith("static:")) {
      result[templateField] = sourceExpression.slice("static:".length);
    } else {
      // Strip leading "order." since the payload is the order itself
      const path = sourceExpression.startsWith("order.")
        ? sourceExpression.slice("order.".length)
        : sourceExpression;
      result[templateField] = getNestedValue(orderPayload, path);
    }
  }

  return result;
}

/**
 * Group SHOPIFY_FIELDS by category for use in Select option groups.
 */
export function getGroupedFieldOptions(): {
  title: string;
  options: { label: string; value: string }[];
}[] {
  const groups = new Map<
    string,
    { label: string; value: string }[]
  >();

  for (const field of SHOPIFY_FIELDS) {
    if (!groups.has(field.category)) {
      groups.set(field.category, []);
    }
    groups.get(field.category)!.push({
      label: field.label,
      value: field.value,
    });
  }

  return Array.from(groups.entries()).map(([title, options]) => ({
    title,
    options,
  }));
}
