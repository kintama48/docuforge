import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "@/tests/helpers/render";
import { EditorLayout } from "@/src/components/editor/EditorLayout";
import { useMediaQuery } from "@/src/hooks/use-media-query";
import { useEditorStore } from "@/src/stores/editor";

vi.mock("@/src/hooks/use-media-query", () => ({
  useMediaQuery: vi.fn(),
}));
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

const mockedUseMediaQuery = vi.mocked(useMediaQuery);

beforeEach(() => {
  mockedUseMediaQuery.mockReturnValue(true);
  useEditorStore.setState({ insertSnippet: vi.fn() as any } as any);
});

function renderEditorLayout(
  overrides: Partial<Parameters<typeof EditorLayout>[0]> = {}
) {
  const onTabChange = overrides.onTabChange ?? vi.fn();
  const onMobilePaneChange = overrides.onMobilePaneChange ?? vi.fn();
  const onOpenAi = overrides.onOpenAi ?? vi.fn();

  renderWithProviders(
    <EditorLayout
      activeTab="preview"
      onTabChange={onTabChange}
      mobilePane="editor"
      onMobilePaneChange={onMobilePaneChange}
      showSidebar={true}
      showRightPane={true}
      onOpenAi={onOpenAi}
      editorMode="code"
      advancedTypstEnabled={false}
      {...overrides}
    />
  );

  return { onTabChange, onMobilePaneChange, onOpenAi };
}

describe("EditorLayout", () => {
  it("renders desktop sidebar snippets and triggers insertSnippet", () => {
    const { onTabChange } = renderEditorLayout();

    fireEvent.click(screen.getByText(/Page setup/i));
    const insertSnippet = useEditorStore.getState().insertSnippet as unknown as ReturnType<
      typeof vi.fn
    >;
    expect(insertSnippet).toHaveBeenCalled();

    fireEvent.click(screen.getByText(/Data/i));
    expect(onTabChange).toHaveBeenCalledWith("data");
  });

  it("invokes all desktop snippet actions and opens AI assistant", () => {
    const { onOpenAi } = renderEditorLayout();

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

  it("renders desktop right pane tabs and hides sidebar when disabled", () => {
    const { onTabChange } = renderEditorLayout({
      activeTab: "diag",
      showSidebar: false,
    });

    expect(screen.queryByTestId("file-explorer")).not.toBeInTheDocument();
    expect(screen.getByTestId("diag-panel")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /preview/i }));
    expect(onTabChange).toHaveBeenCalledWith("preview");
  });

  it("omits the desktop right pane when disabled", () => {
    renderEditorLayout({
      showRightPane: false,
    });

    expect(screen.queryByTestId("pdf-preview")).not.toBeInTheDocument();
    expect(screen.queryByTestId("data-editor")).not.toBeInTheDocument();
    expect(screen.queryByTestId("diag-panel")).not.toBeInTheDocument();
  });

  it("renders mobile pane tabs and routes pane changes through responsive plumbing", () => {
    mockedUseMediaQuery.mockReturnValue(false);
    const { onTabChange, onMobilePaneChange } = renderEditorLayout({
      mobilePane: "editor",
    });

    expect(screen.getByRole("button", { name: /^Files$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Editor$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Preview$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Files$/i }));
    expect(onMobilePaneChange).toHaveBeenCalledWith("files");

    fireEvent.click(screen.getByRole("button", { name: /^Data$/i }));
    expect(onTabChange).toHaveBeenCalledWith("data");
    expect(onMobilePaneChange).toHaveBeenCalledWith("data");
  });

  it("shows blocks guidance and blocks panel in low-code desktop mode", () => {
    renderEditorLayout({
      activeTab: "blocks",
      mobilePane: "blocks",
      editorMode: "low-code",
    });

    expect(screen.getByTestId("low-code-blocks")).toBeInTheDocument();
    expect(
      screen.getByText(/Blocks mode is active\. Use the Blocks tab/i)
    ).toBeInTheDocument();
  });
});
