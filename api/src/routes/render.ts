import { Hono } from 'hono';
import type { Context } from 'hono';
import { apiKeyAuth, jwtAuth } from '../middleware/auth';
import { renderRateLimit, previewRateLimit } from '../middleware/rate-limit';
import { noCache } from '../middleware/cache';
import {
  zValidator,
  renderSchema,
  renderPreviewSchema,
  renderJobParamSchema,
} from '../lib/validation';
import { renderPdf } from '../services/engine';
import { checkCredits, logRender } from '../services/usage';
import { resolveUserAssets } from '../services/asset';
import { ConflictError, LimitExceededError, NotFoundError, ValidationError } from '../lib/errors';
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

function getIdempotencyKey(c: Context): string {
  const raw = c.req.header('Idempotency-Key') || c.req.header('X-Idempotency-Key');
  if (!raw) {
    throw new ValidationError('Idempotency-Key header is required for queued renders');
  }

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

  const result = await executeProductionRender({
    userId,
    templateId: template_id,
    data: data || {},
    checkCreditsBeforeRender: true,
  });

  c.header('Content-Type', 'application/pdf');
  c.header('Content-Disposition', 'inline; filename="document.pdf"');
  c.header('X-Render-Duration', String(result.durationMs));
  c.header('X-Render-Id', result.renderLogId);

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

  return c.body(Uint8Array.from(result.pdf));
});

export default render;
