import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "@/tests/helpers/render";
import { DataEditor } from "@/src/components/editor/DataEditor";
import { useEditorStore } from "@/src/stores/editor";

vi.mock("next/dynamic", () => ({
  default: () => (props: any) => (
    <textarea
      data-testid="monaco"
      value={props.value}
      onChange={(event) => props.onChange?.(event.target.value)}
    />
  ),
}));

describe("DataEditor", () => {
  beforeEach(() => {
    useEditorStore.setState({
      dataString: "{}",
      dataError: "Invalid JSON",
      source: '#let data = sys.inputs\n#data.at("customer.name", default: "")',
      lowCodeSpec: null,
      setData: vi.fn(),
    } as any);
  });

  it("renders error state and calls setData", () => {
    renderWithProviders(<DataEditor />);

    expect(screen.getByText(/invalid json/i)).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("monaco"), {
      target: { value: "{ \"ok\": true }" },
    });
    const setData = useEditorStore.getState().setData as unknown as ReturnType<
      typeof vi.fn
    >;
    expect(setData).toHaveBeenCalledWith('{ "ok": true }');
  });

  it("generates sample JSON from detected dynamic fields", () => {
    renderWithProviders(<DataEditor />);

    fireEvent.click(screen.getByRole("button", { name: /generate sample json/i }));
    const setData = useEditorStore.getState().setData as unknown as ReturnType<
      typeof vi.fn
    >;
    expect(setData).toHaveBeenCalledWith(
      JSON.stringify({ customer: { name: "" } }, null, 2)
    );
  });
});
