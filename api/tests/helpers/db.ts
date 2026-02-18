/**
 * Database helper for tests.
 * Creates fresh in-memory SQLite databases using Bun's native SQLite.
 */
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from '../../src/db/schema';

export type TestDb = ReturnType<typeof drizzle<typeof schema>>;

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  stripe_customer_id TEXT,
  plan_tier TEXT NOT NULL DEFAULT 'free',
  plan_renders INTEGER NOT NULL DEFAULT 500,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

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
`;

/**
 * Creates a fresh in-memory SQLite database with full schema.
 * Each call returns a new isolated database instance.
 */
export function createTestDatabase(): { db: TestDb; sqlite: Database } {
  const sqlite = new Database(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');

  // Apply schema
  const statements = MIGRATION_SQL
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    sqlite.exec(statement);
  }

  const db = drizzle(sqlite, { schema });

  return { db, sqlite };
}

/**
 * Closes and cleans up the database connection.
 */
export function closeTestDatabase(sqlite: Database): void {
  sqlite.close();
}

export { schema };
