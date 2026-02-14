export interface Template {
  id: string;
  name: string;
  description: string;
  defaults: Record<string, unknown>;
  versions: TemplateVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVersion {
  id: string;
  version: number;
  createdAt: string;
}

export interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UsageStats {
  plan: string;
  renders: {
    used: number;
    limit: number;
    remaining: number;
  };
}

export interface RenderResult {
  pdf: Buffer;
  renderId: string;
  durationMs: number;
}

export class DocuForgeApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: string
  ) {
    super(`DocuForge API error ${status}: ${statusText}`);
    this.name = "DocuForgeApiError";
  }
}

export class DocuForgeClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = "https://api.docuforge.dev") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async listTemplates(
    page: number = 1,
    limit: number = 20
  ): Promise<{ templates: TemplateSummary[]; pagination: Pagination }> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    const response = await this.fetchApi(`/v1/templates?${params.toString()}`);
    return response as { templates: TemplateSummary[]; pagination: Pagination };
  }

  async getTemplate(id: string): Promise<Template> {
    const response = await this.fetchApi(`/v1/templates/${encodeURIComponent(id)}`);
    return response as Template;
  }

  async renderPdf(
    templateId: string,
    data: Record<string, unknown>
  ): Promise<RenderResult> {
    const startTime = Date.now();

    const res = await fetch(`${this.baseUrl}/v1/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
      body: JSON.stringify({ template_id: templateId, data }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new DocuForgeApiError(res.status, res.statusText, body);
    }

    const durationMs = Date.now() - startTime;
    const renderId = res.headers.get("X-Render-Id") || "";
    const arrayBuffer = await res.arrayBuffer();
    const pdf = Buffer.from(arrayBuffer);

    return { pdf, renderId, durationMs };
  }

  async getUsage(): Promise<UsageStats> {
    const response = await this.fetchApi("/v1/usage");
    return response as UsageStats;
  }

  private async fetchApi(path: string): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-Key": this.apiKey,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new DocuForgeApiError(res.status, res.statusText, body);
    }

    return res.json();
  }
}
