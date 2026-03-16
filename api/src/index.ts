import { createApp } from './app';
import { runMigrations } from './db/migrate';
import { env } from './config/env';

const app = createApp();

// Run migrations on startup
await runMigrations();

const port = env.PORT;

console.log(`Starting DocuForge API on port ${port}...`);

export default {
  port,
  fetch: app.fetch,
};
