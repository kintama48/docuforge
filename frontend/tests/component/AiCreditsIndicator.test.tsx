import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../helpers/render";
import { AiCreditsIndicator } from "@/src/components/ai/AiCreditsIndicator";

describe("AiCreditsIndicator", () => {
  it("shows remaining credits", () => {
    const { getByText } = renderWithProviders(
      <AiCreditsIndicator remaining={3} limit={10} resetAt={null} />
    );

    expect(getByText(/3\/10 remaining/i)).toBeInTheDocument();
  });
});
