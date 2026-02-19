export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const REDACTED = '[REDACTED]';
const SENSITIVE_KEY_SUBSTRINGS = [
  'password',
  'passphrase',
  'encryption_key',
  'x-pdf-password',
  'user_password',
  'pdf_password',
  'authorization',
  'token',
  'secret',
  'api_key',
];

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface Logger {
  debug: (event: string, attrs?: Record<string, unknown>) => void;
  info: (event: string, attrs?: Record<string, unknown>) => void;
  warn: (event: string, attrs?: Record<string, unknown>) => void;
  error: (event: string, attrs?: Record<string, unknown>) => void;
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEY_SUBSTRINGS.some((fragment) => normalized.includes(fragment));
}

export function redactSensitive(value: unknown, keyHint?: string): unknown {
  if (keyHint && isSensitiveKey(keyHint)) {
    return REDACTED;
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item));
  }

  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      output[key] = redactSensitive(nested, key);
    }
    return output;
  }

  return value;
}

export function createLogger(minLevel: LogLevel): Logger {
  const threshold = levelOrder[minLevel];

  const emit = (level: LogLevel, event: string, attrs: Record<string, unknown> = {}) => {
    if (levelOrder[level] < threshold) {
      return;
    }

    const payload = {
      ts: new Date().toISOString(),
      level,
      event,
      ...(redactSensitive(attrs) as Record<string, unknown>),
    };

    const message = JSON.stringify(payload);
    if (level === 'error' || level === 'warn') {
      console.error(message);
      return;
    }

    console.log(message);
  };

  return {
    debug: (event, attrs) => emit('debug', event, attrs),
    info: (event, attrs) => emit('info', event, attrs),
    warn: (event, attrs) => emit('warn', event, attrs),
    error: (event, attrs) => emit('error', event, attrs),
  };
}
