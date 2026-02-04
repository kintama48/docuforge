import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../helpers/render";
import { screen, fireEvent } from "@testing-library/react";
import { CreateTemplateDialog } from "@/src/components/dashboard/CreateTemplateDialog";

describe("CreateTemplateDialog", () => {
  it("disables create until name is provided", () => {
    renderWithProviders(
      <CreateTemplateDialog open={true} onClose={() => {}} />
    );
    const button = screen.getByRole("button", { name: /create/i });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/invoice template/i), {
      target: { value: "Invoice" },
    });
    expect(button).not.toBeDisabled();
  });
});
