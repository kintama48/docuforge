import { createApp } from './app';
import { runMigrations } from './db/migrate';

const app = createApp();

// Run migrations on startup
await runMigrations();

const port = parseInt(process.env.PORT || '3000', 10);

console.log(`Starting DocuForge API on port ${port}...`);

export default {
  port,
  fetch: app.fetch,
};
