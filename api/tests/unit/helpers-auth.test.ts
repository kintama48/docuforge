/**
 * Unit tests for auth test helpers.
 */
import { describe, test, expect } from 'bun:test';
import {
  createAuthHeaders,
  createApiKeyHeaders,
  createTestJwt,
  createExpiredJwt,
  createInvalidSignatureJwt,
  TEST_JWT_SECRET,
} from '../helpers/auth';

const userId = 'usr_test';
const email = 'user@example.com';

describe('auth helper utilities', () => {
  test('createAuthHeaders returns bearer auth', () => {
    const headers = createAuthHeaders('token');
    expect(headers.Authorization).toBe('Bearer token');
  });

  test('createApiKeyHeaders returns api key header', () => {
    const headers = createApiKeyHeaders('api_key');
    expect(headers['X-API-Key']).toBe('api_key');
  });

  test('createTestJwt returns a token', async () => {
    const token = await createTestJwt(userId, email, TEST_JWT_SECRET, '1h');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);
  });

  test('createExpiredJwt returns a token', async () => {
    const token = await createExpiredJwt(userId, email, TEST_JWT_SECRET);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);
  });

  test('createInvalidSignatureJwt returns a token', async () => {
    const token = await createInvalidSignatureJwt(userId, email);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);
  });
});
