import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { AiImageUpload } from "@/src/components/ai/AiImageUpload";

describe("AiImageUpload", () => {
  it("uploads image and calls handler", async () => {
    const onUpload = vi.fn();
    renderWithProviders(<AiImageUpload onUpload={onUpload} />);

    const file = new File(["hello"], "test.png", { type: "image/png" });
    const input = screen.getByLabelText(/upload screenshot/i);

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(onUpload).toHaveBeenCalled());
  });
});
