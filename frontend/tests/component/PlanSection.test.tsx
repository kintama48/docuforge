import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { PlanSection } from "@/src/components/settings/PlanSection";

describe("PlanSection", () => {
  it("renders plan cards and upgrade actions", () => {
    const onUpgrade = vi.fn();
    renderWithProviders(
      <PlanSection plan="free" onUpgrade={onUpgrade} onManage={vi.fn()} />
    );

    expect(
      screen.getByRole("heading", { name: /plan/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/upgrade to starter/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/compare paid plans/i));
    expect(onUpgrade).toHaveBeenCalledWith("starter");
  });

  it("shows manage subscription and upgrades on paid plans", () => {
    const onUpgrade = vi.fn();
    const onManage = vi.fn();
    renderWithProviders(
      <PlanSection plan="starter" onUpgrade={onUpgrade} onManage={onManage} />
    );

    fireEvent.click(screen.getByRole("button", { name: /manage subscription/i }));
    expect(onManage).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /upgrade to pro/i }));
    expect(onUpgrade).toHaveBeenCalledWith("pro");
  });
});
