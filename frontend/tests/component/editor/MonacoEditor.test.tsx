import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders } from "@/tests/helpers/render";
import { MonacoEditor } from "@/src/components/editor/MonacoEditor";
import { useEditorStore } from "@/src/stores/editor";

const typstMocks = vi.hoisted(() => ({
  registerTypstLanguage: vi.fn(),
  registerTypstCompletions: vi.fn(),
}));

const decorationMocks = vi.hoisted(() => ({
  buildTypstDecorations: vi.fn(() => []),
}));

vi.mock("@/src/lib/typst", () => typstMocks);
vi.mock("@/src/lib/typst-decorations", () => decorationMocks);

vi.mock("@/src/hooks/use-assets", () => ({
  useAssets: () => ({ data: { assets: [{ name: "logo.png" }] } }),
}));

let mountTwice = false;
let changeValue: any = "Updated";

vi.mock("next/dynamic", () => ({
  default: () => {
    return function MonacoMock(props: any) {
      if (props.beforeMount) {
        props.beforeMount(monacoStub);
        if (mountTwice) {
          props.beforeMount(monacoStub);
        }
      }
      if (props.onMount) {
        props.onMount(editorStub, monacoStub);
        if (mountTwice) {
          props.onMount(editorStub, monacoStub);
        }
      }
      if (props.onChange) {
        props.onChange(changeValue);
      }
      return <div data-testid="monaco" />;
    };
  },
}));

let editorStub: any;
let monacoStub: any;
let cursorDispose: ReturnType<typeof vi.fn>;
let decorationDispose: ReturnType<typeof vi.fn>;
let completionDispose: ReturnType<typeof vi.fn>;

describe("MonacoEditor", () => {
  beforeEach(() => {
    mountTwice = false;
    changeValue = "Updated";
    typstMocks.registerTypstLanguage.mockClear();
    typstMocks.registerTypstCompletions.mockClear();
    decorationMocks.buildTypstDecorations.mockClear();
    cursorDispose = vi.fn();
    decorationDispose = vi.fn();
    completionDispose = vi.fn();
    editorStub = {
      getModel: () => ({}),
      onDidChangeCursorPosition: vi.fn((cb: any) => {
        cb({ position: { lineNumber: 4, column: 2 } });
        return { dispose: cursorDispose };
      }),
      onDidChangeModelContent: vi.fn((cb: any) => {
        cb();
        return { dispose: decorationDispose };
      }),
      deltaDecorations: vi.fn(() => []),
      revealPositionInCenter: vi.fn(),
    };
    monacoStub = {
      editor: { setModelMarkers: vi.fn() },
      MarkerSeverity: { Error: 8 },
    };
    typstMocks.registerTypstCompletions.mockReturnValue({
      dispose: completionDispose,
    });

    useEditorStore.setState({
      activeFile: "main.typ",
      source: "Hello",
      files: {},
      data: {},
      readOnly: false,
      renderError: { message: "Bad", file: "main.typ", line: 2, column: 1 },
      setEditorInstance: vi.fn(),
      setCursorPosition: vi.fn(),
      setSource: vi.fn(),
      setFileContent: vi.fn(),
    } as any);
  });

  it("registers language and updates source", () => {
    renderWithProviders(<MonacoEditor />);

    expect(typstMocks.registerTypstLanguage).toHaveBeenCalled();
    expect(typstMocks.registerTypstCompletions).toHaveBeenCalled();
    expect(useEditorStore.getState().setSource).toHaveBeenCalledWith("Updated");
    expect(monacoStub.editor.setModelMarkers).toHaveBeenCalled();
  });

  it("updates file content for non-main files", () => {
    useEditorStore.setState({ activeFile: "notes.typ" } as any);
    renderWithProviders(<MonacoEditor />);
    expect(useEditorStore.getState().setFileContent).toHaveBeenCalledWith(
      "notes.typ",
      "Updated"
    );
  });

  it("does not update source when read-only", () => {
    useEditorStore.setState({ readOnly: true } as any);
    renderWithProviders(<MonacoEditor />);
    expect(useEditorStore.getState().setSource).not.toHaveBeenCalled();
  });

  it("clears markers when render error is null", () => {
    useEditorStore.setState({
      renderError: null,
    } as any);
    renderWithProviders(<MonacoEditor />);
    expect(monacoStub.editor.setModelMarkers).toHaveBeenCalledWith(
      expect.anything(),
      "typst",
      []
    );
  });

  it("updates cursor position and decorations", () => {
    renderWithProviders(<MonacoEditor />);
    expect(useEditorStore.getState().setCursorPosition).toHaveBeenCalledWith(4, 2);
    expect(decorationMocks.buildTypstDecorations).toHaveBeenCalled();
  });

  it("disposes listeners on unmount", () => {
    const { unmount } = renderWithProviders(<MonacoEditor />);
    unmount();
    expect(cursorDispose).toHaveBeenCalled();
    expect(decorationDispose).toHaveBeenCalled();
  });

  it("disposes completion provider on re-mount", () => {
    const { rerender } = renderWithProviders(<MonacoEditor />);
    rerender(<MonacoEditor />);
    expect(completionDispose).toHaveBeenCalled();
  });

  it("handles missing editor model without decorations", () => {
    editorStub.getModel = () => null;
    renderWithProviders(<MonacoEditor />);
    expect(decorationMocks.buildTypstDecorations).not.toHaveBeenCalled();
  });

  it("disposes providers and listeners when mounted twice", () => {
    mountTwice = true;
    renderWithProviders(<MonacoEditor />);
    expect(completionDispose).toHaveBeenCalled();
    expect(cursorDispose).toHaveBeenCalled();
    expect(decorationDispose).toHaveBeenCalled();
  });

  it("uses empty string when change value is null", () => {
    changeValue = null;
    const setSource = vi.fn();
    useEditorStore.setState({ setSource } as any);
    renderWithProviders(<MonacoEditor />);
    expect(setSource).toHaveBeenCalledWith("");
  });
});
