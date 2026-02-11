import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../helpers/render";
import { fireEvent, screen } from "@testing-library/react";
import { TemplateSettingsDialog } from "@/src/components/editor/TemplateSettingsDialog";
import { useEditorStore } from "@/src/stores/editor";

const deleteMutate = vi.fn();
const updateMutate = vi.fn();

vi.mock("@/src/hooks/use-templates", () => ({
  useDeleteTemplate: () => ({ mutate: deleteMutate }),
  useUpdateTemplate: () => ({ mutate: updateMutate }),
}));

describe("TemplateSettingsDialog", () => {
  beforeEach(() => {
    deleteMutate.mockReset();
    updateMutate.mockReset();
    useEditorStore.setState({
      templateName: "Invoice",
      templateDescription: "Old desc",
      setTemplateName: vi.fn(),
      setTemplateDescription: vi.fn(),
    } as any);
  });

  it("renders delete action", () => {
    renderWithProviders(
      <TemplateSettingsDialog open={true} templateId="tpl_1" onClose={() => {}} />
    );
    expect(screen.getByText(/delete template/i)).toBeInTheDocument();
    expect(screen.getByText(/save/i)).toBeInTheDocument();
  });

  it("deletes templates when requested", () => {
    renderWithProviders(
      <TemplateSettingsDialog open={true} templateId="tpl_1" onClose={() => {}} />
    );
    fireEvent.click(screen.getByRole("button", { name: /delete template/i }));
    expect(deleteMutate).toHaveBeenCalled();
  });

  it("updates template settings on save", () => {
    const onClose = vi.fn();
    updateMutate.mockImplementation((_payload, options) => {
      options?.onSuccess?.({
        template: { name: "New name", description: "New desc" },
      });
    });

    renderWithProviders(
      <TemplateSettingsDialog open={true} templateId="tpl_1" onClose={onClose} />
    );

    fireEvent.change(screen.getByDisplayValue("Invoice"), {
      target: { value: "New name" },
    });
    fireEvent.change(screen.getByDisplayValue("Old desc"), {
      target: { value: "New desc" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(updateMutate).toHaveBeenCalledWith(
      { name: "New name", description: "New desc" },
      expect.any(Object)
    );
    const setTemplateName = useEditorStore.getState().setTemplateName as unknown as ReturnType<
      typeof vi.fn
    >;
    const setTemplateDescription = useEditorStore.getState()
      .setTemplateDescription as unknown as ReturnType<typeof vi.fn>;
    expect(setTemplateName).toHaveBeenCalledWith("New name");
    expect(setTemplateDescription).toHaveBeenCalledWith("New desc");
    expect(onClose).toHaveBeenCalled();
  });
});
