import { createMiddleware } from 'hono/factory';
import { generateRequestId } from '../lib/id';

export const requestLogger = createMiddleware(async (c, next) => {
  const requestId = generateRequestId();
  const start = Date.now();

  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);

  await next();

  const duration = Date.now() - start;
  const auth = c.get('auth');

  // Log as structured JSON
  const logEntry = {
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration_ms: duration,
    user_id: auth?.userId || null,
    request_id: requestId,
    ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
  };

  console.log(JSON.stringify(logEntry));
});

declare module 'hono' {
  interface ContextVariableMap {
    requestId: string;
  }
}
