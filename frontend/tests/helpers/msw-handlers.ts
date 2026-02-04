import { http, HttpResponse } from "msw";
import { fixtures } from "./fixtures";

export const handlers = [
  http.post("http://localhost:3000/v1/auth/login", async () =>
    HttpResponse.json({
      token: fixtures.token,
      user: fixtures.user,
    })
  ),
  http.post("http://localhost:3000/v1/auth/register", async () =>
    HttpResponse.json({
      token: fixtures.token,
      user: fixtures.user,
      api_key: fixtures.apiKey,
    })
  ),
  http.get("http://localhost:3000/v1/templates", async () =>
    HttpResponse.json({
      templates: fixtures.templates,
      pagination: { page: 1, limit: 20, total: 1 },
    })
  ),
  http.post("http://localhost:3000/v1/templates", async () =>
    HttpResponse.json({
      template: fixtures.templateDetail,
    })
  ),
  http.get("http://localhost:3000/v1/templates/:id", async () =>
    HttpResponse.json({
      template: fixtures.templateDetail,
    })
  ),
  http.get(
    "http://localhost:3000/v1/templates/:id/versions/:versionId",
    async () =>
      HttpResponse.json({
        version: fixtures.templateVersionDetail,
      })
  ),
  http.post("http://localhost:3000/v1/templates/:id/publish", async () =>
    HttpResponse.json({
      version: {
        id: "ver_2",
        version_number: 2,
        commit_message: "Published",
        created_at: 1738377600,
      },
    })
  ),
  http.post("http://localhost:3000/v1/templates/:id/fork", async () =>
    HttpResponse.json({ template: fixtures.templateDetail })
  ),
  http.patch("http://localhost:3000/v1/templates/:id", async ({ request }) => {
    const body = (await request.json()) as { name?: string; description?: string | null };
    return HttpResponse.json({
      template: {
        ...fixtures.templateDetail,
        name: body.name || fixtures.templateDetail.name,
        description:
          body.description === undefined
            ? fixtures.templateDetail.description
            : body.description,
      },
    });
  }),
  http.delete("http://localhost:3000/v1/templates/:id", async () =>
    new HttpResponse(null, { status: 204 })
  ),
  http.post("http://localhost:3000/v1/render/preview", async () =>
    new HttpResponse(new Blob(["%PDF-1.4 test"], { type: "application/pdf" }), {
      headers: {
        "X-Render-Duration": "42",
      },
    })
  ),
  http.get("http://localhost:3000/v1/usage", async () =>
    HttpResponse.json(fixtures.usage)
  ),
  http.get("http://localhost:3000/v1/auth/keys", async () =>
    HttpResponse.json({ keys: fixtures.apiKeys })
  ),
  http.post("http://localhost:3000/v1/auth/keys", async () =>
    HttpResponse.json({ raw_key: fixtures.apiKey.raw_key, prefix: fixtures.apiKey.prefix })
  ),
  http.delete("http://localhost:3000/v1/auth/keys/:id", async () =>
    new HttpResponse(null, { status: 204 })
  ),
  http.get("http://localhost:3000/v1/assets", async () =>
    HttpResponse.json({ assets: fixtures.assets })
  ),
  http.post("http://localhost:3000/v1/ai/edit", async () =>
    HttpResponse.json({ code: "#set page()", tokens_used: 120 })
  ),
  http.post("http://localhost:3000/v1/ai/generate", async () =>
    HttpResponse.json({ code: "#set page()", tokens_used: 120 })
  ),
  http.post("http://localhost:3000/v1/billing/checkout", async () =>
    HttpResponse.json({ checkout_url: "https://checkout.example.com" })
  ),
];
