import { Hono } from 'hono';

const health = new Hono();

const startTime = Date.now();

health.get('/health', async (c) => {
  const engineUrl = process.env.ENGINE_URL || 'http://127.0.0.1:3001';
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
