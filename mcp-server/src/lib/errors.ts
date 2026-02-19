export class DocuForgeHttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'DocuForgeHttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function normalizeError(error: unknown): { message: string; code: string } {
  if (error instanceof DocuForgeHttpError) {
    return {
      message: `${error.message} (status ${error.status})`,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'internal_error',
    };
  }

  return {
    message: 'Unknown error',
    code: 'internal_error',
  };
}
