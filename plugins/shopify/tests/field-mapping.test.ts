import { describe, it, expect } from "vitest";
import {
  getNestedValue,
  applyFieldMapping,
  getGroupedFieldOptions,
  SHOPIFY_FIELDS,
} from "../app/lib/field-mapping";

// ---------------------------------------------------------------------------
// Sample order payload
// ---------------------------------------------------------------------------

const sampleOrder = {
  name: "#1001",
  id: 123456789,
  created_at: "2025-06-15T10:00:00Z",
  total_price: "149.99",
  subtotal_price: "139.99",
  total_tax: "10.00",
  currency: "USD",
  financial_status: "paid",
  customer: {
    first_name: "John",
    last_name: "Doe",
    email: "john@example.com",
    phone: "+1234567890",
    orders_count: 5,
    total_spent: "749.95",
  },
  billing_address: {
    first_name: "John",
    last_name: "Doe",
    company: "Acme Corp",
    address1: "123 Main St",
    address2: "Suite 100",
    city: "Portland",
    province: "OR",
    zip: "97201",
    country: "US",
    phone: "+1234567890",
  },
  shipping_address: {
    first_name: "John",
    last_name: "Doe",
    company: "Acme Corp",
    address1: "456 Oak Ave",
    city: "Portland",
    province: "OR",
    zip: "97201",
    country: "US",
  },
  line_items: [
    { title: "Widget Pro", quantity: 2, price: "49.99" },
    { title: "Gadget Mini", quantity: 1, price: "40.01" },
  ],
  shipping_lines: [{ title: "Standard Shipping", price: "5.99" }],
  discount_codes: [
    { code: "SAVE10", amount: "10.00", type: "fixed_amount" },
  ],
};

// ---------------------------------------------------------------------------
// getNestedValue
// ---------------------------------------------------------------------------

describe("getNestedValue", () => {
  it("resolves simple dot-notation paths", () => {
    expect(getNestedValue(sampleOrder, "customer.email")).toBe(
      "john@example.com"
    );
  });

  it("resolves top-level fields", () => {
    expect(getNestedValue(sampleOrder, "name")).toBe("#1001");
    expect(getNestedValue(sampleOrder, "total_price")).toBe("149.99");
  });

  it("resolves array indices", () => {
    expect(getNestedValue(sampleOrder, "line_items[0].title")).toBe(
      "Widget Pro"
    );
    expect(getNestedValue(sampleOrder, "line_items[1].title")).toBe(
      "Gadget Mini"
    );
    expect(getNestedValue(sampleOrder, "line_items[0].quantity")).toBe(2);
  });

  it("resolves array index on shipping_lines", () => {
    expect(getNestedValue(sampleOrder, "shipping_lines[0].title")).toBe(
      "Standard Shipping"
    );
    expect(getNestedValue(sampleOrder, "shipping_lines[0].price")).toBe(
      "5.99"
    );
  });

  it("returns undefined for missing paths", () => {
    expect(getNestedValue(sampleOrder, "nonexistent")).toBeUndefined();
    expect(
      getNestedValue(sampleOrder, "customer.nonexistent")
    ).toBeUndefined();
    expect(
      getNestedValue(sampleOrder, "customer.email.nonexistent")
    ).toBeUndefined();
  });

  it("returns undefined for null input", () => {
    expect(getNestedValue(null, "any.path")).toBeUndefined();
  });

  it("returns undefined for undefined input", () => {
    expect(getNestedValue(undefined, "any.path")).toBeUndefined();
  });

  it("handles deeply nested objects", () => {
    const deep = { a: { b: { c: { d: { e: "deep" } } } } };
    expect(getNestedValue(deep, "a.b.c.d.e")).toBe("deep");
  });

  it("returns the full array when path points to an array", () => {
    const result = getNestedValue(sampleOrder, "line_items");
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it("returns numeric values correctly", () => {
    expect(getNestedValue(sampleOrder, "id")).toBe(123456789);
    expect(getNestedValue(sampleOrder, "customer.orders_count")).toBe(5);
  });

  it("returns undefined for out-of-bounds array index", () => {
    expect(getNestedValue(sampleOrder, "line_items[99].title")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// applyFieldMapping
// ---------------------------------------------------------------------------

describe("applyFieldMapping", () => {
  it("maps Shopify fields to template data", () => {
    const mapping: Record<string, string> = {
      customerEmail: "order.customer.email",
      orderNumber: "order.name",
    };

    const result = applyFieldMapping(mapping, sampleOrder);

    expect(result).toEqual({
      customerEmail: "john@example.com",
      orderNumber: "#1001",
    });
  });

  it("handles static values with 'static:' prefix", () => {
    const mapping: Record<string, string> = {
      companyName: "static:My Company",
      tagline: "static:Best widgets ever!",
    };

    const result = applyFieldMapping(mapping, sampleOrder);

    expect(result).toEqual({
      companyName: "My Company",
      tagline: "Best widgets ever!",
    });
  });

  it("strips 'order.' prefix from source paths", () => {
    const mapping: Record<string, string> = {
      total: "order.total_price",
      currency: "order.currency",
    };

    const result = applyFieldMapping(mapping, sampleOrder);

    expect(result.total).toBe("149.99");
    expect(result.currency).toBe("USD");
  });

  it("handles paths without 'order.' prefix as-is", () => {
    const mapping: Record<string, string> = {
      total: "total_price",
    };

    const result = applyFieldMapping(mapping, sampleOrder);

    expect(result.total).toBe("149.99");
  });

  it("skips empty source expressions", () => {
    const mapping: Record<string, string> = {
      filled: "order.name",
      empty: "",
    };

    const result = applyFieldMapping(mapping, sampleOrder);

    expect(result).toHaveProperty("filled");
    expect(result).not.toHaveProperty("empty");
  });

  it("comprehensive test with full order payload", () => {
    const mapping: Record<string, string> = {
      order_number: "order.name",
      total: "order.total_price",
      subtotal: "order.subtotal_price",
      tax: "order.total_tax",
      currency: "order.currency",
      status: "order.financial_status",
      customer_name: "order.customer.first_name",
      customer_email: "order.customer.email",
      billing_company: "order.billing_address.company",
      billing_address: "order.billing_address.address1",
      billing_city: "order.billing_address.city",
      shipping_address: "order.shipping_address.address1",
      first_item: "order.line_items[0].title",
      shipping_method: "order.shipping_lines[0].title",
      discount_code: "order.discount_codes[0].code",
      company_name: "static:DocuForge Inc.",
      generated_by: "static:Shopify Plugin v1.0",
    };

    const result = applyFieldMapping(mapping, sampleOrder);

    expect(result).toEqual({
      order_number: "#1001",
      total: "149.99",
      subtotal: "139.99",
      tax: "10.00",
      currency: "USD",
      status: "paid",
      customer_name: "John",
      customer_email: "john@example.com",
      billing_company: "Acme Corp",
      billing_address: "123 Main St",
      billing_city: "Portland",
      shipping_address: "456 Oak Ave",
      first_item: "Widget Pro",
      shipping_method: "Standard Shipping",
      discount_code: "SAVE10",
      company_name: "DocuForge Inc.",
      generated_by: "Shopify Plugin v1.0",
    });
  });

  it("returns undefined values for missing order fields", () => {
    const mapping: Record<string, string> = {
      missing: "order.nonexistent_field",
    };

    const result = applyFieldMapping(mapping, sampleOrder);

    expect(result.missing).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getGroupedFieldOptions
// ---------------------------------------------------------------------------

describe("getGroupedFieldOptions", () => {
  it("returns groups with correct structure", () => {
    const groups = getGroupedFieldOptions();

    expect(Array.isArray(groups)).toBe(true);
    expect(groups.length).toBeGreaterThan(0);

    for (const group of groups) {
      expect(group).toHaveProperty("title");
      expect(group).toHaveProperty("options");
      expect(typeof group.title).toBe("string");
      expect(Array.isArray(group.options)).toBe(true);

      for (const option of group.options) {
        expect(option).toHaveProperty("label");
        expect(option).toHaveProperty("value");
        expect(typeof option.label).toBe("string");
        expect(typeof option.value).toBe("string");
      }
    }
  });

  it("includes all expected categories", () => {
    const groups = getGroupedFieldOptions();
    const titles = groups.map((g) => g.title);

    expect(titles).toContain("Order");
    expect(titles).toContain("Pricing");
    expect(titles).toContain("Customer");
    expect(titles).toContain("Billing Address");
    expect(titles).toContain("Shipping Address");
    expect(titles).toContain("Line Items");
    expect(titles).toContain("Shipping");
    expect(titles).toContain("Discounts");
  });

  it("has the correct total number of options across all groups", () => {
    const groups = getGroupedFieldOptions();
    const totalOptions = groups.reduce((sum, g) => sum + g.options.length, 0);

    expect(totalOptions).toBe(SHOPIFY_FIELDS.length);
  });

  it("does not have duplicate options", () => {
    const groups = getGroupedFieldOptions();
    const allValues = groups.flatMap((g) => g.options.map((o) => o.value));
    const uniqueValues = new Set(allValues);

    expect(uniqueValues.size).toBe(allValues.length);
  });
});

// ---------------------------------------------------------------------------
// SHOPIFY_FIELDS
// ---------------------------------------------------------------------------

describe("SHOPIFY_FIELDS", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(SHOPIFY_FIELDS)).toBe(true);
    expect(SHOPIFY_FIELDS.length).toBeGreaterThan(0);
  });

  it("has entries for all major categories", () => {
    const categories = new Set(SHOPIFY_FIELDS.map((f) => f.category));

    expect(categories.has("Order")).toBe(true);
    expect(categories.has("Pricing")).toBe(true);
    expect(categories.has("Customer")).toBe(true);
    expect(categories.has("Billing Address")).toBe(true);
    expect(categories.has("Shipping Address")).toBe(true);
    expect(categories.has("Line Items")).toBe(true);
    expect(categories.has("Shipping")).toBe(true);
    expect(categories.has("Discounts")).toBe(true);
  });

  it("every field has label, value, and category", () => {
    for (const field of SHOPIFY_FIELDS) {
      expect(typeof field.label).toBe("string");
      expect(field.label.length).toBeGreaterThan(0);
      expect(typeof field.value).toBe("string");
      expect(field.value.length).toBeGreaterThan(0);
      expect(typeof field.category).toBe("string");
      expect(field.category.length).toBeGreaterThan(0);
    }
  });

  it("all field values start with 'order.'", () => {
    for (const field of SHOPIFY_FIELDS) {
      expect(field.value.startsWith("order.")).toBe(true);
    }
  });
});
