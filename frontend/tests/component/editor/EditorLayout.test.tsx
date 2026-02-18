import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "@/tests/helpers/render";
import { EditorLayout } from "@/src/components/editor/EditorLayout";
import { useEditorStore } from "@/src/stores/editor";

vi.mock("@/src/components/editor/FileExplorer", () => ({
  FileExplorer: () => <div data-testid="file-explorer" />,
}));
vi.mock("@/src/components/editor/AssetPanel", () => ({
  AssetPanel: () => <div data-testid="asset-panel" />,
}));
vi.mock("@/src/components/editor/MonacoEditor", () => ({
  MonacoEditor: () => <div data-testid="monaco-editor" />,
}));
vi.mock("@/src/components/editor/PdfPreview", () => ({
  PdfPreview: () => <div data-testid="pdf-preview" />,
}));
vi.mock("@/src/components/editor/DataEditor", () => ({
  DataEditor: () => <div data-testid="data-editor" />,
}));
vi.mock("@/src/components/editor/DiagnosticsPanel", () => ({
  DiagnosticsPanel: () => <div data-testid="diag-panel" />,
}));
vi.mock("@/src/components/editor/EditorToolbar", () => ({
  EditorPowerBar: () => <div data-testid="power-bar" />,
}));
vi.mock("@/src/components/editor/LowCodeBlocksPanel", () => ({
  LowCodeBlocksPanel: () => <div data-testid="low-code-blocks" />,
}));

beforeEach(() => {
  useEditorStore.setState({ insertSnippet: vi.fn() as any } as any);
});

describe("EditorLayout", () => {
  it("renders sidebar snippets and triggers insertSnippet", () => {
    const onTabChange = vi.fn();
    const onOpenAi = vi.fn();

    renderWithProviders(
      <EditorLayout
        activeTab="preview"
        onTabChange={onTabChange}
        showSidebar={true}
        showRightPane={true}
        onOpenAi={onOpenAi}
        editorMode="code"
        advancedTypstEnabled={false}
      />
    );

    fireEvent.click(screen.getByText(/Page setup/i));
    const insertSnippet = useEditorStore.getState().insertSnippet as unknown as ReturnType<
      typeof vi.fn
    >;
    expect(insertSnippet).toHaveBeenCalled();

    fireEvent.click(screen.getByText(/Data/i));
    expect(onTabChange).toHaveBeenCalledWith("data");
  });

  it("invokes all snippet actions and opens AI assistant", () => {
    const onTabChange = vi.fn();
    const onOpenAi = vi.fn();

    renderWithProviders(
      <EditorLayout
        activeTab="preview"
        onTabChange={onTabChange}
        showSidebar={true}
        showRightPane={true}
        onOpenAi={onOpenAi}
        editorMode="code"
        advancedTypstEnabled={false}
      />
    );

    const snippetLabels = [
      /page setup/i,
      /^table$/i,
      /^image$/i,
      /header\/footer/i,
      /for loop/i,
      /^date$/i,
    ];
    snippetLabels.forEach((label) => {
      fireEvent.click(screen.getByText(label));
    });

    const insertSnippet = useEditorStore.getState().insertSnippet as unknown as ReturnType<
      typeof vi.fn
    >;
    expect(insertSnippet).toHaveBeenCalledTimes(snippetLabels.length);

    fireEvent.click(screen.getByRole("button", { name: /documaster ai/i }));
    expect(onOpenAi).toHaveBeenCalled();
  });

  it("renders right pane tabs and hides sidebar when disabled", () => {
    const onTabChange = vi.fn();
    renderWithProviders(
      <EditorLayout
        activeTab="diag"
        onTabChange={onTabChange}
        showSidebar={false}
        showRightPane={true}
        onOpenAi={() => {}}
        editorMode="code"
        advancedTypstEnabled={false}
      />
    );

    expect(screen.queryByTestId("file-explorer")).not.toBeInTheDocument();
    expect(screen.getByTestId("diag-panel")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /preview/i }));
    expect(onTabChange).toHaveBeenCalledWith("preview");
  });

  it("omits the right pane when disabled", () => {
    renderWithProviders(
      <EditorLayout
        activeTab="preview"
        onTabChange={() => {}}
        showSidebar={true}
        showRightPane={false}
        onOpenAi={() => {}}
        editorMode="code"
        advancedTypstEnabled={false}
      />
    );

    expect(screen.queryByTestId("pdf-preview")).not.toBeInTheDocument();
    expect(screen.queryByTestId("data-editor")).not.toBeInTheDocument();
    expect(screen.queryByTestId("diag-panel")).not.toBeInTheDocument();
  });

  it("shows blocks panel in low-code mode", () => {
    renderWithProviders(
      <EditorLayout
        activeTab="blocks"
        onTabChange={() => {}}
        showSidebar={true}
        showRightPane={true}
        onOpenAi={() => {}}
        editorMode="low-code"
        advancedTypstEnabled={false}
      />
    );

    expect(screen.getByTestId("low-code-blocks")).toBeInTheDocument();
    expect(
      screen.getByText(/Blocks mode is active\. Use the Blocks tab/i)
    ).toBeInTheDocument();
  });
});
