import { z } from 'zod';

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.string().url().default('http://localhost:5173'),
  API_URL: z.string().url().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string().min(1),
  DATABASE_AUTH_TOKEN: z.string().optional(),

  // Rust Engine
  ENGINE_URL: z.string().url().default('http://127.0.0.1:3001'),
  ENGINE_TIMEOUT_MS: z.coerce.number().default(5000),

  // Cloudflare R2
  R2_ENDPOINT: z.string().url(),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  R2_PUBLIC_URL: z.string().url(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_DEV_PRICE_ID: z.string().min(1),
  STRIPE_STARTER_PRICE_ID: z.string().min(1),
  STRIPE_PRO_PRICE_ID: z.string().min(1),

  // AI
  AI_ENABLED: z.coerce.boolean().default(true),
  GEMINI_API_KEY: z.string().min(1),
  AI_MODEL: z.string().default('gemini-2.5-flash'),

  // Sentry (optional)
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional().default(0.1),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().default('7d'),

  // OAuth
  OAUTH_GOOGLE_CLIENT_ID: z.string().optional(),
  OAUTH_GOOGLE_CLIENT_SECRET: z.string().optional(),
  OAUTH_MICROSOFT_CLIENT_ID: z.string().optional(),
  OAUTH_MICROSOFT_CLIENT_SECRET: z.string().optional(),
  OAUTH_GITHUB_CLIENT_ID: z.string().optional(),
  OAUTH_GITHUB_CLIENT_SECRET: z.string().optional(),

  // Webhooks
  WEBHOOK_TIMEOUT_MS: z.coerce.number().default(5000),
  WEBHOOK_MAX_PER_USER: z.coerce.number().default(10),

  // RAG
  RAG_ENABLED: z.coerce.boolean().default(true),
  RAG_TOP_K: z.coerce.number().default(5),
  RAG_EMBEDDING_MODEL: z.string().default('text-embedding-004'),

  // Limits
  FREE_MONTHLY_LIMIT: z.coerce.number().default(1000),
  DEV_MONTHLY_LIMIT: z.coerce.number().default(3000),
  STARTER_MONTHLY_LIMIT: z.coerce.number().default(10000),
  PRO_MONTHLY_LIMIT: z.coerce.number().default(50000),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(10),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missing = result.error.issues
      .filter((issue) => issue.code === 'invalid_type' && issue.received === 'undefined')
      .map((issue) => issue.path.join('.'));

    const invalid = result.error.issues
      .filter((issue) => !(issue.code === 'invalid_type' && issue.received === 'undefined'))
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`);

    console.error('Environment validation failed:');
    if (missing.length > 0) {
      console.error('Missing required variables:', missing.join(', '));
    }
    if (invalid.length > 0) {
      console.error('Invalid variables:', invalid.join('; '));
    }
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();

export function reloadEnv(): Env {
  const next = loadEnv();
  Object.assign(env, next);
  return env;
}

export function getPlanLimit(planTier: string): number {
  switch (planTier) {
    case 'pro':
      return env.PRO_MONTHLY_LIMIT;
    case 'starter':
      return env.STARTER_MONTHLY_LIMIT;
    case 'dev':
      return env.DEV_MONTHLY_LIMIT;
    default:
      return env.FREE_MONTHLY_LIMIT;
  }
}
