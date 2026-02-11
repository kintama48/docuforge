type FetchHandler = (request: Request) => Response | Promise<Response>;

const handlers = new Map<string, FetchHandler>();
let originalFetch: typeof fetch | null = null;
let routerInstalled = false;

function ensureRouterInstalled(): void {
  if (routerInstalled) return;
  originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const origin = new URL(request.url).origin;
    const handler = handlers.get(origin);
    if (handler) {
      return handler(request);
    }
    if (!originalFetch) {
      throw new Error('Fetch router has no original fetch to delegate to');
    }
    return originalFetch(request);
  };
  routerInstalled = true;
}

function maybeRestoreOriginalFetch(): void {
  if (!routerInstalled || handlers.size > 0) return;
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  }
  originalFetch = null;
  routerInstalled = false;
}

export function registerFetchHandler(origin: string, handler: FetchHandler): () => void {
  ensureRouterInstalled();
  handlers.set(origin, handler);
  return () => {
    handlers.delete(origin);
    maybeRestoreOriginalFetch();
  };
}

export function createTestOrigin(prefix: string): string {
  const id = typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : String(Date.now());
  return `http://${prefix}-${id}.test`;
}
