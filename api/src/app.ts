import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/logger';
import health from './routes/health';
import auth from './routes/auth';
import render from './routes/render';
import billing from './routes/billing';
import templates from './routes/templates';
import assets from './routes/assets';
import ai from './routes/ai';

export function createApp() {
  const app = new Hono();

  // Global middleware
  app.use('*', cors());
  app.use('*', requestLogger);

  // Error handler
  app.onError(errorHandler);

  // Mount routes
  app.route('/', health);
  app.route('/v1/auth', auth);
  app.route('/v1/render', render);
  app.route('/v1', billing);  // Mounts /v1/usage, /v1/billing/checkout, /v1/billing/webhook
  app.route('/v1/templates', templates);
  app.route('/v1/assets', assets);
  app.route('/v1/ai', ai);

  return app;
}
