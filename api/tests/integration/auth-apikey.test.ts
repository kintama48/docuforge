/**
 * Integration tests for API key management endpoints.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createApp } from '../../src/app';
import {
  createTestContext,
  createTestUser,
  createTestTemplate,
  getAuthHeaders,
  revokeApiKey,
  type TestContext,
  type TestUser,
} from '../setup';

describe('API Key Management', () => {
  let ctx: TestContext;
  let app: ReturnType<typeof createApp>;
  let user: TestUser;

  beforeEach(async () => {
    ctx = await createTestContext();
    app = createApp();
    user = await createTestUser(ctx.db);
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe('POST /v1/auth/keys', () => {
    it('creates new API key and returns 201 with raw key', async () => {
      const response = await app.request('/v1/auth/keys', {
        method: 'POST',
        headers: getAuthHeaders(user, false), // JWT auth
        body: JSON.stringify({ name: 'Production Server' }),
      });

      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body.raw_key).toBeDefined();
      expect(body.raw_key).toMatch(/^docu_live_/);
      expect(body.prefix).toBeDefined();
      expect(body.prefix).toMatch(/^docu_live_/);
      expect(body.name).toBe('Production Server');
    });
  });

  describe('GET /v1/auth/keys', () => {
    it('lists keys without raw values (only prefix shown)', async () => {
      // Create an additional key
      const createResponse = await app.request('/v1/auth/keys', {
        method: 'POST',
        headers: getAuthHeaders(user, false),
        body: JSON.stringify({ name: 'Second Key' }),
      });
      expect(createResponse.status).toBe(201);

      // List keys
      const response = await app.request('/v1/auth/keys', {
        method: 'GET',
        headers: getAuthHeaders(user, false),
      });

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.keys).toBeDefined();
      expect(Array.isArray(body.keys)).toBe(true);
      expect(body.keys.length).toBeGreaterThanOrEqual(2); // Default + Second Key

      for (const key of body.keys) {
        expect(key.id).toMatch(/^key_/);
        expect(key.prefix).toMatch(/^docu_live_/);
        expect(key.name).toBeDefined();
        expect(key.created_at).toBeDefined();
        // Should NOT contain raw key or hash
        expect(key.raw_key).toBeUndefined();
        expect(key.key_hash).toBeUndefined();
      }
    });
  });

  describe('DELETE /v1/auth/keys/:id', () => {
    it('revokes key and returns 200', async () => {
      // Create a new key to revoke
      const createResponse = await app.request('/v1/auth/keys', {
        method: 'POST',
        headers: getAuthHeaders(user, false),
        body: JSON.stringify({ name: 'Key to Revoke' }),
      });
      expect(createResponse.status).toBe(201);

      // Get the key id from list
      const listResponse = await app.request('/v1/auth/keys', {
        method: 'GET',
        headers: getAuthHeaders(user, false),
      });
      const listBody = await listResponse.json();
      const keyToRevoke = listBody.keys.find((k: { name: string }) => k.name === 'Key to Revoke');
      expect(keyToRevoke).toBeDefined();

      // Revoke the key
      const revokeResponse = await app.request(`/v1/auth/keys/${keyToRevoke.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(user, false),
      });

      expect(revokeResponse.status).toBe(200);

      const body = await revokeResponse.json();
      expect(body.message).toBe('Key revoked');

      // Verify key is no longer in list
      const listAfterResponse = await app.request('/v1/auth/keys', {
        method: 'GET',
        headers: getAuthHeaders(user, false),
      });
      const listAfterBody = await listAfterResponse.json();
      const revokedKey = listAfterBody.keys.find((k: { id: string }) => k.id === keyToRevoke.id);
      expect(revokedKey).toBeUndefined();
    });

    it('revoked key returns 401 on subsequent use', async () => {
      // Create a template to test render
      await createTestTemplate(ctx.db, user.id);

      // First verify the key works
      const usageResponse = await app.request('/v1/usage', {
        method: 'GET',
        headers: {
          'X-API-Key': user.rawApiKey,
        },
      });
      expect(usageResponse.status).toBe(200);

      // Revoke the key via the API (this also evicts from cache)
      const revokeResponse = await app.request(`/v1/auth/keys/${user.apiKeyId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(user, false), // Use JWT auth
      });
      expect(revokeResponse.status).toBe(200);

      // Try to use the revoked key
      const response = await app.request('/v1/usage', {
        method: 'GET',
        headers: {
          'X-API-Key': user.rawApiKey,
        },
      });

      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.error).toBe('unauthorized');
    });

    it('rejects revoking an already revoked key', async () => {
      const revokeResponse = await app.request(`/v1/auth/keys/${user.apiKeyId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(user, false),
      });
      expect(revokeResponse.status).toBe(200);

      const secondResponse = await app.request(`/v1/auth/keys/${user.apiKeyId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(user, false),
      });
      expect(secondResponse.status).toBe(403);

      const body = await secondResponse.json();
      expect(body.error).toBe('forbidden');
    });
  });
});
