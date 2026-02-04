export const planLimits = {
  free: {
    renders: 500,
    aiCredits: 5,
    templates: 10,
    assets: "50MB",
  },
  starter: {
    renders: 10_000,
    aiCredits: 20,
    templates: "Unlimited",
    assets: "500MB",
  },
  pro: {
    renders: 50_000,
    aiCredits: 50,
    templates: "Unlimited",
    assets: "2GB",
  },
  enterprise: {
    renders: "Custom",
    aiCredits: "Custom",
    templates: "Custom",
    assets: "Custom",
  },
} as const;

export const apiKeyPrefix = "docu_live_";
