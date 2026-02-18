import { createHash, createHmac, randomBytes } from 'crypto';
import { env } from '../config/env';

const API_KEY_PREFIX = 'docu_live_';
const KEY_LENGTH = 32; // 32 bytes = 64 hex chars

export function generateRawApiKey(): string {
  const randomPart = randomBytes(KEY_LENGTH).toString('hex');
  return `${API_KEY_PREFIX}${randomPart}`;
}

export function hashApiKey(rawKey: string): string {
  // Keyed hashing protects at-rest key hashes if DB is leaked.
  // JWT secret already meets strong entropy requirements.
  return createHmac('sha256', env.JWT_SECRET).update(rawKey).digest('hex');
}

export function hashApiKeyLegacy(rawKey: string): string {
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
