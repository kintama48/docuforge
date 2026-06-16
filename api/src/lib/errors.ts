export type ErrorCode =
  | 'validation_error'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'limit_exceeded'
  | 'rate_limited'
  | 'compilation_failed'
  | 'engine_timeout'
  | 'engine_unavailable'
  | 'internal_error';

export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  validation_error: 422,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  limit_exceeded: 402,
  rate_limited: 429,
  compilation_failed: 400,
  engine_timeout: 408,
  engine_unavailable: 503,
  internal_error: 500,
};

export interface ErrorDetails {
  [key: string]: unknown;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: ErrorDetails;

  constructor(code: ErrorCode, message: string, details?: ErrorDetails) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = ERROR_STATUS_MAP[code];
    this.details = details;
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super('validation_error', message, details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('unauthorized', message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('forbidden', message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super('not_found', message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('conflict', message);
    this.name = 'ConflictError';
  }
}

export class LimitExceededError extends AppError {
  private readonly usage?: unknown;
  private readonly upgradeUrl?: string;

  constructor(message: string, details?: { usage?: unknown; upgrade_url?: string }) {
    super('limit_exceeded', message);
    this.name = 'LimitExceededError';
    this.usage = details?.usage;
    this.upgradeUrl = details?.upgrade_url;
  }

  override toJSON() {
    return {
      error: this.code,
      message: this.message,
      ...(this.usage ? { usage: this.usage } : {}),
      ...(this.upgradeUrl ? { upgrade_url: this.upgradeUrl } : {}),
    };
  }
}

export class RateLimitedError extends AppError {
  public readonly retryAfter: number;

  constructor(message: string, retryAfter: number, details?: ErrorDetails) {
    super('rate_limited', message, { retryAfter, ...(details || {}) });
    this.name = 'RateLimitedError';
    this.retryAfter = retryAfter;
  }
}

export class CompilationError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super('compilation_failed', message, details);
    this.name = 'CompilationError';
  }
}

export class EngineTimeoutError extends AppError {
  constructor() {
    super('engine_timeout', 'Render timed out');
    this.name = 'EngineTimeoutError';
  }
}

export class EngineUnavailableError extends AppError {
  constructor() {
    super('engine_unavailable', 'Rendering engine is unavailable');
    this.name = 'EngineUnavailableError';
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super('internal_error', message);
    this.name = 'InternalError';
  }
}
