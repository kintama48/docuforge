import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "@/tests/helpers/render";
import { AssetPanel } from "@/src/components/editor/AssetPanel";
import { useEditorStore } from "@/src/stores/editor";

const uploadMutate = vi.fn();
const deleteMutate = vi.fn();
let assetsData: any = {
  assets: [
    {
      id: "asset-1",
      name: "logo.png",
      mime_type: "image/png",
      size_bytes: 1024,
    },
    {
      id: "asset-2",
      name: "brand.ttf",
      mime_type: "font/ttf",
      size_bytes: 2048,
    },
  ],
};

vi.mock("@/src/hooks/use-assets", () => ({
  useAssets: () => ({ data: assetsData }),
  useUploadAsset: () => ({ mutate: uploadMutate }),
  useDeleteAsset: () => ({ mutate: deleteMutate }),
}));

let dragActive = false;

vi.mock("react-dropzone", () => ({
  useDropzone: () => ({
    getRootProps: () => ({ "data-testid": "dropzone" }),
    getInputProps: () => ({}),
    isDragActive: dragActive,
  }),
}));

describe("AssetPanel", () => {
  beforeEach(() => {
    useEditorStore.setState({ insertSnippet: vi.fn() as any });
    deleteMutate.mockClear();
    // jsdom defines confirm but throws; override it for the test.
    window.confirm = vi.fn(() => true);
    dragActive = false;
    assetsData = {
      assets: [
        {
          id: "asset-1",
          name: "logo.png",
          mime_type: "image/png",
          size_bytes: 1024,
        },
        {
          id: "asset-2",
          name: "brand.ttf",
          mime_type: "font/ttf",
          size_bytes: 2048,
        },
        {
          id: "asset-3",
          name: "doc.pdf",
          mime_type: "application/pdf",
          size_bytes: 512,
        },
      ],
    };
  });

  it("renders assets and inserts snippets", () => {
    renderWithProviders(<AssetPanel />);

    fireEvent.click(screen.getByText("logo.png"));
    const insertSnippet = useEditorStore.getState().insertSnippet as unknown as ReturnType<
      typeof vi.fn
    >;
    expect(insertSnippet).toHaveBeenCalledWith('#image("logo.png")');

    fireEvent.click(screen.getByText("brand.ttf"));
    expect(insertSnippet).toHaveBeenCalledWith('#set text(font: "brand")');

    fireEvent.click(screen.getByText("doc.pdf"));
    expect(insertSnippet).toHaveBeenCalledWith('#image("doc.pdf")');
  });

  it("deletes assets when confirmed", () => {
    renderWithProviders(<AssetPanel />);

    const deleteButtons = screen.getAllByText(/delete/i);
    fireEvent.click(deleteButtons[0]);

    expect(deleteMutate).toHaveBeenCalledWith("asset-1");
  });

  it("does not delete when confirm is cancelled", () => {
    window.confirm = vi.fn(() => false);
    renderWithProviders(<AssetPanel />);
    fireEvent.click(screen.getAllByText(/delete/i)[0]);
    expect(deleteMutate).not.toHaveBeenCalled();
  });

  it("renders empty state when no assets", () => {
    assetsData = { assets: [] };
    renderWithProviders(<AssetPanel />);
    expect(screen.getByText(/no assets/i)).toBeInTheDocument();
  });

  it("shows drag active state", () => {
    dragActive = true;
    renderWithProviders(<AssetPanel />);
    expect(screen.getByText(/drop/i)).toBeInTheDocument();
  });
});
