import { describe, expect, it } from "vitest";
import { assertNever, assertPresent, invariant } from "@/src/lib/assert";

describe("frontend assertion helpers", () => {
  it("assertPresent returns value when present", () => {
    expect(assertPresent("ok", "value required")).toBe("ok");
  });

  it("assertPresent throws for nullish input", () => {
    expect(() => assertPresent(null, "missing")).toThrow("Assertion failed");
  });

  it("invariant throws with assertion prefix", () => {
    expect(() => invariant(false, "bad state")).toThrow("Assertion failed");
  });

  it("assertNever throws with assertion prefix", () => {
    expect(() => assertNever("x" as never, "unexpected branch")).toThrow("Assertion failed");
  });
});
