import { DocuForgeHttpError } from '../lib/errors';
import type { Logger } from '../lib/logger';

export interface TemplateSummary {
  id: string;
  name: string;
  description: string | null;
  is_official: boolean;
  live_version: {
    id: string;
    version_number: number;
    commit_message: string | null;
    created_at: number;
  } | null;
  created_at: number;
  updated_at: number;
}

export interface ListTemplatesResult {
  templates: TemplateSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface TemplateDetailResult {
  template: {
    id: string;
    name: string;
    description: string | null;
    is_official: boolean;
    live_version: {
      id: string;
      version_number: number;
      source?: string;
      files?: Record<string, string> | null;
      defaults?: Record<string, unknown> | null;
      commit_message: string | null;
      created_at: number;
    } | null;
    versions: Array<{
      id: string;
      version_number: number;
      commit_message: string | null;
      created_at: number;
    }>;
    created_at: number;
    updated_at: number;
  };
}

export interface UsageResult {
  plan: string;
  renders: {
    used: number;
    limit: number;
    remaining: number;
  };
  period: {
    start: string;
    end: string;
  };
}

export interface RenderResponse {
  pdf: Uint8Array;
  renderId: string;
  durationMs: number;
  protectionMode: 'none' | 'client_blind' | 'server_ephemeral_legacy';
}

interface ErrorBody {
  error?: string;
  message?: string;
  details?: unknown;
}

export interface DocuForgeClientConfig {
  apiBaseUrl: string;
  apiKey: string;
  requestTimeoutMs: number;
  jwtToken?: string;
  email?: string;
  password?: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  auth: 'apiKey' | 'jwt';
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  traceId: string;
}

export class DocuForgeClient {
  private readonly config: DocuForgeClientConfig;
  private readonly logger: Logger;
  private cachedJwtToken: string | null;

  constructor(config: DocuForgeClientConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.cachedJwtToken = config.jwtToken ?? null;
  }

  async listTemplates(input: {
    page: number;
    limit: number;
    includeOfficial: boolean;
    traceId: string;
  }): Promise<ListTemplatesResult> {
    return this.requestJson<ListTemplatesResult>('/v1/templates', {
      method: 'GET',
      auth: 'jwt',
      query: {
        page: input.page,
        limit: input.limit,
        include_official: input.includeOfficial,
      },
      traceId: input.traceId,
    });
  }

  async getTemplate(templateId: string, traceId: string): Promise<TemplateDetailResult> {
    const encoded = encodeURIComponent(templateId);
    return this.requestJson<TemplateDetailResult>(`/v1/templates/${encoded}`, {
      method: 'GET',
      auth: 'jwt',
      traceId,
    });
  }

  async getUsage(traceId: string): Promise<UsageResult> {
    return this.requestJson<UsageResult>('/v1/usage', {
      method: 'GET',
      auth: 'apiKey',
      traceId,
    });
  }

  async renderPdf(input: {
    templateId: string;
    data: Record<string, unknown>;
    protectionMode?: 'none' | 'client_blind' | 'server_ephemeral_legacy';
    legacyPassword?: string;
    traceId: string;
  }): Promise<RenderResponse> {
    const protectionMode = input.protectionMode || 'none';
    const useLegacySecure = protectionMode === 'server_ephemeral_legacy';
    const path = useLegacySecure ? '/v1/render/secure' : '/v1/render';

    if (useLegacySecure && !input.legacyPassword) {
      throw new DocuForgeHttpError(
        400,
        'legacy_password_required',
        'legacyPassword is required when protectionMode=server_ephemeral_legacy'
      );
    }

    return this.requestPdf(path, {
      auth: 'apiKey',
      body: {
        template_id: input.templateId,
        data: input.data,
        ...(useLegacySecure
          ? {}
          : {
              password_protection_mode: protectionMode,
            }),
      },
      headers: useLegacySecure
        ? {
            'X-Pdf-Password': input.legacyPassword as string,
          }
        : undefined,
      traceId: input.traceId,
    });
  }

  async renderPreviewPdf(input: {
    source: string;
    files: Record<string, string>;
    data: Record<string, unknown>;
    traceId: string;
  }): Promise<RenderResponse> {
    return this.requestPdf('/v1/render/preview', {
      auth: 'jwt',
      body: {
        source: input.source,
        files: input.files,
        data: input.data,
      },
      traceId: input.traceId,
    });
  }

  private async requestJson<T>(path: string, options: RequestOptions): Promise<T> {
    const response = await this.request(path, options);
    if (!response.ok) {
      throw await this.toHttpError(response, path);
    }

    return (await response.json()) as T;
  }

  private async requestPdf(path: string, options: RequestOptions): Promise<RenderResponse> {
    const response = await this.request(path, options);
    if (!response.ok) {
      throw await this.toHttpError(response, path);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    const durationHeader = response.headers.get('X-Render-Duration') ?? '0';
    const renderId = response.headers.get('X-Render-Id') ?? '';
    const protectionModeHeader = response.headers.get('X-Pdf-Protection-Mode');
    const protectionMode = (
      protectionModeHeader === 'client_blind' ||
      protectionModeHeader === 'server_ephemeral_legacy'
        ? protectionModeHeader
        : 'none'
    ) as 'none' | 'client_blind' | 'server_ephemeral_legacy';

    return {
      pdf: bytes,
      renderId,
      durationMs: Number.parseInt(durationHeader, 10) || 0,
      protectionMode,
    };
  }

  private async request(path: string, options: RequestOptions): Promise<Response> {
    const method = options.method ?? 'POST';
    const url = this.buildUrl(path, options.query);
    const headers = new Headers();

    if (options.body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }

    if (options.auth === 'apiKey') {
      headers.set('X-API-Key', this.config.apiKey);
    } else {
      const token = await this.getJwtToken(options.traceId);
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        headers.set(key, value);
      }
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: AbortSignal.timeout(this.config.requestTimeoutMs),
      });
    } catch (error) {
      this.logger.error('docuforge.request.failed', {
        trace_id: options.traceId,
        path,
        reason: error instanceof Error ? error.message : 'unknown',
      });
      throw new DocuForgeHttpError(503, 'upstream_unreachable', `DocuForge API unreachable for ${path}`);
    }

    this.logger.info('docuforge.request.completed', {
      trace_id: options.traceId,
      method,
      path,
      status: response.status,
    });

    return response;
  }

  private async toHttpError(response: Response, path: string): Promise<DocuForgeHttpError> {
    let body: ErrorBody = {};

    try {
      body = (await response.json()) as ErrorBody;
    } catch {
      body = {};
    }

    const message = body.message || `DocuForge API request failed for ${path}`;
    const code = body.error || `http_${response.status}`;

    return new DocuForgeHttpError(response.status, code, message, body.details);
  }

  private async getJwtToken(traceId: string): Promise<string> {
    if (this.cachedJwtToken) {
      return this.cachedJwtToken;
    }

    if (this.config.email && this.config.password) {
      const loginResponse = await fetch(this.buildUrl('/v1/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: this.config.email,
          password: this.config.password,
        }),
        signal: AbortSignal.timeout(this.config.requestTimeoutMs),
      });

      if (!loginResponse.ok) {
        throw new DocuForgeHttpError(
          loginResponse.status,
          'jwt_login_failed',
          'Unable to authenticate template discovery tools with DocuForge JWT'
        );
      }

      const payload = (await loginResponse.json()) as { token?: string };
      if (!payload.token) {
        throw new DocuForgeHttpError(500, 'jwt_missing', 'DocuForge login succeeded without JWT token');
      }

      this.cachedJwtToken = payload.token;
      this.logger.info('docuforge.jwt.cached', {
        trace_id: traceId,
      });
      return payload.token;
    }

    throw new DocuForgeHttpError(
      401,
      'jwt_not_configured',
      'Template discovery requires DOCUFORGE_JWT_TOKEN or DOCUFORGE_EMAIL/PASSWORD'
    );
  }

  private buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(path, this.config.apiBaseUrl);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined) {
          continue;
        }
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }
}
