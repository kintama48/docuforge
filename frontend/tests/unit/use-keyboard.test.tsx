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

  it("does not trigger when disabled", () => {
    function DisabledTester() {
      const [status, setStatus] = useState("idle");
      useKeyboard(
        [
          {
            key: "k",
            ctrl: true,
            handler: () => setStatus("hit"),
          },
        ],
        false
      );
      return <div>{status}</div>;
    }
    render(<DisabledTester />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getByText("idle")).toBeInTheDocument();
  });

  it("respects modifier keys", () => {
    function ModifierTester() {
      const [status, setStatus] = useState("idle");
      useKeyboard(
        [
          {
            key: "p",
            meta: true,
            shift: true,
            alt: true,
            handler: () => setStatus("hit"),
          },
        ],
        true
      );
      return <div>{status}</div>;
    }
    render(<ModifierTester />);
    fireEvent.keyDown(window, { key: "p", metaKey: true, shiftKey: true, altKey: true });
    expect(screen.getByText("hit")).toBeInTheDocument();
  });
});
