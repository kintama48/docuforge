import { Hono } from 'hono';
import { publicShortCache } from '../middleware/cache';
import { env } from '../config/env';

const health = new Hono();

const startTime = Date.now();

health.get('/health', publicShortCache, async (c) => {
  const engineUrl = env.ENGINE_URL;
  let engineStatus = 'healthy';

  try {
    const response = await fetch(`${engineUrl}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) {
      engineStatus = 'unhealthy';
    }
  } catch {
    engineStatus = 'unreachable';
  }

  const uptime = Math.floor((Date.now() - startTime) / 1000);

  return c.json({
    status: engineStatus === 'healthy' ? 'ok' : 'degraded',
    engine: engineStatus,
    version: '1.0.0',
    uptime,
  });
});

export default health;
