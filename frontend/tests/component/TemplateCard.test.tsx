import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { TemplateCard } from "@/src/components/dashboard/TemplateCard";

const template = {
  id: "tpl_1",
  name: "Invoice",
  description: "Invoice template",
  is_official: true,
  live_version: {
    id: "ver_1",
    version_number: 2,
    source: "",
    files: null,
    defaults: null,
    commit_message: null,
    created_at: 1738377600,
  },
  created_at: 1738377600,
  updated_at: 1738377600,
};

describe("TemplateCard", () => {
  it("renders template name and version", () => {
    renderWithProviders(<TemplateCard template={template} />);
    expect(screen.getByText("Invoice")).toBeInTheDocument();
    expect(screen.getByText(/v2/i)).toBeInTheDocument();
  });

  it("shows official badge for system templates", () => {
    renderWithProviders(<TemplateCard template={template} />);
    expect(screen.getByText(/official/i)).toBeInTheDocument();
  });
});
