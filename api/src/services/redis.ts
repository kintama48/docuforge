import IORedis from 'ioredis';
import { env } from '../config/env';

let redisClient: IORedis | null = null;

async function ensureConnected(client: IORedis): Promise<void> {
  if (client.status === 'wait') {
    await client.connect();
  }
}

export function getRedisClient(): IORedis | null {
  if (env.NODE_ENV === 'test') {
    return null;
  }

  if (!redisClient) {
    redisClient = new IORedis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 1000,
      retryStrategy(times) {
        if (times > 5) return null;
        return Math.min(200 * times, 1000);
      },
    });

    redisClient.on('error', (err) => {
      console.warn('Redis client error:', err instanceof Error ? err.message : String(err));
    });
  }

  return redisClient;
}

export async function withRedis<T>(operation: (client: IORedis) => Promise<T>): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    await ensureConnected(client);
    return await operation(client);
  } catch (err) {
    console.warn('Redis operation failed, falling back to in-process behavior');
    return null;
  }
}

export async function closeRedisClient(): Promise<void> {
  if (!redisClient) return;
  try {
    await redisClient.quit();
  } catch {
    try {
      redisClient.disconnect();
    } catch {
      // ignore close errors
    }
  } finally {
    redisClient = null;
  }
}
