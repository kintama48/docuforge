import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../helpers/render";
import { screen, fireEvent } from "@testing-library/react";
import { CreateTemplateDialog } from "@/src/components/dashboard/CreateTemplateDialog";
import { DEFAULT_TEMPLATE_DEFAULTS, DEFAULT_TEMPLATE_SOURCE } from "@/src/lib/template-defaults";

const createMutate = vi.fn();
const forkMutate = vi.fn();
let templatesData = {
  templates: [
    {
      id: "tpl_official",
      name: "Official",
      is_official: true,
    },
  ],
};

vi.mock("@/src/hooks/use-templates", () => ({
  useTemplates: () => ({ data: templatesData }),
  useCreateTemplate: () => ({ mutate: createMutate, isPending: false }),
  useForkTemplate: () => ({ mutate: forkMutate, isPending: false }),
}));

describe("CreateTemplateDialog", () => {
  beforeEach(() => {
    createMutate.mockReset();
    forkMutate.mockReset();
  });

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

  it("creates a blank template when starter is blank", () => {
    renderWithProviders(
      <CreateTemplateDialog open={true} onClose={() => {}} />
    );
    fireEvent.change(screen.getByPlaceholderText(/invoice template/i), {
      target: { value: "Invoice" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    expect(createMutate).toHaveBeenCalledWith(
      {
        name: "Invoice",
        description: null,
        source: DEFAULT_TEMPLATE_SOURCE,
        defaults: DEFAULT_TEMPLATE_DEFAULTS,
        files: {},
      },
      expect.any(Object)
    );
  });

  it("forks an official template when selected", () => {
    renderWithProviders(
      <CreateTemplateDialog open={true} onClose={() => {}} />
    );

    fireEvent.change(screen.getByPlaceholderText(/invoice template/i), {
      target: { value: "Forked" },
    });
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "tpl_official" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    expect(forkMutate).toHaveBeenCalledWith(
      { id: "tpl_official", name: "Forked" },
      expect.any(Object)
    );
  });
});
