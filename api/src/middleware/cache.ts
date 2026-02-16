import { createMiddleware } from 'hono/factory';

/**
 * Cache-Control middleware. Sets the directive on successful responses (2xx).
 */
export function cacheControl(directive: string) {
  return createMiddleware(async (c, next) => {
    await next();
    if (c.res.status >= 200 && c.res.status < 300) {
      c.header('Cache-Control', directive);
    }
  });
}

/** No caching — auth, mutations, billing, usage, AI, renders */
export const noCache = cacheControl('no-store');

/** 60s browser cache + 30s stale-while-revalidate — template list, asset list */
export const shortCache = cacheControl('private, max-age=60, stale-while-revalidate=30');

/** 5min browser cache + 60s stale-while-revalidate — template detail, version detail */
export const mediumCache = cacheControl('private, max-age=300, stale-while-revalidate=60');

/** 24h immutable — content-addressed assets */
export const longCache = cacheControl('private, max-age=86400, immutable');

/** 10s public cache — health endpoint */
export const publicShortCache = cacheControl('public, max-age=10');
