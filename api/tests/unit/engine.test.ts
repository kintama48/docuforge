/**
 * Unit tests for engine service error handling.
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { renderPdf, checkEngineHealth } from '../../src/services/engine';
import { CompilationError, EngineTimeoutError, EngineUnavailableError } from '../../src/lib/errors';
import { reloadEnv } from '../../src/config/env';
import { createTestOrigin, registerFetchHandler } from '../helpers/fetch-router';

const engineOrigin = createTestOrigin('engine-unit');
let unregister: (() => void) | null = null;

beforeEach(() => {
  process.env.ENGINE_URL = engineOrigin;
  process.env.ENGINE_TIMEOUT_MS = '10';
  reloadEnv();
});

afterEach(() => {
  if (unregister) {
    unregister();
    unregister = null;
  }
});

describe('engine service', () => {
  test('renderPdf returns PDF buffer on success', async () => {
    unregister = registerFetchHandler(engineOrigin, async () =>
      new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer, { status: 200 })
    );

    const result = await renderPdf({ source: '= Hello', data: {} } as any);
    expect(result.pdf).toBeInstanceOf(Buffer);
    expect(result.pdf.length).toBeGreaterThan(0);
  });

  test('renderPdf throws EngineTimeoutError on 408', async () => {
    unregister = registerFetchHandler(engineOrigin, async () => new Response('timeout', { status: 408 }));

    await expect(renderPdf({ source: '= Hello', data: {} } as any)).rejects.toBeInstanceOf(
      EngineTimeoutError
    );
  });

  test('renderPdf throws CompilationError on 400', async () => {
    unregister = registerFetchHandler(engineOrigin, async () =>
      new Response(JSON.stringify({ error: 'compile', message: 'Bad code', span: [1, 2] }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(renderPdf({ source: '= Hello', data: {} } as any)).rejects.toBeInstanceOf(
      CompilationError
    );
  });

  test('renderPdf throws EngineUnavailableError on non-OK response', async () => {
    unregister = registerFetchHandler(engineOrigin, async () => new Response('error', { status: 500 }));

    await expect(renderPdf({ source: '= Hello', data: {} } as any)).rejects.toBeInstanceOf(
      EngineUnavailableError
    );
  });

  test('renderPdf throws EngineTimeoutError on timeout error', async () => {
    const error = new Error('Timed out');
    error.name = 'TimeoutError';
    unregister = registerFetchHandler(engineOrigin, async () => {
      throw error;
    });

    await expect(renderPdf({ source: '= Hello', data: {} } as any)).rejects.toBeInstanceOf(
      EngineTimeoutError
    );
  });

  test('renderPdf throws EngineUnavailableError on network failure', async () => {
    unregister = registerFetchHandler(engineOrigin, async () => {
      throw new Error('ECONNREFUSED');
    });

    await expect(renderPdf({ source: '= Hello', data: {} } as any)).rejects.toBeInstanceOf(
      EngineUnavailableError
    );
  });

  test('checkEngineHealth returns true on ok response', async () => {
    unregister = registerFetchHandler(engineOrigin, async () => new Response('ok', { status: 200 }));
    await expect(checkEngineHealth()).resolves.toBe(true);
  });

  test('checkEngineHealth returns false on failure', async () => {
    unregister = registerFetchHandler(engineOrigin, async () => {
      throw new Error('network');
    });
    await expect(checkEngineHealth()).resolves.toBe(false);
  });
});
