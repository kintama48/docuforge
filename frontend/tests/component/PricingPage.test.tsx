import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithAppProviders } from "../helpers/render-app";
import PricingPage from "@/src/views/pricing/PricingPage";

describe("PricingPage", () => {
  it("renders pricing heading", () => {
    renderWithAppProviders(<PricingPage />);
    expect(
      screen.getByRole("heading", {
        name: /plans that scale/i,
      })
    ).toBeInTheDocument();
  });
});
