import { createMiddleware } from 'hono/factory';

/**
 * ETag middleware for GET responses. Computes a weak ETag from the response body
 * and returns 304 Not Modified if the client's If-None-Match matches.
 */
export const etag = createMiddleware(async (c, next) => {
  await next();

  // Only ETag successful GET responses with a body
  if (c.req.method !== 'GET' || c.res.status !== 200) return;

  const body = await c.res.clone().arrayBuffer();
  if (body.byteLength === 0) return;

  const hash = new Bun.CryptoHasher('md5').update(new Uint8Array(body)).digest('hex');
  const etagValue = `W/"${hash}"`;

  c.header('ETag', etagValue);

  // Check If-None-Match from client
  const ifNoneMatch = c.req.header('If-None-Match');
  if (ifNoneMatch && ifNoneMatch === etagValue) {
    c.res = new Response(null, {
      status: 304,
      headers: c.res.headers,
    });
  }
});
