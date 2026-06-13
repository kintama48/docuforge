import { z } from 'zod';
import { appConfig } from './config';

const envBoolean = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off', ''].includes(normalized)) return false;
  }

  return value;
}, z.boolean());

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.string().url().default('http://localhost:5173'),
  APP_ALLOWED_ORIGINS: z.string().optional(),
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

  // Billing providers
  BILLING_PROVIDER: z.enum(['paddle', 'lemonsqueezy']).default('paddle'),
  PADDLE_WEBHOOK_SECRET: z.string().min(1).default('paddle-webhook-secret'),
  PADDLE_PRICE_ID_DEV: z.string().min(1).default('paddle-dev-plan'),
  PADDLE_PRICE_ID_STARTER: z.string().min(1).default('paddle-starter-plan'),
  PADDLE_PRICE_ID_PRO: z.string().min(1).default('paddle-pro-plan'),
  LEMONSQUEEZY_WEBHOOK_SECRET: z.string().min(1).default('lemonsqueezy-webhook-secret'),
  LEMONSQUEEZY_VARIANT_ID_DEV: z.string().min(1).default('lemon-dev-plan'),
  LEMONSQUEEZY_VARIANT_ID_STARTER: z.string().min(1).default('lemon-starter-plan'),
  LEMONSQUEEZY_VARIANT_ID_PRO: z.string().min(1).default('lemon-pro-plan'),

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
  AUTH_ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
  AUTH_EMAIL_VERIFICATION_REQUIRED: envBoolean.default(process.env.NODE_ENV === 'test' ? false : true),
  AUTH_2FA_REQUIRED: envBoolean.default(process.env.NODE_ENV === 'test' ? false : true),
  AUTH_OTP_TTL_MS: z.coerce.number().int().positive().default(10 * 60 * 1000),
  AUTH_OTP_RESEND_COOLDOWN_MS: z.coerce.number().int().positive().default(30 * 1000),
  AUTH_OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  AUTH_OTP_MAX_SENDS: z.coerce.number().int().positive().default(5),
  AUTH_MAX_ACCOUNTS_PER_FINGERPRINT: z.coerce.number().int().positive().default(3),
  AUTH_MAX_SIGNUPS_PER_FINGERPRINT_PER_DAY: z.coerce.number().int().positive().default(3),
  AUTH_MAX_SIGNUPS_PER_IP_PER_DAY: z.coerce.number().int().positive().default(6),
  AUTH_COOKIE_NAME: z.string().min(1).default('docuforge_session'),
  AUTH_COOKIE_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 7),
  AUTH_REFRESH_COOKIE_NAME: z.string().min(1).default('docuforge_refresh'),
  AUTH_REFRESH_TOKEN_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 3),
  AUTH_COOKIE_DOMAIN: z.string().optional(),
  AUTH_COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('strict'),

  // Legal URLs (used in email footers — always rendered, defaults to marketing site)
  LEGAL_TERMS_URL: z.string().url().default('https://docuforge.app/terms'),
  LEGAL_PRIVACY_URL: z.string().url().default('https://docuforge.app/privacy'),

  // Transactional email
  EMAIL_PROVIDER: z.enum(['mock', 'resend']).default('mock'),
  EMAIL_FROM: z.string().email().default('noreply@docuforge.app'),
  EMAIL_FROM_NOREPLY: z.string().email().default('noreply@docuforge.app'),
  EMAIL_FROM_SUPPORT: z.string().email().default('support@docuforge.app'),
  EMAIL_FROM_HELLO: z.string().email().default('hello@docuforge.app'),
  EMAIL_FROM_BILLING: z.string().email().default('billing@docuforge.app'),
  EMAIL_RESEND_MAX_PER_SECOND: z.coerce.number().int().positive().default(1),
  EMAIL_RESEND_MAX_PER_MINUTE: z.coerce.number().int().positive().default(30),
  EMAIL_RESEND_MAX_PER_DAY: z.coerce.number().int().positive().default(90),
  EMAIL_RESEND_MAX_RETRIES: z.coerce.number().int().positive().default(6),
  EMAIL_RESEND_RETRY_BASE_MS: z.coerce.number().int().positive().default(750),
  EMAIL_RESEND_RETRY_MAX_MS: z.coerce.number().int().positive().default(10_000),
  RESEND_API_KEY: z.string().optional(),

  // Social links (optional — only render email footer icons when set)
  SOCIAL_INSTAGRAM_URL: z.string().url().optional(),
  SOCIAL_TWITTER_URL: z.string().url().optional(),
  SOCIAL_FACEBOOK_URL: z.string().url().optional(),
  SOCIAL_LINKEDIN_URL: z.string().url().optional(),
  SOCIAL_YOUTUBE_URL: z.string().url().optional(),
  SOCIAL_GITHUB_URL: z.string().url().optional(),

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
  WEBHOOK_QUEUE_ENABLED: z.coerce.boolean().default(true),
  WEBHOOK_QUEUE_NAME: z.string().min(1).default('docuforge-webhook-delivery'),
  WEBHOOK_QUEUE_CONCURRENCY: z.coerce.number().int().positive().default(10),
  WEBHOOK_QUEUE_ATTEMPTS: z.coerce.number().int().positive().default(3),
  WEBHOOK_QUEUE_BACKOFF_MS: z.coerce.number().int().positive().default(30000),

  // Render queue
  REDIS_URL: z.string().url().default('redis://127.0.0.1:6379'),
  RENDER_QUEUE_ENABLED: envBoolean.default(false),
  RENDER_QUEUE_NAME: z.string().min(1).default('docuforge-render-jobs'),
  RENDER_QUEUE_CONCURRENCY: z.coerce.number().int().positive().default(2),
  RENDER_QUEUE_ATTEMPTS: z.coerce.number().int().positive().default(3),
  RENDER_QUEUE_BACKOFF_MS: z.coerce.number().int().nonnegative().default(750),
  RENDER_QUEUE_RESULT_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  RENDER_QUEUE_AUTO_START_WORKER: envBoolean.default(false),

  // RAG
  RAG_ENABLED: envBoolean.default(true),
  RAG_TOP_K: z.coerce.number().default(5),
  RAG_EMBEDDING_MODEL: z.string().default('text-embedding-004'),

  // Limits
  FREE_MONTHLY_LIMIT: z.coerce.number().default(appConfig.planMonthlyRenderLimits.free),
  DEV_MONTHLY_LIMIT: z.coerce.number().default(appConfig.planMonthlyRenderLimits.dev),
  STARTER_MONTHLY_LIMIT: z.coerce.number().default(appConfig.planMonthlyRenderLimits.starter),
  PRO_MONTHLY_LIMIT: z.coerce.number().default(appConfig.planMonthlyRenderLimits.pro),
  FREE_MONTHLY_AI_CREDITS: z.coerce.number().default(appConfig.planMonthlyAiCreditLimits.free),
  DEV_MONTHLY_AI_CREDITS: z.coerce.number().default(appConfig.planMonthlyAiCreditLimits.dev),
  STARTER_MONTHLY_AI_CREDITS: z.coerce.number().default(appConfig.planMonthlyAiCreditLimits.starter),
  PRO_MONTHLY_AI_CREDITS: z.coerce.number().default(appConfig.planMonthlyAiCreditLimits.pro),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(appConfig.maxUploadSizeMb),

  // Public preview hardening
  PUBLIC_PREVIEW_SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(1800),
  PUBLIC_PREVIEW_MAX_RENDERS_PER_SESSION: z.coerce.number().int().positive().default(30),
  PUBLIC_PREVIEW_MAX_SESSIONS: z.coerce.number().int().positive().default(10000),
  PUBLIC_PREVIEW_IP_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(60),
  PUBLIC_PREVIEW_SESSION_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(12),
  PUBLIC_PREVIEW_SESSION_CREATE_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(20),
  PUBLIC_PREVIEW_ALLOWED_ORIGINS: z.string().optional(),
  PUBLIC_PREVIEW_WATERMARK_LABEL: z.string().min(4).max(120).default('DOCUFORGE PUBLIC PREVIEW · NOT FOR PRODUCTION'),
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

export function getPlanAiCreditLimit(planTier: string): number {
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
