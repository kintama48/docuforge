import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { TemplateSwitcher, type TemplateSwitcherTemplate } from "@/src/components/TemplateSwitcher";

const officialTemplatesResponse = {
  templates: [
    {
      id: "freight-invoice",
      name: "Freight Invoice",
      description: "Lane billing template",
      preview_url: null,
      slug: "freight-invoice-template",
    },
    {
      id: "shopify-invoice",
      name: "Shopify Invoice",
      description: "Commerce invoice template",
      preview_url: null,
      slug: "shopify-invoice-template",
    },
  ],
};

const templates: TemplateSwitcherTemplate[] = [
  {
    id: "freight-invoice",
    name: "Freight Invoice",
    description: "Lane billing template",
    slug: "freight-invoice-template",
  },
  {
    id: "shopify-invoice",
    name: "Shopify Invoice",
    description: "Commerce invoice template",
    slug: "shopify-invoice-template",
  },
];

function renderSwitcher(props?: {
  activeTemplateId?: string;
  hasUnsavedChanges?: boolean;
  onSelectTemplate?: (template: TemplateSwitcherTemplate) => void;
}) {
  return renderWithProviders(
    <TemplateSwitcher
      activeTemplateId={props?.activeTemplateId ?? "freight-invoice"}
      templates={templates}
      hasUnsavedChanges={props?.hasUnsavedChanges ?? false}
      onSelectTemplate={props?.onSelectTemplate ?? vi.fn()}
    />
  );
}

describe("TemplateSwitcher", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(officialTemplatesResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders templates from the public catalog", async () => {
    renderSwitcher();

    fireEvent.click(screen.getByRole("button", { name: /expand template switcher/i }));

    expect(await screen.findByRole("button", { name: /freight invoice/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /shopify invoice/i })).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/templates/official")
    );
  });

  it("filters expanded template rows by search", async () => {
    renderSwitcher();

    fireEvent.click(screen.getByRole("button", { name: /expand template switcher/i }));
    await screen.findByRole("button", { name: /freight invoice/i });

    fireEvent.change(screen.getByPlaceholderText(/search templates/i), {
      target: { value: "shopify" },
    });

    expect(screen.queryByRole("button", { name: /freight invoice/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /shopify invoice/i })).toBeInTheDocument();
  });

  it("confirms before switching away from unsaved changes", async () => {
    const onSelectTemplate = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderSwitcher({ hasUnsavedChanges: true, onSelectTemplate });

    fireEvent.click(screen.getByRole("button", { name: /expand template switcher/i }));
    fireEvent.click(await screen.findByRole("button", { name: /shopify invoice/i }));

    expect(confirmSpy).toHaveBeenCalledWith(
      "You have unsaved changes. Switch template anyway?"
    );
    expect(onSelectTemplate).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: /shopify invoice/i }));

    expect(onSelectTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "shopify-invoice",
      })
    );
  });

  it("persists collapse state in localStorage", async () => {
    const { unmount } = renderSwitcher();

    fireEvent.click(screen.getByRole("button", { name: /expand template switcher/i }));

    await waitFor(() => {
      expect(localStorage.getItem("docuforge_sidebar_expanded")).toBe("true");
    });

    unmount();
    renderSwitcher();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /collapse template switcher/i })).toBeInTheDocument();
    });
  });

  it("selects the highlighted command-palette template with the keyboard", async () => {
    const onSelectTemplate = vi.fn();
    renderSwitcher({ onSelectTemplate });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/templates/official")
      );
    });

    act(() => {
      fireEvent.keyDown(window, { key: "p", metaKey: true });
    });

    const dialog = screen.getByRole("dialog", { name: /template command palette/i });
    const input = within(dialog).getByPlaceholderText(/search templates/i);

    fireEvent.change(input, { target: { value: "shopify" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSelectTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "shopify-invoice" })
    );
    expect(screen.queryByRole("dialog", { name: /template command palette/i })).not.toBeInTheDocument();
  });

  it("closes the command palette with Escape", async () => {
    renderSwitcher();

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/templates/official")
      );
    });

    act(() => {
      fireEvent.keyDown(window, { key: "p", ctrlKey: true });
    });
    expect(screen.getByRole("dialog", { name: /template command palette/i })).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });

    expect(screen.queryByRole("dialog", { name: /template command palette/i })).not.toBeInTheDocument();
  });
});
