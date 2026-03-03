import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "@/tests/helpers/render";
import { DocuMasterWidget } from "@/src/components/editor/DocuMasterWidget";
import { useEditorStore } from "@/src/stores/editor";

const mutate = vi.fn();
let isPending = false;

vi.mock("@/src/hooks/use-ai", () => ({
  useAiEdit: () => ({
    mutate,
    isPending,
  }),
}));

vi.mock("@/src/hooks/use-assets", () => ({
  useAssets: () => ({ data: { assets: [{ name: "logo.png" }] } }),
}));

describe("DocuMasterWidget", () => {
  beforeEach(() => {
    mutate.mockReset();
    isPending = false;
    sessionStorage.clear();
    useEditorStore.setState({
      source: "#set page()",
      setSource: vi.fn(),
    } as any);
  });

  it("toggles from the right-side widget button", () => {
    const onToggle = vi.fn();

    renderWithProviders(
      <DocuMasterWidget open={false} onToggle={onToggle} onClose={() => {}} />
    );

    fireEvent.click(screen.getByRole("button", { name: /open documaster/i }));
    expect(onToggle).toHaveBeenCalled();
  });

  it("sends prompt and applies returned code", () => {
    mutate.mockImplementation((_payload, options) => {
      options?.onSuccess?.({
        code: "#set page(paper: \"a4\")",
        credits: { remaining: 4, limit: 5, resetAt: null },
      });
    });

    renderWithProviders(
      <DocuMasterWidget open={true} onToggle={() => {}} onClose={() => {}} />
    );

    fireEvent.change(
      screen.getByPlaceholderText(/describe the change you want in this template/i),
      { target: { value: "make this A4" } }
    );
    fireEvent.click(screen.getByRole("button", { name: /^apply$/i }));

    expect(mutate).toHaveBeenCalledWith(
      {
        prompt: "make this A4",
        current_code: "#set page()",
        asset_names: ["logo.png"],
      },
      expect.any(Object)
    );
    const setSource = useEditorStore.getState().setSource as unknown as ReturnType<
      typeof vi.fn
    >;
    expect(setSource).toHaveBeenCalledWith('#set page(paper: "a4")');
  });

  it("closes prompt bar", () => {
    const onClose = vi.fn();
    renderWithProviders(
      <DocuMasterWidget open={true} onToggle={() => {}} onClose={onClose} />
    );

    fireEvent.click(screen.getByRole("button", { name: /^close$/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows a first-load hint and dismisses it", () => {
    renderWithProviders(
      <DocuMasterWidget open={false} onToggle={() => {}} onClose={() => {}} />
    );

    expect(
      screen.getByText(/ask for edits in plain english/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /dismiss hint/i }));
    expect(
      screen.queryByText(/ask for edits in plain english/i)
    ).not.toBeInTheDocument();
  });
});
