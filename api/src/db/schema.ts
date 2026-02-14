import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  planTier: text('plan_tier').notNull().default('free'),
  planRenders: integer('plan_renders').notNull().default(500),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const apiKeys = sqliteTable(
  'api_keys',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    keyHash: text('key_hash').notNull().unique(),
    keyPrefix: text('key_prefix').notNull(),
    name: text('name').notNull(),
    lastUsedAt: integer('last_used_at'),
    createdAt: integer('created_at').notNull(),
    isRevoked: integer('is_revoked', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [
    index('idx_api_keys_hash').on(table.keyHash),
    index('idx_api_keys_user').on(table.userId),
  ]
);

export const templates = sqliteTable(
  'templates',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    liveVersionId: text('live_version_id'),
    isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_templates_user').on(table.userId),
    uniqueIndex('idx_templates_user_name').on(table.userId, table.name),
  ]
);

export const templateVersions = sqliteTable(
  'template_versions',
  {
    id: text('id').primaryKey(),
    templateId: text('template_id')
      .notNull()
      .references(() => templates.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    source: text('source').notNull(),
    files: text('files', { mode: 'json' }).$type<Record<string, string> | null>(),
    defaults: text('defaults', { mode: 'json' }).$type<Record<string, unknown> | null>(),
    commitMessage: text('commit_message'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_template_versions_template').on(table.templateId),
    uniqueIndex('idx_template_versions_unique').on(table.templateId, table.versionNumber),
  ]
);

export const assets = sqliteTable(
  'assets',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    r2Key: text('r2_key').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    hash: text('hash').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_assets_user').on(table.userId),
    uniqueIndex('idx_assets_user_name').on(table.userId, table.name),
  ]
);

export const renderLogs = sqliteTable(
  'render_logs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    templateId: text('template_id'),
    templateVersionId: text('template_version_id'),
    status: text('status').notNull(),
    durationMs: integer('duration_ms').notNull(),
    errorMessage: text('error_message'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('idx_render_logs_usage').on(table.userId, table.createdAt)]
);

export const oauthAccounts = sqliteTable(
  'oauth_accounts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    providerUserId: text('provider_user_id').notNull(),
    email: text('email'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_oauth_user').on(table.userId),
    uniqueIndex('idx_oauth_provider_user').on(table.provider, table.providerUserId),
  ]
);

export type UserInsert = typeof users.$inferInsert;
export type UserSelect = typeof users.$inferSelect;
export type ApiKeyInsert = typeof apiKeys.$inferInsert;
export type ApiKeySelect = typeof apiKeys.$inferSelect;
export type TemplateInsert = typeof templates.$inferInsert;
export type TemplateSelect = typeof templates.$inferSelect;
export type TemplateVersionInsert = typeof templateVersions.$inferInsert;
export type TemplateVersionSelect = typeof templateVersions.$inferSelect;
export type AssetInsert = typeof assets.$inferInsert;
export type AssetSelect = typeof assets.$inferSelect;
export type RenderLogInsert = typeof renderLogs.$inferInsert;
export type RenderLogSelect = typeof renderLogs.$inferSelect;
export type OAuthAccountInsert = typeof oauthAccounts.$inferInsert;
export type OAuthAccountSelect = typeof oauthAccounts.$inferSelect;

export const webhooks = sqliteTable(
  'webhooks',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    events: text('events', { mode: 'json' }).$type<string[]>().notNull(),
    secret: text('secret').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_webhooks_user').on(table.userId),
  ]
);

export const webhookDeliveries = sqliteTable(
  'webhook_deliveries',
  {
    id: text('id').primaryKey(),
    webhookId: text('webhook_id')
      .notNull()
      .references(() => webhooks.id, { onDelete: 'cascade' }),
    event: text('event').notNull(),
    payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
    status: text('status').notNull(), // pending | success | failed
    attempts: integer('attempts').notNull().default(0),
    lastAttemptAt: integer('last_attempt_at'),
    nextRetryAt: integer('next_retry_at'),
    responseCode: integer('response_code'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_webhook_deliveries_webhook').on(table.webhookId),
    index('idx_webhook_deliveries_status').on(table.status, table.nextRetryAt),
  ]
);

export type WebhookInsert = typeof webhooks.$inferInsert;
export type WebhookSelect = typeof webhooks.$inferSelect;
export type WebhookDeliveryInsert = typeof webhookDeliveries.$inferInsert;
export type WebhookDeliverySelect = typeof webhookDeliveries.$inferSelect;
