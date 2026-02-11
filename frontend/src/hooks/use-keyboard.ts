"use client";

import { useEffect, useRef } from "react";

type Shortcut = {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
};

// FE-M3 fix: Use ref to store shortcuts so the event listener isn't
// re-attached on every render when the caller passes an inline array.
export function useKeyboard(shortcuts: Shortcut[], enabled = true) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcutsRef.current) {
        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          (shortcut.ctrl ? event.ctrlKey : true) &&
          (shortcut.meta ? event.metaKey : true) &&
          (shortcut.shift ? event.shiftKey : true) &&
          (shortcut.alt ? event.altKey : true)
        ) {
          event.preventDefault();
          shortcut.handler();
          break;
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
