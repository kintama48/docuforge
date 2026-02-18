/**
 * Integration tests for template routes beyond version detail.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createApp } from '../../src/app';
import { initTestDb, getDb, resetDb, schema } from '../../src/db/client';
import {
  setupTestEnv,
  createTestUser,
  createTestTemplate,
  createOfficialTemplate,
  getAuthHeaders,
} from '../setup';
import { eq } from 'drizzle-orm';

describe('Templates routes', () => {
  let app: ReturnType<typeof createApp>;
  let user: Awaited<ReturnType<typeof createTestUser>>;

  beforeEach(async () => {
    setupTestEnv('http://127.0.0.1:3001');
    await initTestDb();
    app = createApp();
    user = await createTestUser(getDb() as any);
  });

  afterEach(() => {
    resetDb();
  });

  it('lists user templates and official templates when include_official=true', async () => {
    const db = getDb();
    await createTestTemplate(db as any, user.id, { name: 'User Template' });
    await createOfficialTemplate(db as any, { name: 'Official Template' });

    const response = await app.request(
      '/v1/templates?page=1&limit=10&include_official=true',
      {
        method: 'GET',
        headers: getAuthHeaders(user, false),
      }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.templates.length).toBe(2);
    const official = body.templates.find((t: any) => t.is_official === true);
    expect(official).toBeDefined();
  });

  it('lists only user templates when include_official=false', async () => {
    const db = getDb();
    await createTestTemplate(db as any, user.id, { name: 'User Template' });
    await createOfficialTemplate(db as any, { name: 'Official Template' });

    const response = await app.request('/v1/templates?page=1&limit=10&include_official=false', {
      method: 'GET',
      headers: getAuthHeaders(user, false),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.templates.length).toBe(1);
    expect(body.templates[0].name).toBe('User Template');
  });

  it('returns template with versions and live version details', async () => {
    const db = getDb();
    const template = await createTestTemplate(db as any, user.id, {
      name: 'Detailed Template',
      defaults: { title: 'Report' },
      files: { 'cover.typ': '= Cover' },
    });

    const response = await app.request(`/v1/templates/${template.id}`, {
      method: 'GET',
      headers: getAuthHeaders(user, false),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.template.live_version).toBeDefined();
    expect(body.template.versions.length).toBeGreaterThan(0);
  });

  it('creates a template from low_code_spec without explicit source', async () => {
    const response = await app.request('/v1/templates', {
      method: 'POST',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify({
        name: 'Low-code invoice',
        low_code_spec: {
          version: 1,
          blocks: [
            {
              type: 'header',
              props: {
                title: '{{invoice.title}}',
              },
            },
            {
              type: 'paragraph',
              props: {
                text: '{{invoice.notes}}',
              },
            },
          ],
        },
      }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.template.live_version.low_code_spec).toBeDefined();
    expect(body.template.live_version.source).toContain('sys.inputs');
    expect(body.template.live_version.source).toContain('data.invoice.title');
  });

  it('updates template metadata', async () => {
    const db = getDb();
    const template = await createTestTemplate(db as any, user.id, {
      name: 'Old Name',
      description: 'Old description',
    });

    const response = await app.request(`/v1/templates/${template.id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify({ name: 'New Name', description: 'New description' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.template.name).toBe('New Name');
    expect(body.template.description).toBe('New description');
  });

  it('rejects template name conflicts on update', async () => {
    const db = getDb();
    const template = await createTestTemplate(db as any, user.id, { name: 'Template A' });
    await createTestTemplate(db as any, user.id, { name: 'Template B' });

    const response = await app.request(`/v1/templates/${template.id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify({ name: 'Template B' }),
    });

    expect(response.status).toBe(409);
  });

  it('forks official templates for the current user', async () => {
    const db = getDb();
    const official = await createOfficialTemplate(db as any, { name: 'Official Template' });

    const response = await app.request(`/v1/templates/${official.id}/fork`, {
      method: 'POST',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify({ name: 'Forked Template' }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.template.name).toBe('Forked Template');

    const [record] = await db
      .select()
      .from(schema.templates)
      .where(eq(schema.templates.id, body.template.id));
    expect(record?.userId).toBe(user.id);
  });

  it('publishes a new version from low_code_spec', async () => {
    const db = getDb();
    const template = await createTestTemplate(db as any, user.id, {
      name: 'Publish low-code',
      source: '#let data = sys.inputs\n= "Initial"',
    });

    const response = await app.request(`/v1/templates/${template.id}/publish`, {
      method: 'POST',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify({
        low_code_spec: {
          version: 1,
          blocks: [
            {
              type: 'header',
              props: {
                title: '{{invoice.title}}',
              },
            },
          ],
        },
        commit_message: 'Move to guided',
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.version.low_code_spec).toBeDefined();

    const responseTemplate = await app.request(`/v1/templates/${template.id}`, {
      method: 'GET',
      headers: getAuthHeaders(user, false),
    });
    const templateBody = await responseTemplate.json();
    expect(templateBody.template.live_version.low_code_spec).toBeDefined();
    expect(templateBody.template.live_version.source).toContain('data.invoice.title');
  });

  it('rejects forking private templates owned by others', async () => {
    const db = getDb();
    const otherUser = await createTestUser(db as any);
    const otherTemplate = await createTestTemplate(db as any, otherUser.id, { name: 'Private' });

    const response = await app.request(`/v1/templates/${otherTemplate.id}/fork`, {
      method: 'POST',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify({ name: 'Should Fail' }),
    });

    expect(response.status).toBe(403);
  });

  it('deletes owned templates', async () => {
    const db = getDb();
    const template = await createTestTemplate(db as any, user.id, { name: 'Delete Me' });

    const response = await app.request(`/v1/templates/${template.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(user, false),
    });

    expect(response.status).toBe(200);

    const after = await app.request(`/v1/templates/${template.id}`, {
      method: 'GET',
      headers: getAuthHeaders(user, false),
    });
    expect(after.status).toBe(404);
  });

  it('rejects deleting official templates', async () => {
    const db = getDb();
    const official = await createOfficialTemplate(db as any, { name: 'Official' });

    const response = await app.request(`/v1/templates/${official.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(user, false),
    });

    expect(response.status).toBe(403);
  });
});
