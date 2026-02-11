import { describe, it, expect, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { QuickStartGuide } from "@/src/components/settings/QuickStartGuide";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("QuickStartGuide", () => {
  it("switches tabs and copies snippets", () => {
    const clipboardSpy = vi.spyOn(navigator.clipboard, "writeText");
    renderWithProviders(<QuickStartGuide apiKey="docu_live_123" />);

    expect(screen.getByText(/curl -x post/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /node\.js/i }));
    expect(screen.getByText(/node-fetch/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /python/i }));
    expect(screen.getByText(/requests\.post/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^go$/i }));
    expect(screen.getByText(/package main/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    expect(clipboardSpy).toHaveBeenCalled();

    clipboardSpy.mockRestore();
  });
});
