import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/tests/helpers/render";
import { EditorToolbar, EditorPowerBar } from "@/src/components/editor/EditorToolbar";
import { useEditorStore } from "@/src/stores/editor";

const applyAction = vi.fn();

vi.mock("@/src/hooks/use-monaco-formatting", () => ({
  useMonacoFormatting: () => ({ applyAction, ready: true }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("EditorPowerBar", () => {
  it("invokes applyAction when clicking toolbar buttons", () => {
    renderWithProviders(<EditorPowerBar />);

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    expect(applyAction).toHaveBeenCalled();
  });
});

describe("EditorToolbar", () => {
  beforeEach(() => {
    useEditorStore.setState({
      templateName: "Sample",
      isDirty: false,
      publishedVersion: 1,
      pdfBlob: new Blob(["pdf"], { type: "application/pdf" }),
    } as any);
  });

  it("opens menu and triggers actions", async () => {
    const onPublish = vi.fn();
    const onOpenHistory = vi.fn();
    const onOpenShortcuts = vi.fn();
    const onOpenSettings = vi.fn();
    const onFork = vi.fn();
    const onToggleAutoRender = vi.fn();

    renderWithProviders(
      <EditorToolbar
        onPublish={onPublish}
        onOpenHistory={onOpenHistory}
        onOpenShortcuts={onOpenShortcuts}
        onOpenSettings={onOpenSettings}
        onFork={onFork}
        onToggleAutoRender={onToggleAutoRender}
        autoRender={true}
        isLowCodeMode={false}
        advancedTypstEnabled={false}
        onToggleAdvancedTypst={() => {}}
        onOpenBlocks={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId("editor-more-menu"));
    await waitFor(() =>
      expect(screen.getByTestId("editor-open-history")).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId("editor-open-history"));
    expect(onOpenHistory).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("editor-more-menu"));
    await waitFor(() =>
      expect(screen.getByText(/auto render/i)).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText(/auto render/i));
    expect(onToggleAutoRender).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("editor-more-menu"));
    await waitFor(() =>
      expect(screen.getByText(/fork template/i)).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText(/fork template/i));
    expect(onFork).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("editor-more-menu"));
    await waitFor(() =>
      expect(screen.getByText(/template settings/i)).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText(/template settings/i));
    expect(onOpenSettings).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("editor-more-menu"));
    await waitFor(() =>
      expect(screen.getByText(/keyboard shortcuts/i)).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText(/keyboard shortcuts/i));
    expect(onOpenShortcuts).toHaveBeenCalled();
  });

  it("downloads a PDF when available", () => {
    const onPublish = vi.fn();
    const onOpenHistory = vi.fn();
    const onOpenShortcuts = vi.fn();
    const onOpenSettings = vi.fn();
    const onFork = vi.fn();
    const onToggleAutoRender = vi.fn();

    const click = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const createSpy = vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const element = originalCreateElement(tag);
      if (tag === "a") {
        (element as HTMLAnchorElement).click = click;
      }
      return element;
    });
    const urlSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:pdf");
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    renderWithProviders(
      <EditorToolbar
        onPublish={onPublish}
        onOpenHistory={onOpenHistory}
        onOpenShortcuts={onOpenShortcuts}
        onOpenSettings={onOpenSettings}
        onFork={onFork}
        onToggleAutoRender={onToggleAutoRender}
        autoRender={false}
        isLowCodeMode={false}
        advancedTypstEnabled={false}
        onToggleAdvancedTypst={() => {}}
        onOpenBlocks={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /download pdf/i }));
    expect(urlSpy).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalled();

    createSpy.mockRestore();
    urlSpy.mockRestore();
    revokeSpy.mockRestore();
  });

  it("handles publish and draft status", () => {
    useEditorStore.setState({
      templateName: "",
      isDirty: true,
      publishedVersion: null,
      pdfBlob: null,
    } as any);

    const onPublish = vi.fn();
    renderWithProviders(
      <EditorToolbar
        onPublish={onPublish}
        onOpenHistory={() => {}}
        onOpenShortcuts={() => {}}
        onOpenSettings={() => {}}
        onFork={() => {}}
        onToggleAutoRender={() => {}}
        autoRender={false}
        isLowCodeMode={false}
        advancedTypstEnabled={false}
        onToggleAdvancedTypst={() => {}}
        onOpenBlocks={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /publish/i }));
    expect(onPublish).toHaveBeenCalled();
    expect(screen.getByText(/untitled/i)).toBeInTheDocument();
    expect(screen.getByText(/draft/i)).toBeInTheDocument();
  });

  it("prevents downloads when pdf is missing", () => {
    useEditorStore.setState({ pdfBlob: null } as any);
    const createSpy = vi.spyOn(URL, "createObjectURL");

    renderWithProviders(
      <EditorToolbar
        onPublish={() => {}}
        onOpenHistory={() => {}}
        onOpenShortcuts={() => {}}
        onOpenSettings={() => {}}
        onFork={() => {}}
        onToggleAutoRender={() => {}}
        autoRender={true}
        isLowCodeMode={false}
        advancedTypstEnabled={false}
        onToggleAdvancedTypst={() => {}}
        onOpenBlocks={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /download pdf/i }));
    expect(createSpy).not.toHaveBeenCalled();
    createSpy.mockRestore();
  });

  it("shows auto-render off state in menu", async () => {
    renderWithProviders(
      <EditorToolbar
        onPublish={() => {}}
        onOpenHistory={() => {}}
        onOpenShortcuts={() => {}}
        onOpenSettings={() => {}}
        onFork={() => {}}
        onToggleAutoRender={() => {}}
        autoRender={false}
        isLowCodeMode={false}
        advancedTypstEnabled={false}
        onToggleAdvancedTypst={() => {}}
        onOpenBlocks={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId("editor-more-menu"));
    await waitFor(() =>
      expect(screen.getByText(/auto render: off/i)).toBeInTheDocument()
    );
  });

  it("shows advanced typst toggle in low-code mode", () => {
    const onToggleAdvancedTypst = vi.fn();

    renderWithProviders(
      <EditorToolbar
        onPublish={() => {}}
        onOpenHistory={() => {}}
        onOpenShortcuts={() => {}}
        onOpenSettings={() => {}}
        onFork={() => {}}
        onToggleAutoRender={() => {}}
        autoRender={false}
        isLowCodeMode={true}
        advancedTypstEnabled={false}
        onToggleAdvancedTypst={onToggleAdvancedTypst}
        onOpenBlocks={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /advanced typst: off/i }));
    expect(onToggleAdvancedTypst).toHaveBeenCalled();
  });

  it("opens blocks from toolbar in low-code mode", () => {
    const onOpenBlocks = vi.fn();

    renderWithProviders(
      <EditorToolbar
        onPublish={() => {}}
        onOpenHistory={() => {}}
        onOpenShortcuts={() => {}}
        onOpenSettings={() => {}}
        onFork={() => {}}
        onToggleAutoRender={() => {}}
        autoRender={false}
        isLowCodeMode={true}
        advancedTypstEnabled={false}
        onToggleAdvancedTypst={() => {}}
        onOpenBlocks={onOpenBlocks}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /^blocks$/i }));
    expect(onOpenBlocks).toHaveBeenCalled();
  });
});
