import { describe, expect, it } from "vitest";
import { cn, formatBytes, formatDate } from "@/src/lib/utils";

describe("utils", () => {
  it("cn merges classes", () => {
    expect(cn("px-2", false && "hidden", "px-4")).toBe("px-4");
  });

  it("formatDate formats timestamps", () => {
    const formatted = formatDate(1738377600);
    expect(["Jan 31, 2025", "Feb 1, 2025"]).toContain(formatted);
  });

  it("formatBytes handles KB/MB", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
  });
});
