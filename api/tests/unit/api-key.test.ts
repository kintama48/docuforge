/**
 * Unit tests for src/lib/api-key.ts
 *
 * Tests API key generation, hashing, and prefix extraction.
 */
import { describe, test, expect } from 'bun:test';
import {
  generateRawApiKey,
  hashApiKey,
  extractKeyPrefix,
  isValidApiKeyFormat,
} from '../../src/lib/api-key';

describe('api-key', () => {
  describe('generateRawApiKey', () => {
    test('generates key with correct prefix', () => {
      const key = generateRawApiKey();
      expect(key.startsWith('docu_live_')).toBe(true);
    });

    test('generates key with correct length', () => {
      const key = generateRawApiKey();
      // Prefix (10 chars) + 64 hex chars = 74 total
      expect(key.length).toBe(10 + 64);
    });

    test('generates unique keys (1000 keys, no duplicates)', () => {
      const keys = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        const key = generateRawApiKey();
        expect(keys.has(key)).toBe(false);
        keys.add(key);
      }
      expect(keys.size).toBe(1000);
    });

    test('generates valid hex characters after prefix', () => {
      const key = generateRawApiKey();
      const hexPart = key.slice(10); // After 'docu_live_'
      expect(/^[a-f0-9]+$/.test(hexPart)).toBe(true);
    });
  });

  describe('hashApiKey', () => {
    test('hash is deterministic', () => {
      const key = 'docu_live_abc123def456abc123def456abc123def456abc123def456abc123def456ab';
      const hash1 = hashApiKey(key);
      const hash2 = hashApiKey(key);
      expect(hash1).toBe(hash2);
    });

    test('hash is not reversible (hash !== raw key)', () => {
      const key = generateRawApiKey();
      const hash = hashApiKey(key);
      expect(hash).not.toBe(key);
    });

    test('different keys produce different hashes', () => {
      const key1 = generateRawApiKey();
      const key2 = generateRawApiKey();
      const hash1 = hashApiKey(key1);
      const hash2 = hashApiKey(key2);
      expect(hash1).not.toBe(hash2);
    });

    test('hash is 64 character hex string (SHA-256)', () => {
      const key = generateRawApiKey();
      const hash = hashApiKey(key);
      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });
  });

  describe('extractKeyPrefix', () => {
    test('prefix extracts correctly (first 16 chars)', () => {
      const key = 'docu_live_abc123def456xyz789';
      const prefix = extractKeyPrefix(key);
      expect(prefix).toBe('docu_live_abc123');
      expect(prefix.length).toBe(16);
    });

    test('prefix from generated key starts with docu_live_', () => {
      const key = generateRawApiKey();
      const prefix = extractKeyPrefix(key);
      expect(prefix.startsWith('docu_live_')).toBe(true);
    });

    test('prefix is consistent for same key', () => {
      const key = generateRawApiKey();
      const prefix1 = extractKeyPrefix(key);
      const prefix2 = extractKeyPrefix(key);
      expect(prefix1).toBe(prefix2);
    });
  });

  describe('isValidApiKeyFormat', () => {
    test('valid key passes', () => {
      const key = generateRawApiKey();
      expect(isValidApiKeyFormat(key)).toBe(true);
    });

    test('key without prefix fails', () => {
      const key = 'abc123def456abc123def456abc123def456abc123def456abc123def456abcd';
      expect(isValidApiKeyFormat(key)).toBe(false);
    });

    test('key with wrong prefix fails', () => {
      const key = 'docu_test_abc123def456abc123def456abc123def456abc123def456abc123def456ab';
      expect(isValidApiKeyFormat(key)).toBe(false);
    });

    test('key with invalid hex characters fails', () => {
      const key = 'docu_live_GGGG23def456abc123def456abc123def456abc123def456abc123def456ab';
      expect(isValidApiKeyFormat(key)).toBe(false);
    });

    test('key with wrong length fails', () => {
      const shortKey = 'docu_live_abc123';
      const longKey = 'docu_live_abc123def456abc123def456abc123def456abc123def456abc123def456abcdef';
      expect(isValidApiKeyFormat(shortKey)).toBe(false);
      expect(isValidApiKeyFormat(longKey)).toBe(false);
    });

    test('empty string fails', () => {
      expect(isValidApiKeyFormat('')).toBe(false);
    });
  });
});
