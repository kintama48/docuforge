import { test, expect } from "@playwright/test";

test("landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: /document infrastructure for the critical path/i,
    })
  ).toBeVisible();
  await expect(page.getByText(/docuforge developer console/i)).toBeVisible();
});
