import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  DocuForgeClient,
  DocuForgeApiError,
} from "../app/lib/docuforge-client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_API_KEY = "df_test_key_abc123";
const TEST_BASE_URL = "https://api.docuforge.dev";

const templatesResponse = {
  templates: [
    {
      id: "tpl_abc123",
      name: "Invoice Template",
      description: "Professional invoice",
      createdAt: "2025-01-15T10:30:00Z",
      updatedAt: "2025-06-20T14:00:00Z",
    },
    {
      id: "tpl_def456",
      name: "Receipt",
      description: "Simple receipt",
      createdAt: "2025-02-10T08:00:00Z",
      updatedAt: "2025-05-15T12:00:00Z",
    },
  ],
  pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
};

const usageResponse = {
  plan: "pro",
  renders: { used: 42, limit: 1000, remaining: 958 },
};

function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status === 200 ? "OK" : status === 401 ? "Unauthorized" : "Internal Server Error",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

function pdfResponse(pdfBytes: Uint8Array, renderId: string): Response {
  return new Response(pdfBytes, {
    status: 200,
    statusText: "OK",
    headers: {
      "Content-Type": "application/pdf",
      "X-Render-Id": renderId,
    },
  });
}

function errorResponse(status: number, body: string): Response {
  const statusText =
    status === 401 ? "Unauthorized" : status === 500 ? "Internal Server Error" : "Error";
  return new Response(body, { status, statusText });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DocuForgeClient", () => {
  const originalFetch = globalThis.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // -- listTemplates --------------------------------------------------------

  describe("listTemplates()", () => {
    it("calls correct URL with default params and returns parsed response", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(templatesResponse));

      const client = new DocuForgeClient(TEST_API_KEY, TEST_BASE_URL);
      const result = await client.listTemplates();

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${TEST_BASE_URL}/v1/templates?page=1&limit=20`);
      expect(init.method).toBe("GET");
      expect(result).toEqual(templatesResponse);
    });

    it("passes custom page and limit as query params", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(templatesResponse));

      const client = new DocuForgeClient(TEST_API_KEY, TEST_BASE_URL);
      await client.listTemplates(3, 50);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe(`${TEST_BASE_URL}/v1/templates?page=3&limit=50`);
    });
  });

  // -- getTemplate ----------------------------------------------------------

  describe("getTemplate()", () => {
    it("calls correct URL with encoded template ID", async () => {
      const template = {
        id: "tpl_abc123",
        name: "Invoice Template",
        description: "Professional invoice",
        defaults: {},
        versions: [],
        createdAt: "2025-01-15T10:30:00Z",
        updatedAt: "2025-06-20T14:00:00Z",
      };
      mockFetch.mockResolvedValueOnce(jsonResponse(template));

      const client = new DocuForgeClient(TEST_API_KEY, TEST_BASE_URL);
      const result = await client.getTemplate("tpl_abc123");

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe(`${TEST_BASE_URL}/v1/templates/tpl_abc123`);
      expect(result).toEqual(template);
    });

    it("encodes special characters in template ID", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: "tpl/special id" }));

      const client = new DocuForgeClient(TEST_API_KEY, TEST_BASE_URL);
      await client.getTemplate("tpl/special id");

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe(`${TEST_BASE_URL}/v1/templates/tpl%2Fspecial%20id`);
    });
  });

  // -- renderPdf ------------------------------------------------------------

  describe("renderPdf()", () => {
    it("POSTs with correct body and returns pdf, renderId, durationMs", async () => {
      const fakePdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
      mockFetch.mockResolvedValueOnce(pdfResponse(fakePdf, "render_xyz789"));

      const client = new DocuForgeClient(TEST_API_KEY, TEST_BASE_URL);
      const data = { company: "Acme Corp" };
      const result = await client.renderPdf("tpl_abc123", data);

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${TEST_BASE_URL}/v1/render`);
      expect(init.method).toBe("POST");
      expect(init.headers["Content-Type"]).toBe("application/json");
      expect(JSON.parse(init.body)).toEqual({
        template_id: "tpl_abc123",
        data: { company: "Acme Corp" },
      });

      expect(result.pdf).toBeInstanceOf(Buffer);
      expect(result.pdf.length).toBe(fakePdf.length);
      expect(result.renderId).toBe("render_xyz789");
      expect(typeof result.durationMs).toBe("number");
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  // -- getUsage -------------------------------------------------------------

  describe("getUsage()", () => {
    it("returns parsed usage stats", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(usageResponse));

      const client = new DocuForgeClient(TEST_API_KEY, TEST_BASE_URL);
      const result = await client.getUsage();

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe(`${TEST_BASE_URL}/v1/usage`);
      expect(result).toEqual(usageResponse);
    });
  });

  // -- Error handling -------------------------------------------------------

  describe("error handling", () => {
    it("throws DocuForgeApiError on 401 (unauthorized)", async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(401, '{"error":"invalid api key"}'));

      const client = new DocuForgeClient(TEST_API_KEY, TEST_BASE_URL);

      const error = await client.listTemplates().catch((e) => e);
      expect(error).toBeInstanceOf(DocuForgeApiError);
      expect(error).toMatchObject({
        status: 401,
        statusText: "Unauthorized",
        body: '{"error":"invalid api key"}',
      });
    });

    it("throws DocuForgeApiError on 500 (server error)", async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(500, "Internal error"));

      const client = new DocuForgeClient(TEST_API_KEY, TEST_BASE_URL);

      await expect(client.getUsage()).rejects.toThrow(DocuForgeApiError);
    });

    it("throws DocuForgeApiError on non-ok renderPdf response", async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(422, '{"error":"invalid template"}'));

      const client = new DocuForgeClient(TEST_API_KEY, TEST_BASE_URL);

      await expect(client.renderPdf("bad_tpl", {})).rejects.toThrow(DocuForgeApiError);
    });
  });

  // -- Headers & URL normalization ------------------------------------------

  describe("headers and URL normalization", () => {
    it("sends X-API-Key header on all GET requests", async () => {
      mockFetch.mockResolvedValue(jsonResponse(usageResponse));

      const client = new DocuForgeClient(TEST_API_KEY, TEST_BASE_URL);
      await client.getUsage();

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers["X-API-Key"]).toBe(TEST_API_KEY);
    });

    it("sends X-API-Key header on POST (renderPdf)", async () => {
      const fakePdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      mockFetch.mockResolvedValueOnce(pdfResponse(fakePdf, "r1"));

      const client = new DocuForgeClient(TEST_API_KEY, TEST_BASE_URL);
      await client.renderPdf("tpl_1", {});

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers["X-API-Key"]).toBe(TEST_API_KEY);
    });

    it("strips trailing slashes from baseUrl", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(usageResponse));

      const client = new DocuForgeClient(TEST_API_KEY, "https://api.docuforge.dev///");
      await client.getUsage();

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.docuforge.dev/v1/usage");
    });

    it("uses default baseUrl when none provided", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(usageResponse));

      const client = new DocuForgeClient(TEST_API_KEY);
      await client.getUsage();

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.docuforge.dev/v1/usage");
    });
  });
});
