import { z } from 'zod';

const envBoolean = z.preprocess((value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', 'off', ''].includes(normalized)) return false;
  }
  return value;
}, z.boolean());

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

  // Redis render queue
  REDIS_URL: z.string().url().default('redis://127.0.0.1:6379'),
  RENDER_QUEUE_ENABLED: envBoolean.default(false),
  RENDER_QUEUE_AUTO_START_WORKER: envBoolean.default(true),
  RENDER_QUEUE_NAME: z.string().min(1).default('docuforge-render'),
  RENDER_QUEUE_CONCURRENCY: z.coerce.number().int().positive().default(2),
  RENDER_QUEUE_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  RENDER_QUEUE_BACKOFF_MS: z.coerce.number().int().min(0).default(2000),
  RENDER_QUEUE_RESULT_TTL_SECONDS: z.coerce.number().int().positive().default(3600),

  // Cloudflare R2
  R2_ENDPOINT: z.string().url(),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  R2_PUBLIC_URL: z.string().url(),

  // Billing
  BILLING_ENABLED: envBoolean.default(false),
  BILLING_PROVIDER: z.enum(['none', 'paddle', 'lemonsqueezy']).default('none'),
  BILLING_SUCCESS_URL: z.string().url().optional(),
  BILLING_CANCEL_URL: z.string().url().optional(),

  // Paddle
  PADDLE_API_KEY: z.string().optional(),
  PADDLE_API_URL: z.string().url().default('https://api.paddle.com'),
  PADDLE_WEBHOOK_SECRET: z.string().optional(),
  PADDLE_PRICE_ID_STARTER: z.string().optional(),
  PADDLE_PRICE_ID_PRO: z.string().optional(),

  // Lemon Squeezy
  LEMONSQUEEZY_API_KEY: z.string().optional(),
  LEMONSQUEEZY_API_URL: z.string().url().default('https://api.lemonsqueezy.com/v1'),
  LEMONSQUEEZY_WEBHOOK_SECRET: z.string().optional(),
  LEMONSQUEEZY_STORE_ID: z.string().optional(),
  LEMONSQUEEZY_VARIANT_ID_STARTER: z.string().optional(),
  LEMONSQUEEZY_VARIANT_ID_PRO: z.string().optional(),

  // AI
  AI_ENABLED: envBoolean.default(true),
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
  RAG_ENABLED: envBoolean.default(true),
  RAG_TOP_K: z.coerce.number().default(5),
  RAG_EMBEDDING_MODEL: z.string().default('text-embedding-004'),

  // Limits
  FREE_MONTHLY_LIMIT: z.coerce.number().default(500),
  STARTER_MONTHLY_LIMIT: z.coerce.number().default(10000),
  PRO_MONTHLY_LIMIT: z.coerce.number().default(50000),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(10),
}).superRefine((value, ctx) => {
  if (!value.BILLING_ENABLED) {
    return;
  }

  if (value.BILLING_PROVIDER === 'none') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'BILLING_PROVIDER must not be "none" when BILLING_ENABLED=true',
      path: ['BILLING_PROVIDER'],
    });
    return;
  }

  if (value.BILLING_PROVIDER === 'paddle') {
    const required: Array<keyof typeof value> = [
      'PADDLE_API_KEY',
      'PADDLE_WEBHOOK_SECRET',
      'PADDLE_PRICE_ID_STARTER',
      'PADDLE_PRICE_ID_PRO',
    ];
    for (const key of required) {
      if (!value[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${key} is required when BILLING_PROVIDER=paddle`,
          path: [key],
        });
      }
    }
  }

  if (value.BILLING_PROVIDER === 'lemonsqueezy') {
    const required: Array<keyof typeof value> = [
      'LEMONSQUEEZY_API_KEY',
      'LEMONSQUEEZY_WEBHOOK_SECRET',
      'LEMONSQUEEZY_STORE_ID',
      'LEMONSQUEEZY_VARIANT_ID_STARTER',
      'LEMONSQUEEZY_VARIANT_ID_PRO',
    ];
    for (const key of required) {
      if (!value[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${key} is required when BILLING_PROVIDER=lemonsqueezy`,
          path: [key],
        });
      }
    }
  }
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
    default:
      return env.FREE_MONTHLY_LIMIT;
  }
}
