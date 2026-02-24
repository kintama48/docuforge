import { isIP } from 'node:net';
import { ValidationError } from './errors';

const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal'];

function parseIpv4(hostname: string): number[] | null {
  const parts = hostname.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null;
  }
  return parts;
}

function isPrivateOrReservedIpv4(hostname: string): boolean {
  const parts = parseIpv4(hostname);
  if (!parts) return false;

  const [a, b] = parts;
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;

  return false;
}

function isPrivateOrReservedIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  if (normalized === '::' || normalized === '::1') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // fc00::/7
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return true; // fe80::/10
  }

  if (normalized.startsWith('::ffff:')) {
    const maybeIpv4 = normalized.slice('::ffff:'.length);
    if (isPrivateOrReservedIpv4(maybeIpv4)) return true;
  }

  return false;
}

export function assertSafeWebhookUrl(rawUrl: string, allowHttp = false): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new ValidationError('Webhook URL must be a valid URL');
  }

  if (parsed.username || parsed.password) {
    throw new ValidationError('Webhook URL must not include credentials');
  }

  const allowedProtocols = allowHttp ? new Set(['https:', 'http:']) : new Set(['https:']);
  if (!allowedProtocols.has(parsed.protocol)) {
    throw new ValidationError('Webhook URL must use HTTPS');
  }

  const hostname = parsed.hostname.trim().toLowerCase();
  const normalizedHost = hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname;
  if (!normalizedHost) {
    throw new ValidationError('Webhook URL host is required');
  }

  if (
    normalizedHost === 'localhost' ||
    BLOCKED_HOST_SUFFIXES.some((suffix) => normalizedHost.endsWith(suffix))
  ) {
    throw new ValidationError('Webhook URL must target a public host');
  }

  const ipVersion = isIP(normalizedHost);
  if (ipVersion === 4 && isPrivateOrReservedIpv4(normalizedHost)) {
    throw new ValidationError('Webhook URL must target a public host');
  }
  if (ipVersion === 6 && isPrivateOrReservedIpv6(normalizedHost)) {
    throw new ValidationError('Webhook URL must target a public host');
  }

  return parsed.toString();
}
