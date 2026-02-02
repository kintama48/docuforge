/**
 * Mock Rust Engine for testing.
 * Minimal HTTP server that mimics the docuforge-engine behavior.
 */
import type { EnginePayload, EngineErrorResponse } from '../../src/types';

// Minimal valid PDF (starts with %PDF header, contains basic structure)
// This is a real minimal PDF that can be parsed by PDF readers
const MINIMAL_PDF_BYTES = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, // %PDF-1.4
  0x0a, 0x31, 0x20, 0x30, 0x20, 0x6f, 0x62, 0x6a, // \n1 0 obj
  0x0a, 0x3c, 0x3c, 0x2f, 0x54, 0x79, 0x70, 0x65, // \n<</Type
  0x2f, 0x43, 0x61, 0x74, 0x61, 0x6c, 0x6f, 0x67, // /Catalog
  0x2f, 0x50, 0x61, 0x67, 0x65, 0x73, 0x20, 0x32, // /Pages 2
  0x20, 0x30, 0x20, 0x52, 0x3e, 0x3e, 0x0a, 0x65, //  0 R>>\ne
  0x6e, 0x64, 0x6f, 0x62, 0x6a, 0x0a, 0x32, 0x20, // ndobj\n2
  0x30, 0x20, 0x6f, 0x62, 0x6a, 0x0a, 0x3c, 0x3c, // 0 obj\n<<
  0x2f, 0x54, 0x79, 0x70, 0x65, 0x2f, 0x50, 0x61, // /Type/Pa
  0x67, 0x65, 0x73, 0x2f, 0x4b, 0x69, 0x64, 0x73, // ges/Kids
  0x5b, 0x33, 0x20, 0x30, 0x20, 0x52, 0x5d, 0x2f, // [3 0 R]/
  0x43, 0x6f, 0x75, 0x6e, 0x74, 0x20, 0x31, 0x3e, // Count 1>
  0x3e, 0x0a, 0x65, 0x6e, 0x64, 0x6f, 0x62, 0x6a, // >\nendobj
  0x0a, 0x33, 0x20, 0x30, 0x20, 0x6f, 0x62, 0x6a, // \n3 0 obj
  0x0a, 0x3c, 0x3c, 0x2f, 0x54, 0x79, 0x70, 0x65, // \n<</Type
  0x2f, 0x50, 0x61, 0x67, 0x65, 0x2f, 0x4d, 0x65, // /Page/Me
  0x64, 0x69, 0x61, 0x42, 0x6f, 0x78, 0x5b, 0x30, // diaBox[0
  0x20, 0x30, 0x20, 0x36, 0x31, 0x32, 0x20, 0x37, //  0 612 7
  0x39, 0x32, 0x5d, 0x2f, 0x50, 0x61, 0x72, 0x65, // 92]/Pare
  0x6e, 0x74, 0x20, 0x32, 0x20, 0x30, 0x20, 0x52, // nt 2 0 R
  0x3e, 0x3e, 0x0a, 0x65, 0x6e, 0x64, 0x6f, 0x62, // >>\nendob
  0x6a, 0x0a, 0x78, 0x72, 0x65, 0x66, 0x0a, 0x30, // j\nxref\n0
  0x20, 0x34, 0x0a, 0x30, 0x30, 0x30, 0x30, 0x30, //  4\n00000
  0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x36, 0x35, // 00000 65
  0x35, 0x33, 0x35, 0x20, 0x66, 0x0a, 0x30, 0x30, // 535 f\n00
  0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x39, // 00000009
  0x20, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x6e, //  00000 n
  0x0a, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, // \n0000000
  0x30, 0x35, 0x32, 0x20, 0x30, 0x30, 0x30, 0x30, // 052 0000
  0x30, 0x20, 0x6e, 0x0a, 0x30, 0x30, 0x30, 0x30, // 0 n\n0000
  0x30, 0x30, 0x30, 0x31, 0x30, 0x31, 0x20, 0x30, // 000101 0
  0x30, 0x30, 0x30, 0x30, 0x20, 0x6e, 0x0a, 0x74, // 0000 n\nt
  0x72, 0x61, 0x69, 0x6c, 0x65, 0x72, 0x0a, 0x3c, // railer\n<
  0x3c, 0x2f, 0x53, 0x69, 0x7a, 0x65, 0x20, 0x34, // </Size 4
  0x2f, 0x52, 0x6f, 0x6f, 0x74, 0x20, 0x31, 0x20, // /Root 1
  0x30, 0x20, 0x52, 0x3e, 0x3e, 0x0a, 0x73, 0x74, // 0 R>>\nst
  0x61, 0x72, 0x74, 0x78, 0x72, 0x65, 0x66, 0x0a, // artxref\n
  0x31, 0x37, 0x38, 0x0a, 0x25, 0x25, 0x45, 0x4f, // 178\n%%EO
  0x46,                                           // F
]);

export interface RecordedRequest {
  method: string;
  path: string;
  body: EnginePayload | null;
  timestamp: number;
}

export type MockEngineError = 'compilation' | 'timeout' | 'unavailable';

export interface MockEngineConfig {
  /** Force a specific error response */
  forceError?: MockEngineError;
  /** Custom error message for compilation errors */
  errorMessage?: string;
  /** Delay response by this many ms (useful for timeout tests) */
  delayMs?: number;
  /** Custom PDF bytes to return */
  customPdf?: Uint8Array;
}

export interface MockEngine {
  /** The running server */
  server: ReturnType<typeof Bun.serve>;
  /** Port the server is listening on */
  port: number;
  /** Full URL to the mock engine */
  url: string;
  /** All recorded requests */
  requests: RecordedRequest[];
  /** Get the last recorded request */
  getLastRequest(): RecordedRequest | undefined;
  /** Clear recorded requests */
  clearRequests(): void;
  /** Update configuration */
  configure(config: MockEngineConfig): void;
  /** Reset configuration to defaults */
  reset(): void;
  /** Stop the server */
  stop(): Promise<void>;
}

/**
 * Creates a mock engine server on a random available port.
 */
export function createMockEngine(initialConfig: MockEngineConfig = {}): MockEngine {
  const requests: RecordedRequest[] = [];
  let config: MockEngineConfig = { ...initialConfig };

  const server = Bun.serve({
    port: 0, // Random available port
    fetch: async (req) => {
      const url = new URL(req.url);
      const path = url.pathname;
      const method = req.method;

      // Health check endpoint
      if (method === 'GET' && path === '/health') {
        if (config.forceError === 'unavailable') {
          return new Response('Service Unavailable', { status: 503 });
        }
        return Response.json({ status: 'ok' });
      }

      // Render endpoint
      if (method === 'POST' && path === '/render') {
        let body: EnginePayload | null = null;

        try {
          body = await req.json();
        } catch {
          return Response.json(
            { error: 'invalid_json', message: 'Invalid JSON body' },
            { status: 400 }
          );
        }

        // Record the request
        requests.push({
          method,
          path,
          body,
          timestamp: Date.now(),
        });

        // Apply delay if configured
        if (config.delayMs && config.delayMs > 0) {
          await Bun.sleep(config.delayMs);
        }

        // Handle forced errors
        if (config.forceError === 'compilation') {
          const errorResponse: EngineErrorResponse = {
            error: 'compilation_failed',
            message: config.errorMessage || 'Unknown identifier: sys',
            span: { file: 'main.typ', line: 1, column: 10 },
          };
          return Response.json(errorResponse, { status: 400 });
        }

        if (config.forceError === 'timeout') {
          return Response.json({ error: 'timeout' }, { status: 408 });
        }

        if (config.forceError === 'unavailable') {
          return new Response('Service Unavailable', { status: 503 });
        }

        // Return PDF
        const pdfBytes = config.customPdf || MINIMAL_PDF_BYTES;
        return new Response(new Uint8Array(pdfBytes), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBytes.length.toString(),
          },
        });
      }

      return new Response('Not Found', { status: 404 });
    },
  });

  const port = server.port!;
  const engineUrl = `http://127.0.0.1:${port}`;

  return {
    server,
    port,
    url: engineUrl,
    requests,
    getLastRequest(): RecordedRequest | undefined {
      return requests[requests.length - 1];
    },
    clearRequests(): void {
      requests.length = 0;
    },
    configure(newConfig: MockEngineConfig): void {
      config = { ...config, ...newConfig };
    },
    reset(): void {
      config = {};
      requests.length = 0;
    },
    async stop(): Promise<void> {
      server.stop(true);
    },
  };
}

/**
 * Export minimal PDF for use in other test files.
 */
export const MINIMAL_PDF = MINIMAL_PDF_BYTES;
