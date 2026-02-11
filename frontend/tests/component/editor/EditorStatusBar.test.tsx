import { describe, it, expect, beforeEach } from "vitest";
import { renderWithProviders } from "@/tests/helpers/render";
import { EditorStatusBar } from "@/src/components/editor/EditorStatusBar";
import { useEditorStore } from "@/src/stores/editor";

beforeEach(() => {
  useEditorStore.setState({
    renderDuration: 150,
    renderError: null,
    isDirty: false,
    readOnly: false,
    publishedVersion: 2,
    viewingVersion: null,
    cursorPosition: { line: 3, column: 5 },
  } as any);
});

describe("EditorStatusBar", () => {
  it("renders status, cursor, and duration", () => {
    const { getByText } = renderWithProviders(<EditorStatusBar />);
    expect(getByText(/Published v2/i)).toBeInTheDocument();
    expect(getByText(/Ln 3, Col 5/i)).toBeInTheDocument();
    expect(getByText(/Rendered in 150ms/i)).toBeInTheDocument();
  });

  it("shows viewing status when viewingVersion is set", () => {
    useEditorStore.setState({ viewingVersion: 7 } as any);
    const { getByText } = renderWithProviders(<EditorStatusBar />);
    expect(getByText(/Viewing v7/i)).toBeInTheDocument();
  });

  it("shows read-only and idle status with no cursor", () => {
    useEditorStore.setState({
      renderDuration: null,
      renderError: null,
      isDirty: false,
      readOnly: true,
      publishedVersion: null,
      viewingVersion: null,
      cursorPosition: null,
    } as any);
    const { getByText } = renderWithProviders(<EditorStatusBar />);
    expect(getByText(/read-only/i)).toBeInTheDocument();
    expect(getByText(/ln —, col —/i)).toBeInTheDocument();
    expect(getByText(/idle/i)).toBeInTheDocument();
  });

  it("shows draft and error status", () => {
    useEditorStore.setState({
      renderDuration: null,
      renderError: { message: "Bad", file: "main.typ", line: 1, column: 1 },
      isDirty: true,
      readOnly: false,
      publishedVersion: null,
      viewingVersion: null,
      cursorPosition: { line: 1, column: 2 },
    } as any);
    const { getByText } = renderWithProviders(<EditorStatusBar />);
    expect(getByText(/draft/i)).toBeInTheDocument();
    expect(getByText(/error/i)).toBeInTheDocument();
  });
});
