import { getDbClient } from './client';

const migrations = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  email_canonical TEXT UNIQUE,
  email_verified_at INTEGER,
  password_hash TEXT NOT NULL,
  stripe_customer_id TEXT,
  signup_fingerprint_hash TEXT,
  signup_ip_hash TEXT,
  plan_tier TEXT NOT NULL DEFAULT 'free',
  plan_renders INTEGER NOT NULL DEFAULT 1000,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
ALTER TABLE users ADD COLUMN email_canonical TEXT;
ALTER TABLE users ADD COLUMN email_verified_at INTEGER;
ALTER TABLE users ADD COLUMN signup_fingerprint_hash TEXT;
ALTER TABLE users ADD COLUMN signup_ip_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_canonical ON users(email_canonical);
CREATE INDEX IF NOT EXISTS idx_users_signup_fp_created ON users(signup_fingerprint_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_users_signup_ip_created ON users(signup_ip_hash, created_at);
UPDATE users SET email_canonical = lower(email) WHERE email_canonical IS NULL;
UPDATE users SET email_verified_at = coalesce(email_verified_at, created_at);

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT UNIQUE NOT NULL,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL,
  last_used_at INTEGER,
  created_at INTEGER NOT NULL,
  is_revoked INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  live_version_id TEXT,
  is_public INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_templates_user ON templates(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_user_name ON templates(user_id, name);

-- Template Versions table
CREATE TABLE IF NOT EXISTS template_versions (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  source TEXT NOT NULL,
  files TEXT,
  defaults TEXT,
  low_code_spec TEXT,
  commit_message TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_template_versions_template ON template_versions(template_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_template_versions_unique ON template_versions(template_id, version_number);
ALTER TABLE template_versions ADD COLUMN low_code_spec TEXT;

-- Assets table
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assets_user ON assets(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_user_name ON assets(user_id, name);

-- Render Logs table
CREATE TABLE IF NOT EXISTS render_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id TEXT,
  template_version_id TEXT,
  status TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  error_message TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_render_logs_usage ON render_logs(user_id, created_at);

-- AI usage logs
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'consumed',
  tokens_used INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_created ON ai_usage_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_feature_created ON ai_usage_logs(feature, created_at);

-- OAuth Accounts table
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  email TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_oauth_user ON oauth_accounts(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_provider_user ON oauth_accounts(provider, provider_user_id);

-- Auth OTP challenges
CREATE TABLE IF NOT EXISTS auth_otp_challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  resend_available_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  sent_count INTEGER NOT NULL DEFAULT 1,
  consumed_at INTEGER,
  metadata TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_otp_user_purpose ON auth_otp_challenges(user_id, purpose);
CREATE INDEX IF NOT EXISTS idx_auth_otp_active ON auth_otp_challenges(purpose, consumed_at, expires_at);

-- User device pins / abuse guard
CREATE TABLE IF NOT EXISTS user_pins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fingerprint_hash TEXT NOT NULL,
  ip_hash TEXT,
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_pins_user_fingerprint ON user_pins(user_id, fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_user_pins_fingerprint ON user_pins(fingerprint_hash, last_seen_at);

-- Refresh tokens for rotating browser sessions
CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  last_used_at INTEGER,
  revoked_at INTEGER,
  replaced_by_token_hash TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_user ON auth_refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_expires ON auth_refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_revoked ON auth_refresh_tokens(revoked_at);

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT NOT NULL,
  secret TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id);

-- Webhook Deliveries table
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id TEXT PRIMARY KEY,
  webhook_id TEXT NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at INTEGER,
  next_retry_at INTEGER,
  response_code INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status, next_retry_at);

-- Backfill plan limits for existing users after limit changes.
UPDATE users SET plan_renders = 1000 WHERE plan_tier = 'free' AND plan_renders < 1000;
UPDATE users SET plan_renders = 3000 WHERE plan_tier = 'dev' AND plan_renders < 3000;

-- KAN-60: preview image URL for official templates
ALTER TABLE templates ADD COLUMN preview_url TEXT;
`;

export async function runMigrations() {
  const client = getDbClient();

  const statements = migrations
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    try {
      await client.execute(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('duplicate column name: low_code_spec')) {
        continue;
      }
      if (message.includes('duplicate column name: email_canonical')) {
        continue;
      }
      if (message.includes('duplicate column name: email_verified_at')) {
        continue;
      }
      if (message.includes('duplicate column name: signup_fingerprint_hash')) {
        continue;
      }
      if (message.includes('duplicate column name: signup_ip_hash')) {
        continue;
      }
      if (message.includes('duplicate column name: preview_url')) {
        continue;
      }
      throw error;
    }
  }

  console.log('Migrations completed successfully');
}

if (import.meta.main) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
