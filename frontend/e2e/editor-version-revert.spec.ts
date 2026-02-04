import { test, expect } from "@playwright/test";

test("editor version history revert flow", async ({ page, request }) => {
  const email = `e2e-${Date.now()}@docuforge.dev`;
  const password = "securepassword123";

  const registerResponse = await request.post(
    "http://localhost:3000/v1/auth/register",
    {
      data: { email, password },
    }
  );
  expect(registerResponse.ok()).toBeTruthy();
  const registerData = await registerResponse.json();
  const token = registerData.token as string;

  const createTemplate = await request.post(
    "http://localhost:3000/v1/templates",
    {
      data: {
        name: "E2E Version Test",
        source: "#set page()\nVersion 1",
        commit_message: "Initial",
      },
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  expect(createTemplate.ok()).toBeTruthy();
  const templateData = await createTemplate.json();
  const templateId = templateData.template.id as string;

  const publishVersion = await request.post(
    `http://localhost:3000/v1/templates/${templateId}/publish`,
    {
      data: {
        source: "#set page()\nVersion 2",
        commit_message: "Second",
      },
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  expect(publishVersion.ok()).toBeTruthy();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/);

  await page.goto(`/editor/${templateId}`);
  await expect(page.getByText(/loading editor/i)).toBeHidden();

  await page.waitForFunction(
    () => !!document.querySelector('[data-testid="editor-more-menu"]')
  );
  await page.evaluate(() => {
    const button = document.querySelector('[data-testid="editor-more-menu"]');
    if (button) (button as HTMLButtonElement).click();
  });
  await page.waitForFunction(
    () => !!document.querySelector('[data-testid="editor-open-history"]')
  );
  await page.evaluate(() => {
    const button = document.querySelector('[data-testid="editor-open-history"]');
    if (button) (button as HTMLButtonElement).click();
  });

  await expect(page.getByTestId("version-history-panel")).toBeVisible();
  await page.waitForFunction(
    () => !!document.querySelector('[data-testid="version-item-1"]')
  );
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="version-item-1"]');
    if (el) (el as HTMLButtonElement).click();
  });

  await expect(page.getByText(/viewing v1/i)).toBeVisible();
  await page.getByRole("button", { name: /revert to this version/i }).click();

  await expect(page.getByText(/viewing v1/i)).toBeHidden();
});
