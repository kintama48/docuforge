import { eq } from 'drizzle-orm';
import { env } from '../config/env';
import { getDb, schema } from '../db/client';
import { LimitExceededError, NotFoundError } from '../lib/errors';
import { resolveUserAssets } from './asset';
import { renderPdf } from './engine';
import { checkCredits, logRender } from './usage';
import { dispatchWebhookEvent } from './webhook';
import type { EnginePayload } from '../types';

export interface ExecuteProductionRenderInput {
  userId: string;
  templateId: string;
  data?: Record<string, unknown>;
  checkCreditsBeforeRender?: boolean;
}

export interface ExecuteProductionRenderResult {
  pdf: Buffer;
  durationMs: number;
  renderLogId: string;
}

export async function executeProductionRender(
  input: ExecuteProductionRenderInput
): Promise<ExecuteProductionRenderResult> {
  const db = getDb();
  const { userId, templateId } = input;
  const data = input.data || {};
  const shouldCheckCredits = input.checkCreditsBeforeRender ?? true;

  if (shouldCheckCredits) {
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

  const [template] = await db
    .select()
    .from(schema.templates)
    .where(eq(schema.templates.id, templateId));

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

  const payload: EnginePayload = {
    template: {
      main: 'main.typ',
      files: {
        'main.typ': version.source,
        ...(version.files || {}),
      },
    },
    data,
    assets,
    options: {
      timeout_ms: env.ENGINE_TIMEOUT_MS,
    },
  };

  try {
    const result = await renderPdf(payload);
    const renderLogId = await logRender({
      userId,
      templateId: template.id,
      templateVersionId: version.id,
      status: 'success',
      durationMs: result.durationMs,
    });

    dispatchWebhookEvent(userId, 'render.completed', {
      render_id: renderLogId,
      template_id: template.id,
      template_version_id: version.id,
      status: 'success',
      duration_ms: result.durationMs,
    }).catch((e) => console.error('Webhook dispatch error:', e));

    return {
      pdf: result.pdf,
      durationMs: result.durationMs,
      renderLogId,
    };
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
    }).catch((e) => console.error('Webhook dispatch error:', e));

    throw err;
  }
}
