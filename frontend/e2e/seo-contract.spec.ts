import { test, expect } from "@playwright/test";

function extractCanonical(html: string) {
  const match = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i);
  return match?.[1] ?? null;
}

test("root-only locale auto-detection keeps deep links stable", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: "http://localhost:5173",
    locale: "fr-FR",
  });
  const page = await context.newPage();

  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/fr$/);

  await page.goto("/pricing", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/pricing$/);

  await context.close();
});

test("localized public pages stay indexable and emit stable SEO metadata", async ({
  request,
}) => {
  const response = await request.get("/fr/blog");
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-language"]).toBe("fr");
  expect(response.headers()["referrer-policy"]).toBe(
    "strict-origin-when-cross-origin"
  );
  expect(response.headers()["x-robots-tag"]).toBeUndefined();

  const html = await response.text();
  expect(html).not.toContain("noindex, nofollow");
  expect(extractCanonical(html)).toBe("https://www.docuforge.app/fr/blog");
  expect(html).toContain('hrefLang="x-default"');
  expect(html).toContain('href="https://www.docuforge.app/blog"');
  expect(html).toContain('href="https://www.docuforge.app/de/blog"');

  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
  expect(await robots.text()).toContain(
    "Sitemap: https://www.docuforge.app/sitemap.xml"
  );
});

test("public HTML stays free of crawl-visible email-protection and dead MCP repo links", async ({
  request,
}) => {
  for (const route of ["/pricing", "/terms", "/privacy", "/content-policy"]) {
    const response = await request.get(route);
    expect(response.ok(), route).toBeTruthy();
    const html = await response.text();
    expect(html).not.toContain("/cdn-cgi/l/email-protection");
  }

  for (const route of [
    "/docs/mcp",
    "/docs/mcp/cursor",
    "/docs/mcp/claude",
    "/docs/mcp/codex",
  ]) {
    const response = await request.get(route);
    expect(response.ok(), route).toBeTruthy();
    const html = await response.text();
    expect(html).toContain("https://github.com/kintama48/docuforge/blob/main/docs/mcp/");
    expect(html).not.toContain("https://github.com/docuforge/docuforge");
  }
});
