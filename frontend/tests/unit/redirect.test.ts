import { describe, expect, it } from "vitest";
import { sanitizeAppRedirect } from "@/src/lib/redirect";

describe("sanitizeAppRedirect", () => {
  it("keeps safe in-app paths", () => {
    expect(sanitizeAppRedirect("/dashboard")).toBe("/dashboard");
    expect(sanitizeAppRedirect("/settings?tab=api#keys")).toBe(
      "/settings?tab=api#keys"
    );
  });

  it("rejects external or protocol-relative redirects", () => {
    expect(sanitizeAppRedirect("https://evil.example/phish")).toBe("/dashboard");
    expect(sanitizeAppRedirect("//evil.example/phish")).toBe("/dashboard");
    expect(sanitizeAppRedirect("javascript:alert(1)")).toBe("/dashboard");
  });

  it("uses caller fallback when provided", () => {
    expect(sanitizeAppRedirect("https://evil.example", "/login")).toBe("/login");
  });
});
