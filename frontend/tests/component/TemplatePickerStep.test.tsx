import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { TemplatePickerStep } from "@/src/components/onboarding/TemplatePickerStep";

describe("TemplatePickerStep", () => {
  it("renders fallback templates and triggers pick", () => {
    const onPick = vi.fn();
    renderWithProviders(
      <TemplatePickerStep
        templates={[]}
        fallbackNames={["Report"]}
        onPick={onPick}
        onSkip={vi.fn()}
      />
    );

    expect(screen.getByText(/report/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /use this/i }));
    expect(onPick).toHaveBeenCalled();
  });
});
