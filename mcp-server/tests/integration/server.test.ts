import { afterEach, describe, expect, it } from 'bun:test';

interface RunningServer {
  process: Bun.Subprocess<'ignore', 'pipe', 'pipe'>;
  baseUrl: string;
}

const running: RunningServer[] = [];

let integrationEnabled = true;
try {
  await import('express');
} catch {
  integrationEnabled = false;
}

async function checkLoopbackNetworking(): Promise<boolean> {
  try {
    const probe = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch() {
        return new Response('ok', { status: 200 });
      },
    });

    try {
      const response = await fetch(`http://127.0.0.1:${probe.port}/health`);
      return response.status === 200;
    } finally {
      probe.stop(true);
    }
  } catch {
    return false;
  }
}

const loopbackEnabled = await checkLoopbackNetworking();
const describeIntegration = integrationEnabled && loopbackEnabled ? describe : describe.skip;

async function waitForHealth(
  process: Bun.Subprocess<'ignore', 'pipe', 'pipe'>,
  baseUrl: string,
  timeoutMs = 10_000
): Promise<void> {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    if (process.exitCode !== null) {
      const stderr = process.stderr ? await new Response(process.stderr).text() : '';
      throw new Error(`MCP server exited before health check completed: ${stderr}`);
    }

    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // ignore and retry
    }

    await Bun.sleep(100);
  }

  throw new Error(`Timed out waiting for MCP server health at ${baseUrl}`);
}

async function startServer(port: number, envOverrides: Record<string, string> = {}): Promise<RunningServer> {
  const baseUrl = `http://127.0.0.1:${port}`;

  const child = Bun.spawn(['bun', 'run', 'src/index.ts'], {
    cwd: import.meta.dir + '/../../',
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      MCP_SERVER_TOKEN: 'test_token_for_ci_only',
      DOCUFORGE_API_BASE_URL: 'http://127.0.0.1:3000',
      DOCUFORGE_API_KEY: 'docu_live_test_key',
      LOG_LEVEL: 'error',
      ...envOverrides,
    },
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const handle = { process: child, baseUrl };
  running.push(handle);

  await waitForHealth(child, baseUrl);
  return handle;
}

afterEach(async () => {
  while (running.length > 0) {
    const handle = running.pop();
    if (!handle) continue;
    handle.process.kill();
    await handle.process.exited;
  }
});

describeIntegration('mcp-server runtime', () => {
  it(
    'serves /health',
    async () => {
      const { baseUrl } = await startServer(3320);

      const response = await fetch(`${baseUrl}/health`);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.status).toBe('ok');
      expect(body.service).toBe('docuforge-mcp');
    },
    15_000
  );

  it(
    'rejects unauthorized /mcp requests',
    async () => {
      const { baseUrl } = await startServer(3321);

      const response = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: '1',
          method: 'initialize',
          params: {
            protocolVersion: '2025-11-05',
            capabilities: {},
            clientInfo: { name: 'test', version: '0.0.1' },
          },
        }),
      });

      expect(response.status).toBe(401);
    },
    15_000
  );

  it(
    'rejects forbidden origins',
    async () => {
      const { baseUrl } = await startServer(3322);

      const response = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test_token_for_ci_only',
          'Origin': 'https://evil.example',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: '1',
          method: 'initialize',
          params: {
            protocolVersion: '2025-11-05',
            capabilities: {},
            clientInfo: { name: 'test', version: '0.0.1' },
          },
        }),
      });

      expect(response.status).toBe(403);
    },
    15_000
  );

  it(
    'returns 400 for GET /mcp without valid session',
    async () => {
      const { baseUrl } = await startServer(3323);

      const response = await fetch(`${baseUrl}/mcp`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test_token_for_ci_only',
        },
      });

      expect(response.status).toBe(400);
    },
    15_000
  );

  it(
    'returns 400 for DELETE /mcp without valid session',
    async () => {
      const { baseUrl } = await startServer(3324);

      const response = await fetch(`${baseUrl}/mcp`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer test_token_for_ci_only',
        },
      });

      expect(response.status).toBe(400);
    },
    15_000
  );
});
