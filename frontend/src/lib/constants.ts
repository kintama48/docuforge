// FE-m3 fix: Use consistent types. null = unlimited, number = limit.
// Display formatting (e.g., "Unlimited", "Custom") belongs in the UI layer.
type PlanLimits = {
  renders: number | null;
  aiCredits: number | null;
  templates: number | null;
  assetsBytes: number | null;
};

export type PlanLimitTier = "free" | "dev" | "starter" | "pro" | "enterprise";

export const planLimits: Record<PlanLimitTier, PlanLimits> = {
  free: {
    renders: 1000,
    aiCredits: 5,
    templates: 10,
    assetsBytes: 50 * 1024 * 1024,
  },
  dev: {
    renders: 3000,
    aiCredits: 10,
    templates: 25,
    assetsBytes: 150 * 1024 * 1024,
  },
  starter: {
    renders: 10_000,
    aiCredits: 20,
    templates: null,
    assetsBytes: 500 * 1024 * 1024,
  },
  pro: {
    renders: 50_000,
    aiCredits: 50,
    templates: null,
    assetsBytes: 2 * 1024 * 1024 * 1024,
  },
  enterprise: {
    renders: null,
    aiCredits: null,
    templates: null,
    assetsBytes: null,
  },
};

export const apiKeyPrefix = "docu_live_";
