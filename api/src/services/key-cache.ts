import { LRUCache } from 'lru-cache';
import type { PlanTier } from '../types';

interface CachedKeyData {
  userId: string;
  planTier: PlanTier;
}

const cache = new LRUCache<string, CachedKeyData>({
  max: 1000,
  ttl: 60 * 1000, // 60 seconds
});

export function getCachedKey(keyHash: string): CachedKeyData | undefined {
  return cache.get(keyHash);
}

export function setCachedKey(keyHash: string, data: CachedKeyData): void {
  cache.set(keyHash, data);
}

export function evictCachedKey(keyHash: string): void {
  cache.delete(keyHash);
}

export function clearKeyCache(): void {
  cache.clear();
}

export function getKeyCacheStats() {
  return {
    size: cache.size,
    max: cache.max,
  };
}
