import { test, expect } from "@playwright/test";

test("docs page loads", async ({ page }) => {
  await page.goto("/docs");
  await expect(
    page.getByRole("heading", {
      name: /build pdf workflows with a predictable api/i,
    })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /authentication/i })
  ).toBeVisible();
});
