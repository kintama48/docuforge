import { drizzle } from 'drizzle-orm/libsql';
import { sql } from 'drizzle-orm';
import { createClient } from '@libsql/client';
import * as schema from './schema';

let dbClient: ReturnType<typeof createClient> | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDbClient() {
  if (!dbClient) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is required');
    }

    dbClient = createClient({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
  }
  return dbClient;
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getDbClient(), { schema });
  }
  return dbInstance;
}

/**
 * Reset the database singleton. Used for testing to ensure
 * each test gets a fresh database connection.
 */
export function resetDb() {
  dbClient = null;
  dbInstance = null;
}

/**
 * Initialize an in-memory database with schema for testing.
 * Must be called after resetDb() and before using getDb().
 */
export async function initTestDb() {
  resetDb();
  const db = getDb();

  // Create tables
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      stripe_customer_id TEXT,
      plan_tier TEXT NOT NULL DEFAULT 'free',
      plan_renders INTEGER NOT NULL DEFAULT 1000,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key_hash TEXT UNIQUE NOT NULL,
      key_prefix TEXT NOT NULL,
      name TEXT NOT NULL,
      last_used_at INTEGER,
      created_at INTEGER NOT NULL,
      is_revoked INTEGER NOT NULL DEFAULT 0
    )
  `);

  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)`);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      live_version_id TEXT,
      is_public INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_user_name ON templates(user_id, name)`);

  await db.run(sql`
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
    )
  `);

  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_template_versions_unique ON template_versions(template_id, version_number)`);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      r2_key TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_user_name ON assets(user_id, name)`);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS render_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      template_id TEXT,
      template_version_id TEXT,
      status TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      error_message TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_render_logs_usage ON render_logs(user_id, created_at)`);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS oauth_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_user_id TEXT NOT NULL,
      email TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_oauth_user ON oauth_accounts(user_id)`);
  await db.run(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_provider_user ON oauth_accounts(provider, provider_user_id)`
  );

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      events TEXT NOT NULL,
      secret TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    )
  `);

  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id)`);

  await db.run(sql`
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
    )
  `);

  await db.run(
    sql`CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id)`
  );
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status, next_retry_at)`
  );

  return db;
}

export { schema };
