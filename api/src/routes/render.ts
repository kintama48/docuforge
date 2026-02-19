import { Hono } from 'hono';
import { createHash } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { getDb, schema } from '../db/client';
import { apiKeyAuth, jwtAuth } from '../middleware/auth';
import { renderRateLimit, previewRateLimit } from '../middleware/rate-limit';
import { noCache } from '../middleware/cache';
import { zValidator, renderSchema, renderSecureSchema, renderPreviewSchema } from '../lib/validation';
import { renderPdf } from '../services/engine';
import { checkCredits, logRender } from '../services/usage';
import { resolveUserAssets } from '../services/asset';
import { NotFoundError, LimitExceededError, ValidationError } from '../lib/errors';
import { env } from '../config/env';
import {
  enqueueRenderJob,
  getRenderJobPdf,
  getRenderJobStatus,
  isRenderQueueEnabled,
} from '../services/render-queue';
import { executeProductionRender } from '../services/render-task';
import type { EnginePayload } from '../types';
import { compileLowCodeSpec } from '../lib/low-code';

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

  const key = raw.trim();
  if (key.length < 8 || key.length > 128) {
    throw new ValidationError('Idempotency-Key must be between 8 and 128 characters');
  }

  return key;
}

async function assertCreditsAvailable(userId: string) {
  const credits = await checkCredits(userId);
  if (!credits.allowed) {
    throw new LimitExceededError(`Monthly render limit reached (${credits.used}/${credits.limit})`, {
      usage: {
        used: credits.used,
        limit: credits.limit,
        plan: credits.plan,
        resets_at: credits.periodEnd.toISOString(),
      },
      upgrade_url: 'https://docuforge.app/pricing',
    });
  }
}

// POST /v1/render - Production render with API key
render.post('/', apiKeyAuth, renderRateLimit, noCache, zValidator('json', renderSchema), async (c) => {
  const { template_id, data } = c.req.valid('json');
  const { userId } = c.get('auth');

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

  return c.body(Uint8Array.from(result.pdf));
});

// POST /v1/render/jobs - Queue a production render (idempotent by Idempotency-Key)
render.post('/jobs', apiKeyAuth, renderRateLimit, noCache, zValidator('json', renderSchema), async (c) => {
  if (!isRenderQueueEnabled()) {
    throw new NotFoundError('Render queue is disabled');
  }

  const { template_id, data } = c.req.valid('json');
  const { userId } = c.get('auth');
  const idempotencyKey = getIdempotencyKey(c);

  // Fast failure before queueing. Worker checks credits again at execution time.
  await assertCreditsAvailable(userId);

  const job = await enqueueRenderJob({
    userId,
    templateId: template_id,
    data: data || {},
    idempotencyKey,
  });

  c.header('X-Render-Job-Id', job.jobId);

  return c.json(
    {
      job_id: job.jobId,
      status: job.status,
      duplicate: job.duplicate,
      poll_url: `${env.API_URL}/v1/render/jobs/${job.jobId}`,
      pdf_url: `${env.API_URL}/v1/render/jobs/${job.jobId}/pdf`,
    },
    job.duplicate ? 200 : 202
  );
});

// GET /v1/render/jobs/:jobId - Render job status
render.get('/jobs/:jobId', apiKeyAuth, noCache, zValidator('param', renderJobParamSchema), async (c) => {
  if (!isRenderQueueEnabled()) {
    throw new NotFoundError('Render queue is disabled');
  }

  const { userId } = c.get('auth');
  const { jobId } = c.req.valid('param');

  const status = await getRenderJobStatus(userId, jobId);
  if (!status) {
    throw new NotFoundError('Render job not found');
  }

  return c.json(status);
});

// GET /v1/render/jobs/:jobId/pdf - Download completed job PDF
render.get('/jobs/:jobId/pdf', apiKeyAuth, noCache, zValidator('param', renderJobParamSchema), async (c) => {
  if (!isRenderQueueEnabled()) {
    throw new NotFoundError('Render queue is disabled');
  }

  const { userId } = c.get('auth');
  const { jobId } = c.req.valid('param');

  const result = await getRenderJobPdf(userId, jobId);
  if (!result) {
    throw new NotFoundError('Render job not found');
  }

  if (result.status !== 'completed' || !result.pdf) {
    if (result.status === 'failed') {
      throw new ConflictError(result.error || 'Render job failed');
    }
    throw new ConflictError(`Render job is ${result.status}. Try again later`);
  }

  c.header('Content-Type', 'application/pdf');
  c.header('Content-Disposition', `inline; filename="${jobId}.pdf"`);
  c.header('X-Render-Id', result.renderLogId || '');
  c.header('X-Render-Duration', String(result.durationMs || 0));
  c.header('Cache-Control', 'no-store');

  return c.body(Uint8Array.from(result.pdf));
});

// POST /v1/render/preview - Preview render with JWT
render.post('/preview', jwtAuth, previewRateLimit, noCache, zValidator('json', renderPreviewSchema), async (c) => {
  const { source, low_code_spec, files, data } = c.req.valid('json');
  const { userId } = c.get('auth');
  if (!source && !low_code_spec) {
    throw new ValidationError('Either source or low_code_spec is required');
  }
  const resolvedSource = source ?? compileLowCodeSpec(low_code_spec!);

  const assets = await resolveUserAssets(userId);

  const payload: EnginePayload = {
    template: {
      main: 'main.typ',
      files: {
        'main.typ': resolvedSource,
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

  c.header('Content-Type', 'application/pdf');
  c.header('Content-Disposition', 'inline; filename="preview.pdf"');
  c.header('X-Render-Duration', String(result.durationMs));
  c.header('X-Render-Id', logId);
  c.header('X-Pdf-Protection-Mode', 'none');

  return c.body(Uint8Array.from(result.pdf));
});

export default render;
