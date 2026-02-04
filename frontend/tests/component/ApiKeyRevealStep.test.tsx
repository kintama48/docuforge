import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { ApiKeyRevealStep } from "@/src/components/onboarding/ApiKeyRevealStep";

describe("ApiKeyRevealStep", () => {
  it("renders api key and copies", () => {
    const writeText = vi.spyOn(navigator.clipboard, "writeText");

    renderWithProviders(
      <ApiKeyRevealStep apiKey="docu_live_test_123" onContinue={vi.fn()} />
    );

    expect(screen.getByText(/docu_live_test_123/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    expect(writeText).toHaveBeenCalled();
  });
});
