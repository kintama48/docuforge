import express, { type NextFunction, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { env } from './config/env';
import { createLogger } from './lib/logger';
import { ArtifactStore } from './mcp/artifact-store';
import { createDocuForgeMcpServer } from './mcp/server';
import { DocuForgeClient } from './services/docuforge-client';

interface SessionRuntime {
  transport: StreamableHTTPServerTransport;
}

const logger = createLogger(env.LOG_LEVEL);
const artifactStore = new ArtifactStore(env.ARTIFACT_TTL_MS);
const client = new DocuForgeClient(
  {
    apiBaseUrl: env.DOCUFORGE_API_BASE_URL,
    apiKey: env.DOCUFORGE_API_KEY,
    requestTimeoutMs: env.REQUEST_TIMEOUT_MS,
    jwtToken: env.DOCUFORGE_JWT_TOKEN,
    email: env.DOCUFORGE_EMAIL,
    password: env.DOCUFORGE_PASSWORD,
  },
  logger
);

const app = express();
app.use(express.json({ limit: '4mb' }));

const sessions: Record<string, SessionRuntime> = {};

function validateOrigin(req: Request): boolean {
  const origin = req.headers.origin;

  if (!origin) {
    return true;
  }

  if (env.ALLOWED_ORIGIN_LIST.length === 0) {
    return false;
  }

  return env.ALLOWED_ORIGIN_LIST.includes(origin);
}

function requireMcpAuth(req: Request, res: Response, next: NextFunction): void {
  if (!validateOrigin(req)) {
    res.status(403).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Forbidden origin',
      },
      id: null,
    });
    return;
  }

  const authHeader = req.header('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token || token !== env.MCP_SERVER_TOKEN) {
    res.status(401).json({
      jsonrpc: '2.0',
      error: {
        code: -32001,
        message: 'Unauthorized',
      },
      id: null,
    });
    return;
  }

  next();
}

function sendSessionError(res: Response, message: string): void {
  res.status(400).json({
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message,
    },
    id: null,
  });
}

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'docuforge-mcp',
    version: '0.1.0',
    artifact_cache_entries: artifactStore.size(),
  });
});

app.post('/mcp', requireMcpAuth, async (req, res) => {
  const traceId = randomUUID();
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  try {
    let transport: StreamableHTTPServerTransport;

    if (sessionId && sessions[sessionId]) {
      transport = sessions[sessionId].transport;
    } else if (!sessionId && isInitializeRequest(req.body)) {
      const server = createDocuForgeMcpServer({
        logger,
        client,
        artifactStore,
        pdfInlineMaxBytes: env.PDF_INLINE_MAX_BYTES,
      });

      const transportInstance = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          sessions[newSessionId] = {
            transport: transportInstance,
          };
          logger.info('mcp.session.created', {
            trace_id: traceId,
            session_id: newSessionId,
          });
        },
      });

      transport = transportInstance;

      transportInstance.onclose = () => {
        if (transportInstance.sessionId) {
          delete sessions[transportInstance.sessionId];
          logger.info('mcp.session.closed', {
            trace_id: traceId,
            session_id: transportInstance.sessionId,
          });
        }
      };

      await server.connect(transport);
    } else {
      sendSessionError(res, 'Bad Request: No valid session ID provided');
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    logger.error('mcp.transport.error', {
      trace_id: traceId,
      message: error instanceof Error ? error.message : 'unknown',
    });

    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

app.get('/mcp', requireMcpAuth, async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !sessions[sessionId]) {
    sendSessionError(res, 'Bad Request: No valid session ID provided');
    return;
  }

  await sessions[sessionId].transport.handleRequest(req, res);
});

app.delete('/mcp', requireMcpAuth, async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !sessions[sessionId]) {
    sendSessionError(res, 'Bad Request: No valid session ID provided');
    return;
  }

  await sessions[sessionId].transport.handleRequest(req, res);
});

const artifactCleanupInterval = setInterval(() => {
  const removed = artifactStore.cleanup();
  if (removed > 0) {
    logger.debug('artifact.cleanup', {
      removed,
      remaining: artifactStore.size(),
    });
  }
}, 60_000);

void artifactCleanupInterval;

app.listen(env.PORT, env.HOST, () => {
  logger.info('mcp.server.started', {
    host: env.HOST,
    port: env.PORT,
    api_base_url: env.DOCUFORGE_API_BASE_URL,
  });
});
