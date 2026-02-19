import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3200),
  HOST: z.string().min(1).default('0.0.0.0'),

  MCP_SERVER_TOKEN: z.string().min(16),

  DOCUFORGE_API_BASE_URL: z.string().url().default('http://localhost:3000'),
  DOCUFORGE_API_KEY: z.string().min(1),

  DOCUFORGE_JWT_TOKEN: z.string().optional(),
  DOCUFORGE_EMAIL: z.string().email().optional(),
  DOCUFORGE_PASSWORD: z.string().optional(),

  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  PDF_INLINE_MAX_BYTES: z.coerce.number().int().positive().default(750_000),
  ARTIFACT_TTL_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),

  ALLOWED_ORIGINS: z.string().default(''),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof envSchema> & {
  ALLOWED_ORIGIN_LIST: string[];
};

function parseAllowedOrigins(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${issues.join('\n')}`);
  }

  return {
    ...parsed.data,
    ALLOWED_ORIGIN_LIST: parseAllowedOrigins(parsed.data.ALLOWED_ORIGINS),
  };
}

export const env = loadEnv();
