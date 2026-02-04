import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { UsageCard } from "@/src/components/dashboard/UsageCard";

describe("UsageCard", () => {
  it("renders usage data", async () => {
    renderWithProviders(<UsageCard />);
    expect(await screen.findByText(/42 \/ 500/i)).toBeInTheDocument();
  });
});
