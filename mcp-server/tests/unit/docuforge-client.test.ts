import { afterEach, describe, expect, it, mock } from 'bun:test';
import { createLogger } from '../../src/lib/logger';
import { DocuForgeClient } from '../../src/services/docuforge-client';
import { DocuForgeHttpError } from '../../src/lib/errors';

const logger = createLogger('error');

const originalFetch = globalThis.fetch;

function getRequestCall(fetchMock: ReturnType<typeof mock>): { url: string; init: RequestInit } {
  const firstCall = fetchMock.mock.calls[0];
  if (!firstCall) {
    throw new Error('Expected fetch to have at least one call');
  }

  const url = String(firstCall[0]);
  const init = (firstCall[1] ?? {}) as RequestInit;
  return { url, init };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('DocuForgeClient', () => {
  it('loads usage via API key auth', async () => {
    const fetchMock = mock(async () => {
      return new Response(
        JSON.stringify({
          plan: 'free',
          renders: { used: 1, limit: 500, remaining: 499 },
          period: { start: '2026-02-01T00:00:00Z', end: '2026-03-01T00:00:00Z' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = new DocuForgeClient(
      {
        apiBaseUrl: 'https://api.docuforge.test',
        apiKey: 'docu_live_test',
        requestTimeoutMs: 2_000,
      },
      logger
    );

    const usage = await client.getUsage('trace_usage');

    expect(usage.plan).toBe('free');
    expect(usage.renders.remaining).toBe(499);

    const request = getRequestCall(fetchMock);
    expect((request.init.headers as Headers).get('X-API-Key')).toBe('docu_live_test');
  });

  it('renders pdf and returns metadata', async () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

    const fetchMock = mock(async () => {
      return new Response(pdf, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'X-Render-Duration': '42',
          'X-Render-Id': 'log_123',
        },
      });
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = new DocuForgeClient(
      {
        apiBaseUrl: 'https://api.docuforge.test',
        apiKey: 'docu_live_test',
        requestTimeoutMs: 2_000,
      },
      logger
    );

    const result = await client.renderPdf({
      templateId: 'tpl_123',
      data: { name: 'DocuForge' },
      protectionMode: 'none',
      traceId: 'trace_render',
    });

    expect(result.renderId).toBe('log_123');
    expect(result.durationMs).toBe(42);
    expect(result.pdf.byteLength).toBe(4);
    expect(result.protectionMode).toBe('none');
  });

  it('renders client-blind mode via /v1/render and forwards mode in body', async () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

    const fetchMock = mock(async () => {
      return new Response(pdf, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'X-Render-Duration': '21',
          'X-Render-Id': 'log_secure_123',
          'X-Pdf-Protection-Mode': 'client_blind',
        },
      });
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = new DocuForgeClient(
      {
        apiBaseUrl: 'https://api.docuforge.test',
        apiKey: 'docu_live_test',
        requestTimeoutMs: 2_000,
      },
      logger
    );

    const result = await client.renderPdf({
      templateId: 'tpl_secure',
      data: { confidential: true },
      protectionMode: 'client_blind',
      traceId: 'trace_render_secure',
    });

    expect(result.renderId).toBe('log_secure_123');
    expect(result.durationMs).toBe(21);
    expect(result.protectionMode).toBe('client_blind');

    const request = getRequestCall(fetchMock);
    expect(request.url).toBe('https://api.docuforge.test/v1/render');
    expect((request.init.headers as Headers).get('X-Pdf-Password')).toBeNull();

    const body = JSON.parse(request.init.body as string) as Record<string, unknown>;
    expect(body.password_protection_mode).toBe('client_blind');
  });

  it('supports legacy server-ephemeral mode when password is provided', async () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const fetchMock = mock(async () =>
      new Response(pdf, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'X-Render-Duration': '11',
          'X-Render-Id': 'log_legacy_123',
          'X-Pdf-Protection-Mode': 'server_ephemeral_legacy',
        },
      })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = new DocuForgeClient(
      {
        apiBaseUrl: 'https://api.docuforge.test',
        apiKey: 'docu_live_test',
        requestTimeoutMs: 2_000,
      },
      logger
    );

    const result = await client.renderPdf({
      templateId: 'tpl_legacy',
      data: {},
      protectionMode: 'server_ephemeral_legacy',
      legacyPassword: 'super-secret-password',
      traceId: 'trace_render_legacy',
    });

    expect(result.protectionMode).toBe('server_ephemeral_legacy');
    const request = getRequestCall(fetchMock);
    expect(request.url).toBe('https://api.docuforge.test/v1/render/secure');
    expect((request.init.headers as Headers).get('X-Pdf-Password')).toBe('super-secret-password');
  });

  it('throws when legacy mode is requested without password', async () => {
    const client = new DocuForgeClient(
      {
        apiBaseUrl: 'https://api.docuforge.test',
        apiKey: 'docu_live_test',
        requestTimeoutMs: 2_000,
      },
      logger
    );

    await expect(
      client.renderPdf({
        templateId: 'tpl_legacy_missing',
        data: {},
        protectionMode: 'server_ephemeral_legacy',
        traceId: 'trace_render_legacy_missing',
      })
    ).rejects.toBeInstanceOf(DocuForgeHttpError);
  });

  it('uses static jwt token for template listing', async () => {
    const fetchMock = mock(async () => {
      return new Response(
        JSON.stringify({
          templates: [],
          pagination: { page: 1, limit: 20, total: 0 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = new DocuForgeClient(
      {
        apiBaseUrl: 'https://api.docuforge.test',
        apiKey: 'docu_live_test',
        requestTimeoutMs: 2_000,
        jwtToken: 'jwt_test_token',
      },
      logger
    );

    await client.listTemplates({
      page: 1,
      limit: 20,
      includeOfficial: true,
      traceId: 'trace_tpl',
    });

    const request = getRequestCall(fetchMock);
    expect((request.init.headers as Headers).get('Authorization')).toBe('Bearer jwt_test_token');
  });
});
