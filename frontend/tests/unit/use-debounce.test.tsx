import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { useDebounce } from "@/src/hooks/use-debounce";
import { useState } from "react";

function DebounceTester() {
  const [value, setValue] = useState("start");
  const debounced = useDebounce(value, 300);
  return (
    <div>
      <span data-testid="value">{debounced}</span>
      <button onClick={() => setValue("next")}>Change</button>
    </div>
  );
}

describe("useDebounce", () => {
  it("debounces rapid calls", () => {
    vi.useFakeTimers();
    render(<DebounceTester />);

    act(() => {
      screen.getByText("Change").click();
    });
    expect(screen.getByTestId("value").textContent).toBe("start");

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByTestId("value").textContent).toBe("next");

    vi.useRealTimers();
  });
});
