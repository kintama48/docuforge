import { describe, expect, test } from "bun:test";
import { assertPresent, invariant } from "../lib/assert.mjs";

describe("load-test assert helpers", () => {
  test("assertPresent returns value for non-null input", () => {
    expect(assertPresent("ok", "value required")).toBe("ok");
  });

  test("assertPresent throws for nullish value", () => {
    expect(() => assertPresent(undefined, "missing")).toThrow("Load-test assertion failed");
  });

  test("invariant throws on false condition", () => {
    expect(() => invariant(false, "bad state")).toThrow("Load-test assertion failed");
  });
});
