import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { useKeyboard } from "@/src/hooks/use-keyboard";

function KeyboardTester() {
  const [status, setStatus] = useState("idle");
  useKeyboard(
    [
      {
        key: "k",
        ctrl: true,
        handler: () => setStatus("hit"),
      },
    ],
    true
  );
  return <div>{status}</div>;
}

describe("useKeyboard", () => {
  it("triggers handler on shortcut", () => {
    render(<KeyboardTester />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getByText("hit")).toBeInTheDocument();
  });
});
