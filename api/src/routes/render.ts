import { Hono } from 'hono';
import { createHash } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { getDb, schema } from '../db/client';
import { apiKeyAuth, jwtAuth } from '../middleware/auth';
import { renderRateLimit, previewRateLimit } from '../middleware/rate-limit';
import { noCache } from '../middleware/cache';
import { zValidator, renderSchema, renderSecureSchema, renderPreviewSchema } from '../lib/validation';
import { compileLowCodeSpec } from '../lib/low-code';
import { renderPdf } from '../services/engine';
import { checkCredits, logRender } from '../services/usage';
import { resolveUserAssets } from '../services/asset';
import { NotFoundError, LimitExceededError, ValidationError } from '../lib/errors';
import { env } from '../config/env';
import { dispatchWebhookEvent } from '../services/webhook';
import type { EnginePayload } from '../types';

const render = new Hono();
type PasswordProtectionMode = 'none' | 'client_blind' | 'server_ephemeral_legacy';

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

// POST /v1/render - Production render with API key
render.post('/', apiKeyAuth, renderRateLimit, noCache, zValidator('json', renderSchema), async (c) => {
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

  return c.body(result.pdf);
});

// POST /v1/render/secure - Production render with in-memory PDF encryption
render.post('/secure', apiKeyAuth, renderRateLimit, noCache, zValidator('json', renderSecureSchema), async (c) => {
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

  return c.body(result.pdf);
});

// POST /v1/render/preview - Preview render with JWT
render.post('/preview', jwtAuth, previewRateLimit, noCache, zValidator('json', renderPreviewSchema), async (c) => {
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

  return c.body(result.pdf);
});

export default render;
