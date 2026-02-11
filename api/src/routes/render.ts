import { Hono } from 'hono';

import { eq } from 'drizzle-orm';
import { getDb, schema } from '../db/client';
import { apiKeyAuth, jwtAuth } from '../middleware/auth';
import { renderRateLimit, previewRateLimit } from '../middleware/rate-limit';
import { zValidator, renderSchema, renderPreviewSchema } from '../lib/validation';
import { renderPdf } from '../services/engine';
import { checkCredits, logRender, formatUsageResponse } from '../services/usage';
import { resolveUserAssets } from '../services/asset';
import { NotFoundError, LimitExceededError } from '../lib/errors';
import { env } from '../config/env';
import type { EnginePayload } from '../types';

const render = new Hono();

// POST /v1/render - Production render with API key
render.post('/', apiKeyAuth, renderRateLimit, zValidator('json', renderSchema), async (c) => {
  const { template_id, data } = c.req.valid('json');
  const { userId } = c.get('auth');
  const db = getDb();

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
      upgrade_url: 'https://docuforge.dev/pricing',
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
  } catch (err) {
    await logRender({
      userId,
      templateId: template.id,
      templateVersionId: version.id,
      status: 'error',
      durationMs: 0,
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
    });
    throw err;
  }

  // Return PDF
  c.header('Content-Type', 'application/pdf');
  c.header('Content-Disposition', 'inline; filename="document.pdf"');
  c.header('X-Render-Duration', String(result.durationMs));
  c.header('X-Render-Id', logId);

  return c.body(result.pdf);
});

// POST /v1/render/preview - Preview render with JWT
render.post('/preview', jwtAuth, previewRateLimit, zValidator('json', renderPreviewSchema), async (c) => {
  const { source, files, data } = c.req.valid('json');
  const { userId } = c.get('auth');

  // Resolve assets
  const assets = await resolveUserAssets(userId);

  // Build engine payload
  const payload: EnginePayload = {
    template: {
      main: 'main.typ',
      files: {
        'main.typ': source,
        ...(files || {}),
      },
    },
    data: data || {},
    assets,
    options: {
      timeout_ms: env.ENGINE_TIMEOUT_MS,
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

  return c.body(result.pdf);
});

export default render;
