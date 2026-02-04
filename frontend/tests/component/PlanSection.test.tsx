import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { PlanSection } from "@/src/components/settings/PlanSection";

describe("PlanSection", () => {
  it("renders plan cards and upgrade actions", () => {
    renderWithProviders(
      <PlanSection plan="free" onUpgrade={vi.fn()} onManage={vi.fn()} />
    );

    expect(
      screen.getByRole("heading", { name: /plan/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/upgrade to starter/i)).toBeInTheDocument();
  });
});
