"use client";

import dynamic from "next/dynamic";
import { Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "@/src/lib/theme";

function ThemeToggleButton() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--line-hover)]"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}

const ClientThemeToggle = dynamic(() => Promise.resolve(ThemeToggleButton), {
  ssr: false,
});

export function ThemeToggle() {
  return <ClientThemeToggle />;
}
