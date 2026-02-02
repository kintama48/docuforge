import { createHash, randomBytes } from 'crypto';

const API_KEY_PREFIX = 'docu_live_';
const KEY_LENGTH = 32; // 32 bytes = 64 hex chars

export function generateRawApiKey(): string {
  const randomPart = randomBytes(KEY_LENGTH).toString('hex');
  return `${API_KEY_PREFIX}${randomPart}`;
}

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

export function extractKeyPrefix(rawKey: string): string {
  return rawKey.slice(0, 16);
}

export function isValidApiKeyFormat(key: string): boolean {
  if (!key.startsWith(API_KEY_PREFIX)) {
    return false;
  }
  const hexPart = key.slice(API_KEY_PREFIX.length);
  if (hexPart.length !== KEY_LENGTH * 2) {
    return false;
  }
  return /^[a-f0-9]+$/.test(hexPart);
}
