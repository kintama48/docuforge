import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../helpers/render";
import { screen } from "@testing-library/react";
import { TemplateSettingsDialog } from "@/src/components/editor/TemplateSettingsDialog";

describe("TemplateSettingsDialog", () => {
  it("renders delete action", () => {
    renderWithProviders(
      <TemplateSettingsDialog open={true} templateId="tpl_1" onClose={() => {}} />
    );
    expect(screen.getByText(/delete template/i)).toBeInTheDocument();
    expect(screen.getByText(/save/i)).toBeInTheDocument();
  });
});
