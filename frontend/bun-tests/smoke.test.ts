import { test, expect } from "bun:test";

test("bun test smoke", () => {
  console.info(
    "For full coverage use `bun run test:run` (Vitest) and `bun run test:e2e` (Playwright)."
  );
  expect(true).toBe(true);
});
