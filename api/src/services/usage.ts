import { eq, and, gte, sql } from 'drizzle-orm';
import { getDb, schema } from '../db/client';
import { generateLogId } from '../lib/id';
import { getPlanLimit } from '../config/env';

export interface CreditCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  plan: string;
  periodStart: Date;
  periodEnd: Date;
}

function getMonthBounds(): { start: number; end: number } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.getTime(), end: end.getTime() };
}

export async function checkCredits(userId: string): Promise<CreditCheckResult> {
  const db = getDb();
  const { start, end } = getMonthBounds();

  // Get user's plan
  const [user] = await db
    .select({ planTier: schema.users.planTier, planRenders: schema.users.planRenders })
    .from(schema.users)
    .where(eq(schema.users.id, userId));

  if (!user) {
    return {
      allowed: false,
      used: 0,
      limit: 0,
      remaining: 0,
      plan: 'unknown',
      periodStart: new Date(start),
      periodEnd: new Date(end),
    };
  }

  const limit = user.planRenders || getPlanLimit(user.planTier);

  // Count successful production renders this month (exclude preview renders where templateId is NULL)
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(schema.renderLogs)
    .where(
      and(
        eq(schema.renderLogs.userId, userId),
        eq(schema.renderLogs.status, 'success'),
        gte(schema.renderLogs.createdAt, start),
        sql`${schema.renderLogs.templateId} IS NOT NULL`
      )
    );

  const used = result?.count || 0;
  const remaining = Math.max(0, limit - used);

  return {
    allowed: used < limit,
    used,
    limit,
    remaining,
    plan: user.planTier,
    periodStart: new Date(start),
    periodEnd: new Date(end),
  };
}

export interface RenderLogParams {
  userId: string;
  templateId?: string | null;
  templateVersionId?: string | null;
  status: 'success' | 'error';
  durationMs: number;
  errorMessage?: string | null;
}

export async function logRender(params: RenderLogParams): Promise<string> {
  const db = getDb();
  const logId = generateLogId();
  const now = Date.now();

  await db.insert(schema.renderLogs).values({
    id: logId,
    userId: params.userId,
    templateId: params.templateId || null,
    templateVersionId: params.templateVersionId || null,
    status: params.status,
    durationMs: params.durationMs,
    errorMessage: params.errorMessage || null,
    createdAt: now,
  });

  return logId;
}

export function formatUsageResponse(credits: CreditCheckResult) {
  return {
    plan: credits.plan,
    renders: {
      used: credits.used,
      limit: credits.limit,
      remaining: credits.remaining,
    },
    period: {
      start: credits.periodStart.toISOString(),
      end: credits.periodEnd.toISOString(),
    },
  };
}
