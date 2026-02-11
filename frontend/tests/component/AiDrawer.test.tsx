import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders } from "../helpers/render";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { AiDrawer } from "@/src/components/editor/AiDrawer";
import { useEditorStore } from "@/src/stores/editor";
import { useAuthStore } from "@/src/stores/auth";

const aiEditMutate = vi.fn();
const aiGenerateMutate = vi.fn();
let editPending = false;
let generatePending = false;

vi.mock("@/src/hooks/use-ai", () => ({
  useAiEdit: () => ({ mutate: aiEditMutate, isPending: editPending }),
  useAiGenerate: () => ({ mutate: aiGenerateMutate, isPending: generatePending }),
}));

vi.mock("@/src/hooks/use-assets", () => ({
  useAssets: () => ({ data: { assets: [{ name: "logo.png" }] } }),
}));

vi.mock("@/src/components/ai/AiResponseView", () => ({
  AiResponseView: ({ response, onApply, onDiscard }: any) =>
    response ? (
      <div>
        <button onClick={onApply}>Apply response</button>
        <button onClick={onDiscard}>Discard response</button>
      </div>
    ) : null,
}));

vi.mock("@/src/components/ai/AiImageUpload", () => ({
  AiImageUpload: ({ onUpload, disabled }: any) => (
    <button type="button" disabled={disabled} onClick={() => onUpload("base64")}>
      Upload screenshot
    </button>
  ),
}));

beforeEach(() => {
  aiEditMutate.mockReset();
  aiGenerateMutate.mockReset();
  editPending = false;
  generatePending = false;
  useEditorStore.setState({
    source: "#set page()",
    setSource: vi.fn(),
    editorInstance: {
      getSelection: vi.fn(() => ({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 5,
      })),
      getModel: () => ({ getValueInRange: () => "Selection" }),
    },
  } as any);
  useAuthStore.setState({ user: { plan: "free" } } as any);
});

describe("AiDrawer", () => {
  it("does not render when closed", () => {
    renderWithProviders(<AiDrawer open={false} onClose={() => {}} />);
    expect(screen.queryByText(/ai assistant/i)).not.toBeInTheDocument();
  });

  it("skips sending empty prompts", () => {
    renderWithProviders(<AiDrawer open={true} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(aiEditMutate).not.toHaveBeenCalled();
  });

  it("sends prompt with selection and applies response", async () => {
    const setSource = useEditorStore.getState().setSource as unknown as ReturnType<
      typeof vi.fn
    >;
    aiEditMutate.mockImplementation((_payload, options) => {
      options?.onSuccess?.({
        code: "#set page(paper: \"a4\")",
        credits: { remaining: 4, limit: 10, resetAt: null },
      });
    });

    renderWithProviders(<AiDrawer open={true} onClose={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/describe what you want/i), {
      target: { value: "Add a header" },
    });
    fireEvent.click(screen.getByLabelText(/include selection/i));
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(aiEditMutate).toHaveBeenCalled());
    const [payload] = aiEditMutate.mock.calls[0];
    expect(payload).toEqual(
      expect.objectContaining({
        prompt: "Add a header",
        current_code: "Selection",
        asset_names: ["logo.png"],
      })
    );

    fireEvent.click(screen.getByRole("button", { name: /apply response/i }));
    expect(setSource).toHaveBeenCalledWith("#set page(paper: \"a4\")");
  });

  it("updates credits after retryable errors", async () => {
    aiEditMutate.mockImplementation((_payload, options) => {
      options?.onError?.({ details: { retryAfter: 2 } });
    });
    renderWithProviders(<AiDrawer open={true} onClose={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/describe what you want/i), {
      target: { value: "Add a header" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /credits exhausted/i })).toBeDisabled()
    );
  });

  it("handles image uploads and discarding responses", async () => {
    aiGenerateMutate.mockImplementation((_payload, options) => {
      options?.onSuccess?.({
        code: "#set page()",
        credits: { remaining: 2, limit: 10, resetAt: null },
      });
    });
    renderWithProviders(<AiDrawer open={true} onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /upload screenshot/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /discard response/i })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: /discard response/i }));
    expect(
      screen.queryByRole("button", { name: /discard response/i })
    ).not.toBeInTheDocument();
  });
});
