import { env } from '../config/env';

const developmentBrowserOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
] as const;

function normalizeOrigin(value: string, source: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${source} must not contain empty origins`);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`${source} must contain valid absolute URLs`);
  }

  if (parsed.origin === 'null') {
    throw new Error(`${source} must contain valid HTTP(S) origins`);
  }

  if (parsed.username || parsed.password) {
    throw new Error(`${source} must not contain embedded credentials`);
  }

  if ((parsed.pathname && parsed.pathname !== '/') || parsed.search || parsed.hash) {
    throw new Error(`${source} must contain bare origins without paths, query strings, or fragments`);
  }

  return parsed.origin;
}

function addCsvOrigins(target: Set<string>, rawOrigins: string | undefined, source: string): void {
  if (!rawOrigins) return;

  for (const entry of rawOrigins.split(',')) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    target.add(normalizeOrigin(trimmed, source));
  }
}

function createTrustedOriginSet(): Set<string> {
  const origins = new Set<string>([normalizeOrigin(env.APP_URL, 'APP_URL')]);
  addCsvOrigins(origins, env.APP_ALLOWED_ORIGINS, 'APP_ALLOWED_ORIGINS');

  if (env.NODE_ENV === 'development') {
    developmentBrowserOrigins.forEach((origin) => origins.add(origin));
  }

  return origins;
}

export function getTrustedBrowserOrigins(): string[] {
  return Array.from(createTrustedOriginSet());
}

export function getTrustedPublicPreviewOrigins(): string[] {
  const origins = createTrustedOriginSet();
  addCsvOrigins(origins, env.PUBLIC_PREVIEW_ALLOWED_ORIGINS, 'PUBLIC_PREVIEW_ALLOWED_ORIGINS');
  return Array.from(origins);
}
