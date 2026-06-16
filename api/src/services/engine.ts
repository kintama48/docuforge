import {
  CompilationError,
  EngineTimeoutError,
  EngineUnavailableError,
  InternalError,
  ValidationError,
} from '../lib/errors';
import { env } from '../config/env';
import { searchDocs, isInitialized } from './vector-store';
import { generateErrorSuggestion } from './ai';
import type { EnginePayload, EngineErrorResponse } from '../types';
import type { RenderedImagePage, ImageFormat } from './image-render';

export interface RenderResult {
  pdf: Buffer;
  durationMs: number;
}

export interface RenderImagesResult {
  pages: RenderedImagePage[];
  format: ImageFormat;
  durationMs: number;
}

interface EngineImagesResponse {
  pages?: Array<{
    index?: number;
    data?: string;
  }>;
  format?: string;
}

async function throwEngineResponseError(response: Response): Promise<never> {
  if (response.status === 408) {
    throw new EngineTimeoutError();
  }

  if (response.status === 400) {
    const errorBody = (await response.json()) as EngineErrorResponse;

    // Enrich compilation errors with RAG docs and AI suggestion
    let relevantDocs: Array<{ function?: string; content: string; relevance: number }> | undefined;
    let suggestion: string | null = null;

    if (isInitialized()) {
      try {
        const ragResults = await searchDocs(errorBody.message || errorBody.error, 3);
        if (ragResults.length > 0) {
          relevantDocs = ragResults.map((r) => ({
            function: r.chunk.functionName,
            content: r.chunk.content,
            relevance: r.score,
          }));
          suggestion = await generateErrorSuggestion(errorBody, ragResults);
        }
      } catch {
        // RAG enrichment is best-effort, don't fail the error response
      }
    }

    throw new CompilationError(errorBody.message || 'Compilation failed', {
      error: errorBody.error,
      span: errorBody.span,
      ...(relevantDocs && { relevant_docs: relevantDocs }),
      ...(suggestion && { suggestion }),
    });
  }

  if (response.status === 422) {
    const errorBody = (await response.json()) as EngineErrorResponse;
    throw new ValidationError(errorBody.message || 'Invalid render request');
  }

  if (response.status === 500) {
    const errorBody = (await response.json()) as EngineErrorResponse;
    if (errorBody.error === 'encryption_failed') {
      throw new InternalError(errorBody.message || 'PDF encryption failed');
    }
  }

  throw new EngineUnavailableError();
}

function handleEngineRequestError(err: unknown): never {
  if (
    err instanceof CompilationError ||
    err instanceof EngineTimeoutError ||
    err instanceof ValidationError ||
    err instanceof InternalError
  ) {
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

function decodeEngineImages(body: EngineImagesResponse): { pages: RenderedImagePage[]; format: ImageFormat } {
  const format: ImageFormat = body.format === 'jpg' ? 'jpeg' : body.format === 'png' ? 'png' : 'png';
  if (!Array.isArray(body.pages) || body.pages.length === 0) {
    throw new EngineUnavailableError();
  }

  const pages = body.pages.map((page) => {
    if (
      !Number.isInteger(page.index) ||
      typeof page.index !== 'number' ||
      page.index < 1 ||
      typeof page.data !== 'string' ||
      page.data.length === 0
    ) {
      throw new EngineUnavailableError();
    }

    const data = Buffer.from(page.data, 'base64');
    if (data.length === 0) {
      throw new EngineUnavailableError();
    }

    return {
      index: page.index,
      data,
    };
  });

  return { pages, format };
}

export async function renderPdf(payload: EnginePayload): Promise<RenderResult> {
  const engineUrl = env.ENGINE_URL;
  const timeoutMs = env.ENGINE_TIMEOUT_MS;

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

    await throwEngineResponseError(response);
  } catch (err) {
    handleEngineRequestError(err);
  }
}

export async function renderImages(payload: EnginePayload): Promise<RenderImagesResult> {
  const engineUrl = env.ENGINE_URL;
  const timeoutMs = env.ENGINE_TIMEOUT_MS;

  const startTime = Date.now();

  try {
    const response = await fetch(`${engineUrl}/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs + 1000),
    });

    const durationMs = Date.now() - startTime;

    if (response.ok) {
      const decoded = decodeEngineImages((await response.json()) as EngineImagesResponse);
      return {
        ...decoded,
        durationMs,
      };
    }

    await throwEngineResponseError(response);
  } catch (err) {
    handleEngineRequestError(err);
  }
}

export async function checkEngineHealth(): Promise<boolean> {
  const engineUrl = env.ENGINE_URL;

  try {
    const response = await fetch(`${engineUrl}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
