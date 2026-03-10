import type { PlanTier } from '../types';

const PLAN_TIERS = ['free', 'dev', 'starter', 'pro'] as const satisfies readonly PlanTier[];

export type RequestRateLimitScope = 'render' | 'preview' | 'ai' | 'default';
export type ConsoleRateLimitScope = 'session' | 'authMutation';

export interface PlanRateLimitConfig {
  windowMs: number;
  limits: Record<PlanTier, number>;
}

export interface ConsoleRateLimitConfig {
  windowMs: number;
  limit: number;
}

interface AppConfig {
  planMonthlyRenderLimits: Record<PlanTier, number>;
  planMonthlyAiCreditLimits: Record<PlanTier, number>;
  requestRateLimits: Record<RequestRateLimitScope, PlanRateLimitConfig>;
  consoleRateLimits: Record<ConsoleRateLimitScope, ConsoleRateLimitConfig>;
  maxUploadSizeMb: number;
}

export const appConfig = {
  planMonthlyRenderLimits: {
    free: 1000,
    dev: 3000,
    starter: 10000,
    pro: 50000,
  },
  planMonthlyAiCreditLimits: {
    free: 5,
    dev: 25,
    starter: 120,
    pro: 600,
  },
  requestRateLimits: {
    render: {
      windowMs: 60 * 1000,
      limits: { free: 15, dev: 45, starter: 120, pro: 300 },
    },
    preview: {
      windowMs: 60 * 1000,
      limits: { free: 30, dev: 30, starter: 30, pro: 30 },
    },
    ai: {
      windowMs: 60 * 60 * 1000,
      limits: { free: 5, dev: 10, starter: 20, pro: 50 },
    },
    default: {
      windowMs: 60 * 1000,
      limits: { free: 60, dev: 60, starter: 60, pro: 60 },
    },
  },
  consoleRateLimits: {
    session: {
      windowMs: 60 * 1000,
      limit: 120,
    },
    authMutation: {
      windowMs: 5 * 60 * 1000,
      limit: 12,
    },
  },
  maxUploadSizeMb: 10,
} as const satisfies AppConfig;

function normalizePlanTier(planTier: string): PlanTier {
  for (const tier of PLAN_TIERS) {
    if (planTier === tier) {
      return tier;
    }
  }
  return 'free';
}

function isRequestRateLimitScope(value: string): value is RequestRateLimitScope {
  return value === 'render' || value === 'preview' || value === 'ai' || value === 'default';
}

export function getPlanMonthlyRenderDefault(planTier: string): number {
  const tier = normalizePlanTier(planTier);
  return appConfig.planMonthlyRenderLimits[tier];
}

export function getPlanMonthlyAiCreditDefault(planTier: string): number {
  const tier = normalizePlanTier(planTier);
  return appConfig.planMonthlyAiCreditLimits[tier];
}

export function getRequestRateLimitConfig(scope: string): PlanRateLimitConfig {
  if (isRequestRateLimitScope(scope)) {
    return appConfig.requestRateLimits[scope];
  }
  return appConfig.requestRateLimits.default;
}

export function getConsoleRateLimitConfig(scope: ConsoleRateLimitScope): ConsoleRateLimitConfig {
  return appConfig.consoleRateLimits[scope];
}
