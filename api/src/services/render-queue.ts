import { createHash } from 'node:crypto';
import { Queue, Worker, type ConnectionOptions, type JobsOptions } from 'bullmq';
import { env } from '../config/env';
import { InternalError, ValidationError } from '../lib/errors';
import { executeProductionRender } from './render-task';

const RENDER_JOB_NAME = 'render';

export type RenderQueueStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface RenderQueueJobData {
  userId: string;
  templateId: string;
  data: Record<string, unknown>;
}

export interface RenderQueueJobResult {
  pdfBase64: string;
  durationMs: number;
  renderLogId: string;
}

export interface EnqueueRenderJobInput {
  userId: string;
  templateId: string;
  data: Record<string, unknown>;
  idempotencyKey: string;
}

export interface EnqueueRenderJobResult {
  jobId: string;
  status: RenderQueueStatus;
  duplicate: boolean;
}

export interface RenderJobStatusResponse {
  job_id: string;
  status: RenderQueueStatus;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  render_id?: string;
  duration_ms?: number;
  error?: string;
}

let queue: Queue | null = null;
let worker: Worker | null = null;

function assertNonEmptyString(field: string, value: string, maxLength = 256) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ValidationError(`${field} is required`);
  }
  if (trimmed.length > maxLength) {
    throw new ValidationError(`${field} exceeds maximum length (${maxLength})`);
  }
}

function assertRenderQueuePayloadData(data: unknown) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new ValidationError('Render queue payload data must be a JSON object');
  }
}

function decodeQueuedPdf(base64: string): Buffer {
  if (!base64 || base64.trim().length === 0) {
    throw new InternalError('Render result is unavailable');
  }
  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(base64)) {
    throw new InternalError('Render result is corrupted');
  }
  const pdf = Buffer.from(base64, 'base64');
  if (pdf.length === 0) {
    throw new InternalError('Render result is unavailable');
  }
  return pdf;
}

function createRedisConnection(): ConnectionOptions {
  const url = new URL(env.REDIS_URL);
  const dbFromPath = url.pathname && url.pathname !== '/' ? Number(url.pathname.slice(1)) : undefined;

  const options: ConnectionOptions = {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: Number.isFinite(dbFromPath ?? NaN) ? dbFromPath : undefined,
    maxRetriesPerRequest: null,
  };

  if (url.protocol === 'rediss:') {
    // Minimal TLS enablement for managed redis endpoints.
    (options as Record<string, unknown>).tls = {};
  }

  return options;
}

function getQueue(): Queue {
  if (!queue) {
    queue = new Queue(env.RENDER_QUEUE_NAME, {
      connection: createRedisConnection(),
    });
  }
  return queue;
}

function mapJobStatus(state: string): RenderQueueStatus {
  if (state === 'active') return 'processing';
  if (state === 'completed') return 'completed';
  if (state === 'failed') return 'failed';
  return 'queued';
}

function getJobOptions(jobId: string): JobsOptions {
  return {
    jobId,
    attempts: env.RENDER_QUEUE_ATTEMPTS,
    backoff: env.RENDER_QUEUE_ATTEMPTS > 1
      ? { type: 'exponential', delay: env.RENDER_QUEUE_BACKOFF_MS }
      : undefined,
    removeOnComplete: {
      age: env.RENDER_QUEUE_RESULT_TTL_SECONDS,
      count: 1000,
    },
    removeOnFail: {
      age: env.RENDER_QUEUE_RESULT_TTL_SECONDS,
      count: 1000,
    },
  };
}

export function isRenderQueueEnabled() {
  return env.RENDER_QUEUE_ENABLED;
}

export function shouldAutoStartRenderWorker() {
  return env.RENDER_QUEUE_AUTO_START_WORKER;
}

export function buildRenderJobId(userId: string, idempotencyKey: string): string {
  assertNonEmptyString('userId', userId);
  assertNonEmptyString('idempotencyKey', idempotencyKey);
  const hash = createHash('sha256')
    .update(`${userId}:${idempotencyKey}`)
    .digest('hex');
  return `rjq_${hash}`;
}

export async function enqueueRenderJob(input: EnqueueRenderJobInput): Promise<EnqueueRenderJobResult> {
  assertNonEmptyString('templateId', input.templateId);
  assertRenderQueuePayloadData(input.data);
  const q = getQueue();
  const jobId = buildRenderJobId(input.userId, input.idempotencyKey);

  const existing = await q.getJob(jobId);
  if (existing) {
    return {
      jobId,
      status: mapJobStatus(await existing.getState()),
      duplicate: true,
    };
  }

  try {
    const job = await q.add(RENDER_JOB_NAME, {
      userId: input.userId,
      templateId: input.templateId,
      data: input.data,
    }, getJobOptions(jobId));

    return {
      jobId: job.id as string,
      status: 'queued',
      duplicate: false,
    };
  } catch (err) {
    const raced = await q.getJob(jobId);
    if (!raced) {
      throw err instanceof Error ? err : new Error('Failed to enqueue render job');
    }
    return {
      jobId,
      status: mapJobStatus(await raced.getState()),
      duplicate: true,
    };
  }
}

async function getOwnedJob(userId: string, jobId: string) {
  const q = getQueue();
  const job = await q.getJob(jobId);
  if (!job) return null;
  if (job.data.userId !== userId) return null;
  return job;
}

export async function getRenderJobStatus(
  userId: string,
  jobId: string
): Promise<RenderJobStatusResponse | null> {
  const job = await getOwnedJob(userId, jobId);
  if (!job) return null;

  const state = await job.getState();
  const status = mapJobStatus(state);
  const result = job.returnvalue as RenderQueueJobResult | undefined;

  return {
    job_id: jobId,
    status,
    created_at: new Date(job.timestamp).toISOString(),
    started_at: job.processedOn ? new Date(job.processedOn).toISOString() : null,
    finished_at: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
    ...(result?.renderLogId ? { render_id: result.renderLogId } : {}),
    ...(typeof result?.durationMs === 'number' ? { duration_ms: result.durationMs } : {}),
    ...(status === 'failed' ? { error: job.failedReason || 'Render failed' } : {}),
  };
}

export async function getRenderJobPdf(
  userId: string,
  jobId: string
): Promise<{ status: RenderQueueStatus; pdf?: Buffer; renderLogId?: string; durationMs?: number; error?: string } | null> {
  const job = await getOwnedJob(userId, jobId);
  if (!job) return null;

  const status = mapJobStatus(await job.getState());
  if (status !== 'completed') {
    return {
      status,
      ...(status === 'failed' ? { error: job.failedReason || 'Render failed' } : {}),
    };
  }

  const result = job.returnvalue as RenderQueueJobResult | undefined;
  if (!result?.pdfBase64) {
    return {
      status: 'failed',
      error: 'Render result is unavailable',
    };
  }

  let pdf: Buffer;
  try {
    pdf = decodeQueuedPdf(result.pdfBase64);
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Render result is unavailable',
    };
  }

  return {
    status: 'completed',
    pdf,
    renderLogId: result.renderLogId,
    durationMs: result.durationMs,
  };
}

export function startRenderQueueWorker() {
  if (worker) return worker;

  worker = new Worker(
    env.RENDER_QUEUE_NAME,
    async (job) => {
      const userId = String(job.data.userId ?? '').trim();
      const templateId = String(job.data.templateId ?? '').trim();
      assertNonEmptyString('userId', userId);
      assertNonEmptyString('templateId', templateId);
      assertRenderQueuePayloadData(job.data.data);

      const result = await executeProductionRender({
        userId,
        templateId,
        data: job.data.data as Record<string, unknown>,
        // Safety check at execution time prevents queued races from over-consuming credits.
        checkCreditsBeforeRender: true,
      });

      return {
        pdfBase64: result.pdf.toString('base64'),
        durationMs: result.durationMs,
        renderLogId: result.renderLogId,
      };
    },
    {
      connection: createRedisConnection(),
      concurrency: env.RENDER_QUEUE_CONCURRENCY,
    }
  );

  worker.on('error', (err) => {
    console.error('Render queue worker error:', err);
  });

  worker.on('failed', (job, err) => {
    console.error(`Render job failed (${job?.id ?? 'unknown'}):`, err.message);
  });

  return worker;
}

export async function closeRenderQueueConnections() {
  await worker?.close();
  await queue?.close();
  worker = null;
  queue = null;
}
