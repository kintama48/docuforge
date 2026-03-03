import { describe, expect, it } from "vitest";
import {
  buildSampleDataFromPaths,
  extractDynamicFieldPathsFromSource,
} from "@/src/lib/template-fields";

describe("template field helpers", () => {
  it("extracts fields from data.at, dotted data paths, and mustache", () => {
    const source = `
      #let data = sys.inputs
      #data.at("customer.name", default: "")
      #(data.invoice.number ?? "")
      {{ order.total }}
    `;
    expect(extractDynamicFieldPathsFromSource(source)).toEqual([
      "customer.name",
      "invoice.number",
      "order.total",
    ]);
  });

  it("builds nested sample JSON including array paths", () => {
    expect(
      buildSampleDataFromPaths(["customer.name", "invoice.id", "items[].name"])
    ).toEqual({
      customer: { name: "" },
      invoice: { id: "" },
      items: [{ name: "" }],
    });
  });
});
