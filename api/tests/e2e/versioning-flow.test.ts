/**
 * E2E Test: Template Versioning Flow
 *
 * Tests the template versioning journey:
 * 1. Create template with source "Hello v1"
 * 2. Render -> Verify mock engine receives "Hello v1"
 * 3. POST /console/templates/:id/publish with source "Hello v2"
 * 4. Render -> Verify mock engine receives "Hello v2"
 * 5. GET /console/templates/:id -> Verify both versions in history
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { createApp } from '../../src/app';
import { env } from '../../src/config/env';
import {
  createMockEngine,
  createTestServer,
  setupTestEnv,
  type MockEngine,
} from '../setup';
import { resetDb, initTestDb, getDb } from '../../src/db/client';

describe('E2E: Versioning Flow', () => {
  let engine: MockEngine;
  let app: ReturnType<typeof createApp>;
  let baseUrl: string;
  let server: ReturnType<typeof createTestServer>;

  function sessionCookie(token: string): string {
    return `${env.AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`;
  }

  function authMutationHeaders(seed: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Device-Id': `versioning-${seed}-${crypto.randomUUID()}`,
      'User-Agent': `versioning/${seed}`,
      'Accept-Language': 'en-US',
      'X-Forwarded-For': '198.51.100.52',
    };
  }

  beforeAll(async () => {
    engine = createMockEngine();
    setupTestEnv(engine.url);
    resetDb();

    // Initialize the global database for tests
    await initTestDb();

    app = createApp();
    server = createTestServer(app);
    baseUrl = server.url;
  });

  afterAll(async () => {
    server.stop();
    await engine.stop();
    resetDb();
  });

  beforeEach(() => {
    engine.clearRequests();
  });

  test('complete versioning journey from v1 to v2', async () => {
    // Register user
    const registerResponse = await fetch(`${baseUrl}/console/auth/register`, {
      method: 'POST',
      headers: authMutationHeaders('journey'),
      body: JSON.stringify({
        email: 'versioning-test@example.com',
        password: 'securepassword123',
      }),
    });

    expect(registerResponse.status).toBe(201);
    const { api_key, token } = await registerResponse.json();
    const apiKey = api_key.raw_key;
    const jwt = token;

    // Step 1: Create template with source "Hello v1"
    const v1Source = '#set page(paper: "a4")\nHello v1';

    const createResponse = await fetch(`${baseUrl}/console/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie(jwt),
      },
      body: JSON.stringify({
        name: 'Versioned Template',
        description: 'Testing versioning',
        source: v1Source,
        commit_message: 'Version 1 - Initial',
      }),
    });

    expect(createResponse.status).toBe(201);
    const createData = await createResponse.json();

    const templateId = createData.template.id;
    const v1VersionId = createData.template.live_version.id;

    expect(createData.template.live_version.version_number).toBe(1);
    expect(createData.template.live_version.source).toBe(v1Source);
    expect(createData.template.live_version.commit_message).toBe('Version 1 - Initial');

    // Step 2: Render and verify engine receives "Hello v1"
    engine.clearRequests();

    const render1Response = await fetch(`${baseUrl}/v1/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        template_id: templateId,
        data: {},
      }),
    });

    expect(render1Response.status).toBe(200);

    const render1Request = engine.getLastRequest();
    expect(render1Request).toBeDefined();
    expect(render1Request!.body!.template.files['main.typ']).toBe(v1Source);
    expect(render1Request!.body!.template.files['main.typ']).toContain('Hello v1');

    // Step 3: Publish new version with source "Hello v2"
    const v2Source = '#set page(paper: "a4")\nHello v2';

    const publishResponse = await fetch(`${baseUrl}/console/templates/${templateId}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie(jwt),
      },
      body: JSON.stringify({
        source: v2Source,
        commit_message: 'Version 2 - Updated greeting',
      }),
    });

    expect(publishResponse.status).toBe(200);
    const publishData = await publishResponse.json();

    expect(publishData.version.version_number).toBe(2);
    expect(publishData.version.commit_message).toBe('Version 2 - Updated greeting');
    expect(publishData.version.id).not.toBe(v1VersionId);

    const v2VersionId = publishData.version.id;

    // Step 4: Render again and verify engine receives "Hello v2"
    engine.clearRequests();

    const render2Response = await fetch(`${baseUrl}/v1/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        template_id: templateId,
        data: {},
      }),
    });

    expect(render2Response.status).toBe(200);

    const render2Request = engine.getLastRequest();
    expect(render2Request).toBeDefined();
    expect(render2Request!.body!.template.files['main.typ']).toBe(v2Source);
    expect(render2Request!.body!.template.files['main.typ']).toContain('Hello v2');
    expect(render2Request!.body!.template.files['main.typ']).not.toContain('Hello v1');

    // Step 5: Get template and verify both versions in history
    const getResponse = await fetch(`${baseUrl}/console/templates/${templateId}`, {
      method: 'GET',
      headers: {
        Cookie: sessionCookie(jwt),
      },
    });

    expect(getResponse.status).toBe(200);
    const templateData = await getResponse.json();

    // Verify template metadata
    expect(templateData.template.id).toBe(templateId);
    expect(templateData.template.name).toBe('Versioned Template');

    // Verify live version is v2
    expect(templateData.template.live_version).toBeDefined();
    expect(templateData.template.live_version.id).toBe(v2VersionId);
    expect(templateData.template.live_version.version_number).toBe(2);
    expect(templateData.template.live_version.source).toBe(v2Source);
    expect(templateData.template.live_version.commit_message).toBe('Version 2 - Updated greeting');

    // Verify version history contains both versions
    expect(templateData.template.versions).toBeDefined();
    expect(templateData.template.versions).toHaveLength(2);

    // Versions should be ordered by version number (could be desc or asc)
    const versionNumbers = templateData.template.versions.map(
      (v: { version_number: number }) => v.version_number
    );
    expect(versionNumbers).toContain(1);
    expect(versionNumbers).toContain(2);

    // Find each version
    const version1 = templateData.template.versions.find(
      (v: { version_number: number }) => v.version_number === 1
    );
    const version2 = templateData.template.versions.find(
      (v: { version_number: number }) => v.version_number === 2
    );

    expect(version1).toBeDefined();
    expect(version1.id).toBe(v1VersionId);
    expect(version1.commit_message).toBe('Version 1 - Initial');

    expect(version2).toBeDefined();
    expect(version2.id).toBe(v2VersionId);
    expect(version2.commit_message).toBe('Version 2 - Updated greeting');
  });

  test('multiple versions maintain complete history', async () => {
    // Register user
    const registerResponse = await fetch(`${baseUrl}/console/auth/register`, {
      method: 'POST',
      headers: authMutationHeaders('multi'),
      body: JSON.stringify({
        email: 'multi-version@example.com',
        password: 'securepassword123',
      }),
    });

    const { api_key, token } = await registerResponse.json();
    const jwt = token;

    // Create initial template
    const createResponse = await fetch(`${baseUrl}/console/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie(jwt),
      },
      body: JSON.stringify({
        name: 'Multi Version Template',
        source: '#set page(paper: "a4")\nVersion 1',
        commit_message: 'v1',
      }),
    });

    const { template } = await createResponse.json();
    const templateId = template.id;

    // Publish 4 more versions (total 5)
    for (let i = 2; i <= 5; i++) {
      const publishResponse = await fetch(`${baseUrl}/console/templates/${templateId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie(jwt),
        },
        body: JSON.stringify({
          source: `#set page(paper: "a4")\nVersion ${i}`,
          commit_message: `v${i}`,
        }),
      });

      expect(publishResponse.status).toBe(200);
      const publishData = await publishResponse.json();
      expect(publishData.version.version_number).toBe(i);
    }

    // Get template and verify all 5 versions
    const getResponse = await fetch(`${baseUrl}/console/templates/${templateId}`, {
      method: 'GET',
      headers: { Cookie: sessionCookie(jwt) },
    });

    const templateData = await getResponse.json();

    expect(templateData.template.versions).toHaveLength(5);
    expect(templateData.template.live_version.version_number).toBe(5);
    expect(templateData.template.live_version.source).toContain('Version 5');

    // Render uses latest version
    engine.clearRequests();

    const renderResponse = await fetch(`${baseUrl}/v1/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': api_key.raw_key,
      },
      body: JSON.stringify({
        template_id: templateId,
        data: {},
      }),
    });

    expect(renderResponse.status).toBe(200);
    expect(engine.getLastRequest()!.body!.template.files['main.typ']).toContain('Version 5');
  });

  test('version with files is properly passed to engine', async () => {
    // Register user
    const registerResponse = await fetch(`${baseUrl}/console/auth/register`, {
      method: 'POST',
      headers: authMutationHeaders('files'),
      body: JSON.stringify({
        email: 'files-version@example.com',
        password: 'securepassword123',
      }),
    });

    const { api_key, token } = await registerResponse.json();

    // Create template with files
    const createResponse = await fetch(`${baseUrl}/console/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie(token),
      },
      body: JSON.stringify({
        name: 'Template With Files',
        source: '#import "utils.typ": greet\n#greet("World")',
        files: {
          'utils.typ': '#let greet(name) = [Hello, #name!]',
        },
        commit_message: 'With utility file',
      }),
    });

    const { template } = await createResponse.json();

    // Render and verify files passed to engine
    engine.clearRequests();

    const renderResponse = await fetch(`${baseUrl}/v1/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': api_key.raw_key,
      },
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(renderResponse.status).toBe(200);

    const request = engine.getLastRequest();
    expect(request!.body!.template.files['main.typ']).toContain('import "utils.typ"');
    expect(request!.body!.template.files['utils.typ']).toBe('#let greet(name) = [Hello, #name!]');

    // Update with new files
    const publishResponse = await fetch(`${baseUrl}/console/templates/${template.id}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie(token),
      },
      body: JSON.stringify({
        source: '#import "utils.typ": greet\n#import "header.typ": header\n#header\n#greet("World")',
        files: {
          'utils.typ': '#let greet(name) = [Greetings, #name!]',
          'header.typ': '#let header = [= Document Header]',
        },
        commit_message: 'Added header',
      }),
    });

    expect(publishResponse.status).toBe(200);

    // Render again and verify new files
    engine.clearRequests();

    const render2Response = await fetch(`${baseUrl}/v1/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': api_key.raw_key,
      },
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(render2Response.status).toBe(200);

    const request2 = engine.getLastRequest();
    expect(request2!.body!.template.files['utils.typ']).toContain('Greetings');
    expect(request2!.body!.template.files['header.typ']).toContain('Document Header');
  });

  test('cannot publish to non-existent template', async () => {
    const registerResponse = await fetch(`${baseUrl}/console/auth/register`, {
      method: 'POST',
      headers: authMutationHeaders('missing-template'),
      body: JSON.stringify({
        email: 'no-template@example.com',
        password: 'securepassword123',
      }),
    });

    const { token } = await registerResponse.json();

    const publishResponse = await fetch(`${baseUrl}/console/templates/tpl_nonexistent/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie(token),
      },
      body: JSON.stringify({
        source: '#set page(paper: "a4")\nTest',
        commit_message: 'Should fail',
      }),
    });

    expect(publishResponse.status).toBe(404);
  });

  test('cannot publish to another users template', async () => {
    // Register first user and create template
    const register1Response = await fetch(`${baseUrl}/console/auth/register`, {
      method: 'POST',
      headers: authMutationHeaders('owner'),
      body: JSON.stringify({
        email: 'owner@example.com',
        password: 'securepassword123',
      }),
    });

    const { token: ownerToken } = await register1Response.json();

    const createResponse = await fetch(`${baseUrl}/console/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie(ownerToken),
      },
      body: JSON.stringify({
        name: 'Owners Template',
        source: '#set page(paper: "a4")\nOwner content',
        commit_message: 'Initial',
      }),
    });

    const { template } = await createResponse.json();

    // Register second user
    const register2Response = await fetch(`${baseUrl}/console/auth/register`, {
      method: 'POST',
      headers: authMutationHeaders('attacker'),
      body: JSON.stringify({
        email: 'attacker@example.com',
        password: 'securepassword123',
      }),
    });

    const { token: attackerToken } = await register2Response.json();

    // Try to publish to owner's template
    const publishResponse = await fetch(`${baseUrl}/console/templates/${template.id}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie(attackerToken),
      },
      body: JSON.stringify({
        source: '#set page(paper: "a4")\nMalicious content',
        commit_message: 'Hijack attempt',
      }),
    });

    expect(publishResponse.status).toBe(404);
  });
});
