import { and, eq, gte, sql } from 'drizzle-orm';
import { getDb, schema } from '../db/client';
import { env } from '../config/env';
import { generateLogId } from '../lib/id';
import { LimitExceededError } from '../lib/errors';

type AiUsageFeature = 'pdf_import';

export interface AiCreditCheckResult {
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

function getPlanAiLimit(planTier: string): number {
  switch (planTier) {
    case 'pro':
      return env.PRO_MONTHLY_AI_CREDITS;
    case 'starter':
      return env.STARTER_MONTHLY_AI_CREDITS;
    case 'dev':
      return env.DEV_MONTHLY_AI_CREDITS;
    default:
      return env.FREE_MONTHLY_AI_CREDITS;
  }
}

export async function checkAiCredits(userId: string): Promise<AiCreditCheckResult> {
  const db = getDb();
  const { start, end } = getMonthBounds();

  const [user] = await db
    .select({ planTier: schema.users.planTier })
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

  const limit = getPlanAiLimit(user.planTier);

  const [result] = await db
    .select({ count: sql<number>`COALESCE(SUM(${schema.aiUsageLogs.creditsUsed}), 0)` })
    .from(schema.aiUsageLogs)
    .where(
      and(
        eq(schema.aiUsageLogs.userId, userId),
        gte(schema.aiUsageLogs.createdAt, start)
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

export async function consumeAiCreditOrThrow(
  userId: string,
  feature: AiUsageFeature,
  credits = 1
): Promise<string> {
  const check = await checkAiCredits(userId);
  if (!check.allowed || check.remaining < credits) {
    throw new LimitExceededError(
      `Monthly AI credit limit reached (${check.used}/${check.limit})`,
      {
        usage: {
          used: check.used,
          limit: check.limit,
          plan: check.plan,
          resets_at: check.periodEnd.toISOString(),
        },
        upgrade_url: 'https://www.docuforge.app/pricing',
      }
    );
  }

  const db = getDb();
  const logId = generateLogId();

  await db.insert(schema.aiUsageLogs).values({
    id: logId,
    userId,
    feature,
    creditsUsed: credits,
    status: 'consumed',
    tokensUsed: 0,
    createdAt: Date.now(),
  });

  return logId;
}

export async function updateAiUsageLog(
  id: string,
  input: { tokensUsed?: number; status?: 'consumed' | 'failed'; errorMessage?: string | null }
): Promise<void> {
  const db = getDb();
  await db
    .update(schema.aiUsageLogs)
    .set({
      ...(input.tokensUsed !== undefined ? { tokensUsed: input.tokensUsed } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.errorMessage !== undefined ? { errorMessage: input.errorMessage } : {}),
    })
    .where(eq(schema.aiUsageLogs.id, id));
}

export function formatAiUsageResponse(credits: AiCreditCheckResult) {
  return {
    ai_credits: {
      used: credits.used,
      limit: credits.limit,
      remaining: credits.remaining,
    },
    ai_period: {
      start: credits.periodStart.toISOString(),
      end: credits.periodEnd.toISOString(),
    },
  };
}

