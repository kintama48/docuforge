import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../helpers/render";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { AiDrawer } from "@/src/components/editor/AiDrawer";

describe("AiDrawer", () => {
  it("sends prompt and shows response", async () => {
    renderWithProviders(<AiDrawer open={true} onClose={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/describe what you want/i), {
      target: { value: "Add a header" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() =>
      expect(screen.getByText(/ai response/i)).toBeInTheDocument()
    );
    const responses = screen.getAllByText(/#set page/i);
    expect(responses.length).toBeGreaterThan(0);
  });
});
