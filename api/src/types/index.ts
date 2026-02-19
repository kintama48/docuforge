export type PlanTier = 'free' | 'starter' | 'pro';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  stripeCustomerId: string | null;
  planTier: PlanTier;
  planRenders: number;
  createdAt: number;
  updatedAt: number;
}

export interface ApiKey {
  id: string;
  userId: string;
  keyHash: string;
  keyPrefix: string;
  name: string;
  lastUsedAt: number | null;
  createdAt: number;
  isRevoked: boolean;
}

export interface Template {
  id: string;
  userId: string | null;
  name: string;
  description: string | null;
  liveVersionId: string | null;
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  versionNumber: number;
  source: string;
  files: Record<string, string> | null;
  defaults: Record<string, unknown> | null;
  commitMessage: string | null;
  createdAt: number;
}

export interface Asset {
  id: string;
  userId: string;
  name: string;
  r2Key: string;
  mimeType: string;
  sizeBytes: number;
  hash: string;
  createdAt: number;
}

export interface RenderLog {
  id: string;
  userId: string;
  templateId: string | null;
  templateVersionId: string | null;
  status: 'success' | 'error';
  durationMs: number;
  errorMessage: string | null;
  createdAt: number;
}

export interface EngineAsset {
  name: string;
  url: string;
  hash: string;
}

export interface EnginePayload {
  template: {
    main: string;
    files: Record<string, string>;
  };
  data: Record<string, unknown>;
  assets: EngineAsset[];
  options: {
    timeout_ms: number;
    cache?: {
      cacheable: boolean;
      template_fingerprint?: string;
      version_id?: string;
    };
    encryption?: {
      mode: 'aes256';
      permissions: 'print_only';
      user_password: string;
    };
  };
}

export interface EngineErrorResponse {
  error: string;
  message?: string;
  span?: {
    file: string;
    line: number;
    column: number;
  };
}

export interface JwtPayload {
  sub: string; // user_id
  email: string;
  iat: number;
  exp: number;
}

export interface AuthContext {
  userId: string;
  email?: string;
  planTier?: PlanTier;
}

export type WebhookEvent = 'render.completed' | 'render.failed';

export interface Webhook {
  id: string;
  userId: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  isActive: boolean;
  createdAt: number;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  status: 'pending' | 'success' | 'failed';
  attempts: number;
  lastAttemptAt: number | null;
  nextRetryAt: number | null;
  responseCode: number | null;
  createdAt: number;
}
