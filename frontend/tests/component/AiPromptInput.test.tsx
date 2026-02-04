import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { AiPromptInput } from "@/src/components/ai/AiPromptInput";

describe("AiPromptInput", () => {
  it("calls handlers on change and send", () => {
    const onChange = vi.fn();
    const onSend = vi.fn();
    const onToggleSelection = vi.fn();

    renderWithProviders(
      <AiPromptInput
        value=""
        includeSelection={false}
        onChange={onChange}
        onToggleSelection={onToggleSelection}
        onSend={onSend}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/describe what you want/i), {
      target: { value: "Add a header" },
    });
    expect(onChange).toHaveBeenCalledWith("Add a header");

    fireEvent.click(screen.getByLabelText(/include selection/i));
    expect(onToggleSelection).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(onSend).toHaveBeenCalled();
  });
});
