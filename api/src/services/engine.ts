import {
  CompilationError,
  EngineTimeoutError,
  EngineUnavailableError,
} from '../lib/errors';
import type { EnginePayload, EngineErrorResponse } from '../types';

export interface RenderResult {
  pdf: Buffer;
  durationMs: number;
}

export async function renderPdf(payload: EnginePayload): Promise<RenderResult> {
  const engineUrl = process.env.ENGINE_URL || 'http://127.0.0.1:3001';
  const timeoutMs = parseInt(process.env.ENGINE_TIMEOUT_MS || '5000', 10);

  const startTime = Date.now();

  try {
    const response = await fetch(`${engineUrl}/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs + 1000), // Give engine time + buffer
    });

    const durationMs = Date.now() - startTime;

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      return {
        pdf: Buffer.from(arrayBuffer),
        durationMs,
      };
    }

    // Handle engine errors
    if (response.status === 408) {
      throw new EngineTimeoutError();
    }

    if (response.status === 400) {
      const errorBody = (await response.json()) as EngineErrorResponse;
      throw new CompilationError(errorBody.message || 'Compilation failed', {
        error: errorBody.error,
        span: errorBody.span,
      });
    }

    // Unexpected error
    throw new EngineUnavailableError();
  } catch (err) {
    if (err instanceof CompilationError || err instanceof EngineTimeoutError) {
      throw err;
    }

    // Handle timeout
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new EngineTimeoutError();
    }

    // Handle connection errors
    if (
      err instanceof Error &&
      (err.message.includes('ECONNREFUSED') ||
        err.message.includes('fetch failed') ||
        err.message.includes('network'))
    ) {
      throw new EngineUnavailableError();
    }

    throw new EngineUnavailableError();
  }
}

export async function checkEngineHealth(): Promise<boolean> {
  const engineUrl = process.env.ENGINE_URL || 'http://127.0.0.1:3001';

  try {
    const response = await fetch(`${engineUrl}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
