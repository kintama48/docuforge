import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { compress } from 'hono/compress';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/logger';
import { env } from './config/env';
import { initSentry } from './lib/sentry';
import { initVectorStore } from './services/vector-store';
import health from './routes/health';
import auth from './routes/auth';
import render from './routes/render';
import billing from './routes/billing';
import templates from './routes/templates';
import assets from './routes/assets';
import ai from './routes/ai';
import webhooksRoute from './routes/webhooks';
import {
  isRenderQueueEnabled,
  shouldAutoStartRenderWorker,
  startRenderQueueWorker,
} from './services/render-queue';

let sentryInitialized = false;
let renderWorkerInitialized = false;
let ragInitStarted = false;

export function createApp() {
  // Initialize Sentry once on first app creation
  if (!sentryInitialized) {
    initSentry(env.SENTRY_DSN, env.SENTRY_ENVIRONMENT ?? env.NODE_ENV, env.SENTRY_TRACES_SAMPLE_RATE);
    sentryInitialized = true;
  }

  const app = new Hono();

  // Global middleware - Configure CORS with specific allowed origins
  const allowedOrigins = [env.APP_URL];
  // Allow localhost in development
  if (env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173');
  }

  app.use(
    '*',
    cors({
      origin: allowedOrigins,
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'Idempotency-Key', 'X-Idempotency-Key'],
      credentials: true,
      maxAge: 86400,
    })
  );
  app.use('*', compress());
  app.use('*', requestLogger);

  // Vary header for correct caching of authenticated + compressed responses
  app.use('*', async (c, next) => {
    await next();
    c.header('Vary', 'Authorization, X-API-Key, Accept-Encoding');
  });

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
  app.route('/v1/webhooks', webhooksRoute);

  // Initialize RAG vector store (non-blocking, logs warning on failure)
  if (env.RAG_ENABLED && !ragInitStarted) {
    ragInitStarted = true;
    initVectorStore().catch((err) => {
      console.warn('RAG vector store initialization failed:', err.message);
      console.warn('AI features will work without documentation context');
    });
  }

  if (isRenderQueueEnabled() && shouldAutoStartRenderWorker() && !renderWorkerInitialized) {
    startRenderQueueWorker();
    renderWorkerInitialized = true;
    console.log('Render queue worker auto-started in API process');
  }

  return app;
}
