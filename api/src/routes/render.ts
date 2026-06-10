import { Hono } from 'hono';
import type { Context } from 'hono';
import { createHash, randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { getDb, schema } from '../db/client';
import { apiKeyAuth, jwtAuth } from '../middleware/auth';
import { renderRateLimit } from '../middleware/rate-limit';
import { noCache } from '../middleware/cache';
import {
  zValidator,
  renderSchema,
  renderSecureSchema,
  renderPreviewSchema,
  renderImageSchema,
  renderImagePreviewSchema,
  renderValidateSchema,
} from '../lib/validation';
import { compileLowCodeSpec } from '../lib/low-code';
import { renderPdf } from '../services/engine';
import { checkCredits, logRender } from '../services/usage';
import { resolveUserAssets } from '../services/asset';
import { NotFoundError, LimitExceededError, UnauthorizedError, ValidationError } from '../lib/errors';
import { env } from '../config/env';
import { dispatchWebhookEvent } from '../services/webhook';
import type { EnginePayload } from '../types';
import { renderPdfToImages } from '../services/image-render';
import {
  assertPublicPreviewSourceSize,
  assertTrustedPublicPreviewOrigin,
  consumePublicPreviewSessionQuota,
  createPublicPreviewSession,
  enforcePublicPreviewIpRateLimit,
  enforcePublicPreviewSessionCreationRateLimit,
  enforcePublicPreviewSessionRateLimit,
  getPublicPreviewClientFingerprint,
  getPublicPreviewSessionOrThrow,
} from '../services/public-preview';

const render = new Hono();
type PasswordProtectionMode = 'none' | 'client_blind' | 'server_ephemeral_legacy';
type RenderNamespace = 'consumer' | 'console';

function toHttpBody(binary: Buffer): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(binary);
}

function assertRenderNamespace(c: Context, namespace: RenderNamespace): void {
  const path = c.req.path;
  if (namespace === 'consumer' && path.startsWith('/v1/render')) return;
  if (namespace === 'console' && path.startsWith('/console/render')) return;
  throw new NotFoundError('Not found');
}

async function requireConsumerRenderPath(c: Context, next: () => Promise<void>) {
  assertRenderNamespace(c, 'consumer');
  await next();
}

async function requireConsoleRenderPath(c: Context, next: () => Promise<void>) {
  assertRenderNamespace(c, 'console');
  await next();
}

function getPdfPasswordOrThrow(headerValue: string | undefined): string {
  if (!headerValue) {
    throw new ValidationError('X-Pdf-Password header is required for secure rendering');
  }

  if (headerValue.length < 8 || headerValue.length > 128) {
    throw new ValidationError('PDF password must be between 8 and 128 characters');
  }

  if (/[\x00-\x1F\x7F]/.test(headerValue)) {
    throw new ValidationError('PDF password contains unsupported control characters');
  }

  return headerValue;
}

function computeTemplateFingerprint(
  versionId: string,
  source: string,
  files: Record<string, string> | null
): string {
  const hasher = createHash('sha256');
  hasher.update(versionId);
  hasher.update('\0');
  hasher.update(source);
  hasher.update('\0');

  const entries = Object.entries(files || {}).sort(([a], [b]) => a.localeCompare(b));
  for (const [name, content] of entries) {
    hasher.update(name);
    hasher.update('\0');
    hasher.update(content);
    hasher.update('\0');
  }

  return hasher.digest('hex');
}

function applyPublicPreviewWatermark(source: string): string {
  const label = env.PUBLIC_PREVIEW_WATERMARK_LABEL.replace(/"/g, '\\"');
  const snippet = `#let __docuforge_public_preview_label = "${label}"
#show: doc => {
  set page(
    footer: context [
      #align(center)[
        #text(size: 8pt, fill: rgb("#9ca3af"))[
          #__docuforge_public_preview_label
        ]
      ]
    ]
  )
  doc
}`;

  const merged = `${snippet}\n\n${source}`;
  assertPublicPreviewSourceSize(merged);
  return merged;
}

// POST /v1/render - Production render with API key
render.post('/', requireConsumerRenderPath, apiKeyAuth, renderRateLimit, noCache, zValidator('json', renderSchema), async (c) => {
  const { template_id, data, password_protection_mode } = c.req.valid('json');
  const { userId } = c.get('auth');
  const db = getDb();
  const protectionMode: PasswordProtectionMode = password_protection_mode || 'none';

  // Check credits
  const credits = await checkCredits(userId);
  if (!credits.allowed) {
    throw new LimitExceededError(`Monthly render limit reached (${credits.used}/${credits.limit})`, {
      usage: {
        used: credits.used,
        limit: credits.limit,
        plan: credits.plan,
        resets_at: credits.periodEnd.toISOString(),
      },
      upgrade_url: 'https://www.docuforge.app/pricing',
    });
  }

  // Resolve template
  const [template] = await db
    .select()
    .from(schema.templates)
    .where(eq(schema.templates.id, template_id));

  if (!template) {
    throw new NotFoundError('Template not found');
  }

  // Check ownership (user's template or official)
  if (template.userId !== null && template.userId !== userId) {
    throw new NotFoundError('Template not found');
  }

  // Get live version
  if (!template.liveVersionId) {
    throw new NotFoundError('Template has no published version');
  }

  const [version] = await db
    .select()
    .from(schema.templateVersions)
    .where(eq(schema.templateVersions.id, template.liveVersionId));

  if (!version) {
    throw new NotFoundError('Template version not found');
  }

  // Resolve assets
  const assets = await resolveUserAssets(userId);
  const templateFingerprint = computeTemplateFingerprint(version.id, version.source, version.files || null);

  // Build engine payload
  const payload: EnginePayload = {
    template: {
      main: 'main.typ',
      files: {
        'main.typ': version.source,
        ...(version.files || {}),
      },
    },
    data: data || {},
    assets,
    options: {
      timeout_ms: env.ENGINE_TIMEOUT_MS,
      cache: {
        cacheable: true,
        template_fingerprint: templateFingerprint,
        version_id: version.id,
      },
    },
  };

  // Render
  let result;
  let logId: string;

  try {
    result = await renderPdf(payload);
    logId = await logRender({
      userId,
      templateId: template.id,
      templateVersionId: version.id,
      status: 'success',
      durationMs: result.durationMs,
    });

    // Fire webhook asynchronously (don't block the response)
    dispatchWebhookEvent(userId, 'render.completed', {
      render_id: logId,
      template_id: template.id,
      template_version_id: version.id,
      status: 'success',
      duration_ms: result.durationMs,
      password_protection_mode: protectionMode,
    }).catch((e) => console.error('Webhook dispatch error:', e));
  } catch (err) {
    const errorLogId = await logRender({
      userId,
      templateId: template.id,
      templateVersionId: version.id,
      status: 'error',
      durationMs: 0,
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
    });

    // Fire webhook for failure
    dispatchWebhookEvent(userId, 'render.failed', {
      render_id: errorLogId,
      template_id: template.id,
      error: err instanceof Error ? err.message : 'Unknown error',
      password_protection_mode: protectionMode,
    }).catch((e) => console.error('Webhook dispatch error:', e));

    throw err;
  }

  // Return PDF
  c.header('Content-Type', 'application/pdf');
  c.header('Content-Disposition', 'inline; filename="document.pdf"');
  c.header('X-Render-Duration', String(result.durationMs));
  c.header('X-Render-Id', logId);
  c.header('X-Pdf-Protection-Mode', protectionMode);

  return c.body(toHttpBody(result.pdf));
});

// POST /v1/render/image - Production image render with API key
render.post('/image', requireConsumerRenderPath, apiKeyAuth, renderRateLimit, noCache, zValidator('json', renderImageSchema), async (c) => {
  const { template_id, data, format, dpi, quality, page_numbers } = c.req.valid('json');
  const { userId } = c.get('auth');
  const db = getDb();

  const credits = await checkCredits(userId);
  if (!credits.allowed) {
    throw new LimitExceededError(`Monthly render limit reached (${credits.used}/${credits.limit})`, {
      usage: {
        used: credits.used,
        limit: credits.limit,
        plan: credits.plan,
        resets_at: credits.periodEnd.toISOString(),
      },
      upgrade_url: 'https://www.docuforge.app/pricing',
    });
  }

  const [template] = await db
    .select()
    .from(schema.templates)
    .where(eq(schema.templates.id, template_id));

  if (!template) {
    throw new NotFoundError('Template not found');
  }
  if (template.userId !== null && template.userId !== userId) {
    throw new NotFoundError('Template not found');
  }
  if (!template.liveVersionId) {
    throw new NotFoundError('Template has no published version');
  }

  const [version] = await db
    .select()
    .from(schema.templateVersions)
    .where(eq(schema.templateVersions.id, template.liveVersionId));

  if (!version) {
    throw new NotFoundError('Template version not found');
  }

  const assets = await resolveUserAssets(userId);
  const templateFingerprint = computeTemplateFingerprint(version.id, version.source, version.files || null);
  const payload: EnginePayload = {
    template: {
      main: 'main.typ',
      files: {
        'main.typ': version.source,
        ...(version.files || {}),
      },
    },
    data: data || {},
    assets,
    options: {
      timeout_ms: env.ENGINE_TIMEOUT_MS,
      cache: {
        cacheable: true,
        template_fingerprint: templateFingerprint,
        version_id: version.id,
      },
    },
  };

  const startedAt = Date.now();
  let logId: string;

  try {
    const pdfResult = await renderPdf(payload);
    const imageResult = await renderPdfToImages(pdfResult.pdf, {
      format,
      dpi,
      quality,
      page_numbers,
    });

    logId = await logRender({
      userId,
      templateId: template.id,
      templateVersionId: version.id,
      status: 'success',
      durationMs: Date.now() - startedAt,
    });

    dispatchWebhookEvent(userId, 'render.completed', {
      render_id: logId,
      template_id: template.id,
      template_version_id: version.id,
      status: 'success',
      output_format: imageResult.archive ? 'zip' : imageResult.contentType,
      page_count: imageResult.pageCount,
      duration_ms: Date.now() - startedAt,
    }).catch((e) => console.error('Webhook dispatch error:', e));

    c.header('Content-Type', imageResult.contentType);
    c.header('Content-Disposition', `attachment; filename="${imageResult.filename}"`);
    c.header('X-Render-Id', logId);
    c.header('X-Render-Duration', String(Date.now() - startedAt));
    c.header('X-Image-Page-Count', String(imageResult.pageCount));
    c.header('X-Image-Archive', imageResult.archive ? 'true' : 'false');
    c.header('X-Pdf-Protection-Mode', 'none');
    return c.body(toHttpBody(imageResult.body));
  } catch (err) {
    const errorLogId = await logRender({
      userId,
      templateId: template.id,
      templateVersionId: version.id,
      status: 'error',
      durationMs: 0,
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
    });

    dispatchWebhookEvent(userId, 'render.failed', {
      render_id: errorLogId,
      template_id: template.id,
      error: err instanceof Error ? err.message : 'Unknown error',
      output_format: 'image',
    }).catch((e) => console.error('Webhook dispatch error:', e));

    throw err;
  }
});

// POST /v1/render/secure - Production render with in-memory PDF encryption
render.post('/secure', requireConsumerRenderPath, apiKeyAuth, renderRateLimit, noCache, zValidator('json', renderSecureSchema), async (c) => {
  const { template_id, data } = c.req.valid('json');
  const { userId } = c.get('auth');
  const db = getDb();

  let pdfPassword = getPdfPasswordOrThrow(c.req.header('X-Pdf-Password'));

  // Check credits
  const credits = await checkCredits(userId);
  if (!credits.allowed) {
    throw new LimitExceededError(`Monthly render limit reached (${credits.used}/${credits.limit})`, {
      usage: {
        used: credits.used,
        limit: credits.limit,
        plan: credits.plan,
        resets_at: credits.periodEnd.toISOString(),
      },
      upgrade_url: 'https://www.docuforge.app/pricing',
    });
  }

  // Resolve template
  const [template] = await db
    .select()
    .from(schema.templates)
    .where(eq(schema.templates.id, template_id));

  if (!template) {
    throw new NotFoundError('Template not found');
  }

  // Check ownership (user's template or official)
  if (template.userId !== null && template.userId !== userId) {
    throw new NotFoundError('Template not found');
  }

  // Get live version
  if (!template.liveVersionId) {
    throw new NotFoundError('Template has no published version');
  }

  const [version] = await db
    .select()
    .from(schema.templateVersions)
    .where(eq(schema.templateVersions.id, template.liveVersionId));

  if (!version) {
    throw new NotFoundError('Template version not found');
  }

  // Resolve assets
  const assets = await resolveUserAssets(userId);
  const templateFingerprint = computeTemplateFingerprint(version.id, version.source, version.files || null);

  // Build engine payload
  const payload: EnginePayload = {
    template: {
      main: 'main.typ',
      files: {
        'main.typ': version.source,
        ...(version.files || {}),
      },
    },
    data: data || {},
    assets,
    options: {
      timeout_ms: env.ENGINE_TIMEOUT_MS,
      cache: {
        cacheable: true,
        template_fingerprint: templateFingerprint,
        version_id: version.id,
      },
      encryption: {
        mode: 'aes256',
        permissions: 'print_only',
        user_password: pdfPassword,
      },
    },
  };

  // Best-effort local variable wipe after payload construction.
  pdfPassword = '';

  // Render
  let result;
  let logId: string;

  try {
    result = await renderPdf(payload);
    logId = await logRender({
      userId,
      templateId: template.id,
      templateVersionId: version.id,
      status: 'success',
      durationMs: result.durationMs,
    });

    // Fire webhook asynchronously (don't block the response)
    dispatchWebhookEvent(userId, 'render.completed', {
      render_id: logId,
      template_id: template.id,
      template_version_id: version.id,
      status: 'success',
      duration_ms: result.durationMs,
      encrypted: true,
      password_protection_mode: 'server_ephemeral_legacy',
    }).catch((e) => console.error('Webhook dispatch error:', e));
  } catch (err) {
    const errorLogId = await logRender({
      userId,
      templateId: template.id,
      templateVersionId: version.id,
      status: 'error',
      durationMs: 0,
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
    });

    // Fire webhook for failure
    dispatchWebhookEvent(userId, 'render.failed', {
      render_id: errorLogId,
      template_id: template.id,
      error: err instanceof Error ? err.message : 'Unknown error',
      encrypted: true,
      password_protection_mode: 'server_ephemeral_legacy',
    }).catch((e) => console.error('Webhook dispatch error:', e));

    throw err;
  }

  // Return encrypted PDF
  c.header('Content-Type', 'application/pdf');
  c.header('Content-Disposition', 'inline; filename="document.secure.pdf"');
  c.header('X-Render-Duration', String(result.durationMs));
  c.header('X-Render-Id', logId);
  c.header('X-Pdf-Encrypted', 'aes256');
  c.header('X-Pdf-Protection-Mode', 'server_ephemeral_legacy');
  c.header('X-Pdf-Protection-Legacy', 'true');

  return c.body(toHttpBody(result.pdf));
});

// POST /v1/render/public/session - Issue a short-lived public preview session
render.post('/public/session', requireConsumerRenderPath, noCache, async (c) => {
  assertTrustedPublicPreviewOrigin(c);
  const client = getPublicPreviewClientFingerprint(c);
  const rate = await enforcePublicPreviewSessionCreationRateLimit(client.ip);
  const session = await createPublicPreviewSession(client);

  c.header('X-RateLimit-Limit', String(rate.limit));
  c.header('X-RateLimit-Remaining', String(rate.remaining));
  c.header('X-RateLimit-Reset', String(Math.ceil(rate.resetAt / 1000)));

  return c.json(
    {
      session_id: session.sessionId,
      expires_at: session.expiresAt,
      remaining_renders: session.remainingRenders,
      watermark: env.PUBLIC_PREVIEW_WATERMARK_LABEL,
    },
    201
  );
});

// POST /v1/render/public/preview - Public preview render (session protected, watermarked)
render.post('/public/preview', requireConsumerRenderPath, noCache, zValidator('json', renderPreviewSchema), async (c) => {
  assertTrustedPublicPreviewOrigin(c);

  const sessionId = c.req.header('X-Preview-Session');
  if (!sessionId) {
    throw new UnauthorizedError('X-Preview-Session header is required');
  }

  const client = getPublicPreviewClientFingerprint(c);
  const session = await getPublicPreviewSessionOrThrow(sessionId, client);
  const ipRate = await enforcePublicPreviewIpRateLimit(client.ip);
  const sessionRate = await enforcePublicPreviewSessionRateLimit(session.sessionId);
  const quota = await consumePublicPreviewSessionQuota(session.sessionId);

  const { source, low_code_spec, files, data } = c.req.valid('json');
  const previewSource = source ?? (low_code_spec ? compileLowCodeSpec(low_code_spec) : null);
  if (!previewSource) {
    throw new ValidationError('Either source or low_code_spec is required');
  }
  if (files && Object.keys(files).length > 0) {
    throw new ValidationError('Public preview does not support auxiliary template files');
  }

  const watermarkedSource = applyPublicPreviewWatermark(previewSource);

  const payload: EnginePayload = {
    template: {
      main: 'main.typ',
      files: {
        'main.typ': watermarkedSource,
      },
    },
    data: data || {},
    assets: [],
    options: {
      timeout_ms: env.ENGINE_TIMEOUT_MS,
      cache: {
        cacheable: false,
      },
    },
  };

  const result = await renderPdf(payload);
  const renderId = `pub_${randomUUID()}`;

  c.header('Content-Type', 'application/pdf');
  c.header('Content-Disposition', 'inline; filename="preview.public.pdf"');
  c.header('X-Render-Duration', String(result.durationMs));
  c.header('X-Render-Id', renderId);
  c.header('X-Public-Preview', 'true');
  c.header('X-Pdf-Watermarked', 'true');
  c.header('X-Preview-Watermark-Label', env.PUBLIC_PREVIEW_WATERMARK_LABEL);
  c.header('X-Preview-Session-Expires-At', quota.expiresAt);
  c.header('X-Preview-Session-Remaining-Renders', String(quota.remainingRenders));
  c.header('X-RateLimit-Limit', String(sessionRate.limit));
  c.header('X-RateLimit-Remaining', String(sessionRate.remaining));
  c.header('X-RateLimit-Reset', String(Math.ceil(sessionRate.resetAt / 1000)));
  c.header('X-Preview-IP-RateLimit-Remaining', String(ipRate.remaining));

  return c.body(toHttpBody(result.pdf));
});

// POST /v1/render/preview - Preview render with JWT
render.post(
  '/preview',
  requireConsoleRenderPath,
  jwtAuth,
  noCache,
  zValidator('json', renderPreviewSchema),
  async (c) => {
  const { source, low_code_spec, files, data } = c.req.valid('json');
  const { userId } = c.get('auth');
  const previewSource = source ?? (low_code_spec ? compileLowCodeSpec(low_code_spec) : null);
  if (!previewSource) {
    throw new ValidationError('Either source or low_code_spec is required');
  }

  // Resolve assets
  const assets = await resolveUserAssets(userId);

  // Build engine payload
  const payload: EnginePayload = {
    template: {
      main: 'main.typ',
      files: {
        'main.typ': previewSource,
        ...(files || {}),
      },
    },
    data: data || {},
    assets,
    options: {
      timeout_ms: env.ENGINE_TIMEOUT_MS,
      cache: {
        cacheable: false,
      },
    },
  };

  // Render (no credit check for preview)
  let result;
  let logId: string;

  try {
    result = await renderPdf(payload);
    logId = await logRender({
      userId,
      templateId: null,
      templateVersionId: null,
      status: 'success',
      durationMs: result.durationMs,
    });
  } catch (err) {
    await logRender({
      userId,
      templateId: null,
      templateVersionId: null,
      status: 'error',
      durationMs: 0,
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
    });
    throw err;
  }

  // Return PDF
  c.header('Content-Type', 'application/pdf');
  c.header('Content-Disposition', 'inline; filename="preview.pdf"');
  c.header('X-Render-Duration', String(result.durationMs));
  c.header('X-Render-Id', logId);
  c.header('X-Pdf-Protection-Mode', 'none');

  return c.body(toHttpBody(result.pdf));
});

// POST /v1/render/preview/image - Preview image render with JWT
render.post(
  '/preview/image',
  requireConsoleRenderPath,
  jwtAuth,
  noCache,
  zValidator('json', renderImagePreviewSchema),
  async (c) => {
    const { source, low_code_spec, files, data, format, dpi, quality, page_numbers } = c.req.valid('json');
    const { userId } = c.get('auth');
    const previewSource = source ?? (low_code_spec ? compileLowCodeSpec(low_code_spec) : null);
    if (!previewSource) {
      throw new ValidationError('Either source or low_code_spec is required');
    }

    const assets = await resolveUserAssets(userId);
    const payload: EnginePayload = {
      template: {
        main: 'main.typ',
        files: {
          'main.typ': previewSource,
          ...(files || {}),
        },
      },
      data: data || {},
      assets,
      options: {
        timeout_ms: env.ENGINE_TIMEOUT_MS,
        cache: {
          cacheable: false,
        },
      },
    };

    const startedAt = Date.now();
    let logId: string;

    try {
      const pdfResult = await renderPdf(payload);
      const imageResult = await renderPdfToImages(pdfResult.pdf, {
        format,
        dpi,
        quality,
        page_numbers,
      });

      logId = await logRender({
        userId,
        templateId: null,
        templateVersionId: null,
        status: 'success',
        durationMs: Date.now() - startedAt,
      });

      c.header('Content-Type', imageResult.contentType);
      c.header('Content-Disposition', `attachment; filename="${imageResult.filename}"`);
      c.header('X-Render-Id', logId);
      c.header('X-Render-Duration', String(Date.now() - startedAt));
      c.header('X-Image-Page-Count', String(imageResult.pageCount));
      c.header('X-Image-Archive', imageResult.archive ? 'true' : 'false');
      c.header('X-Pdf-Protection-Mode', 'none');
      return c.body(toHttpBody(imageResult.body));
    } catch (err) {
      await logRender({
        userId,
        templateId: null,
        templateVersionId: null,
        status: 'error',
        durationMs: 0,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      });
      throw err;
    }
  }
);

const VALIDATE_TRACE_MAX_BYTES = 2048;

function truncateTrace(message: string): string {
  if (Buffer.byteLength(message, 'utf8') <= VALIDATE_TRACE_MAX_BYTES) {
    return message;
  }
  // Slice by bytes, then decode to avoid splitting a multi-byte character
  return Buffer.from(message, 'utf8').subarray(0, VALIDATE_TRACE_MAX_BYTES).toString('utf8') + '\n[trace truncated]';
}

// POST /v1/render/validate - Token-efficient compile check for AI agent feedback loops
// Returns { status: 0 } on success (no PDF payload).
// Returns { status: 1, trace, image_url } on failure (trace capped at 2KB; image_url is null for now).
// Always 200 — callers inspect the status field rather than relying on HTTP error codes.
render.post(
  '/validate',
  requireConsumerRenderPath,
  apiKeyAuth,
  renderRateLimit,
  noCache,
  zValidator('json', renderValidateSchema),
  async (c) => {
    const { template_id, typst_string, data } = c.req.valid('json');
    const { userId } = c.get('auth');
    const db = getDb();

    let enginePayload: EnginePayload;

    if (template_id) {
      // Managed-template path — resolve from DB (same as /v1/render)
      const [template] = await db
        .select()
        .from(schema.templates)
        .where(eq(schema.templates.id, template_id));

      if (!template) {
        throw new NotFoundError('Template not found');
      }
      if (template.userId !== null && template.userId !== userId) {
        throw new NotFoundError('Template not found');
      }
      if (!template.liveVersionId) {
        throw new NotFoundError('Template has no published version');
      }

      const [version] = await db
        .select()
        .from(schema.templateVersions)
        .where(eq(schema.templateVersions.id, template.liveVersionId));

      if (!version) {
        throw new NotFoundError('Template version not found');
      }

      const assets = await resolveUserAssets(userId);

      enginePayload = {
        template: {
          main: 'main.typ',
          files: {
            'main.typ': version.source,
            ...(version.files || {}),
          },
        },
        data: data || {},
        assets,
        options: {
          timeout_ms: env.ENGINE_TIMEOUT_MS,
          cache: { cacheable: false },
        },
      };
    } else {
      // BYOT path — typst_string provided directly
      const assets = await resolveUserAssets(userId);

      enginePayload = {
        template: {
          main: 'main.typ',
          files: {
            'main.typ': typst_string as string,
          },
        },
        data: data || {},
        assets,
        options: {
          timeout_ms: env.ENGINE_TIMEOUT_MS,
          cache: { cacheable: false },
        },
      };
    }

    try {
      await renderPdf(enginePayload);
      return c.json({ status: 0 as const });
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : 'Unknown compilation error';
      const trace = truncateTrace(rawMessage);
      // image_url: null — image-on-failure deferred to follow-up (see PR description)
      return c.json({ status: 1 as const, trace, image_url: null as string | null });
    }
  }
);

export default render;
