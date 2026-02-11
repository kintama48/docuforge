import { createTestOrigin, registerFetchHandler } from './fetch-router';

export interface TestServer {
  url: string;
  stop: () => void;
}

export function createTestServer(
  app: { fetch: (request: Request) => Response | Promise<Response> },
  prefix = 'api'
): TestServer {
  const origin = createTestOrigin(prefix);
  const unregister = registerFetchHandler(origin, (request) => app.fetch(request));
  return {
    url: origin,
    stop: () => unregister(),
  };
}
