import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { QuickStartStep } from "@/src/components/onboarding/QuickStartStep";

describe("QuickStartStep", () => {
  it("shows template id in quick start", () => {
    renderWithProviders(
      <QuickStartStep apiKey="docu_live_test" templateId="tpl_123" />
    );

    expect(screen.getByText(/tpl_123/i)).toBeInTheDocument();
  });
});
