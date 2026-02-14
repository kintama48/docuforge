'use strict';

const zapier = require('zapier-platform-core');
const nock = require('nock');
const App = require('../index');

const appTester = zapier.createAppTester(App);

zapier.tools.env.inject();

describe('triggers/renderCompleted', () => {
  beforeAll(() => {
    if (!process.env.BASE_URL) {
      process.env.BASE_URL = 'https://api.docuforge.dev';
    }
  });

  afterEach(() => {
    nock.cleanAll();
  });

  test('subscribes to render.completed webhook', async () => {
    const webhookData = {
      data: {
        id: 'wh_abc123',
        url: 'https://hooks.zapier.com/hooks/standard/123/abc/',
        events: ['render.completed'],
        secret: 'whsec_test123',
        created_at: '2025-06-15T10:00:00Z',
      },
    };

    nock(process.env.BASE_URL)
      .post('/v1/webhooks', {
        url: 'https://hooks.zapier.com/hooks/standard/123/abc/',
        events: ['render.completed'],
      })
      .reply(201, webhookData);

    const bundle = {
      authData: { apiKey: 'docu_live_test123' },
      targetUrl: 'https://hooks.zapier.com/hooks/standard/123/abc/',
    };

    const result = await appTester(
      App.triggers.renderCompleted.operation.performSubscribe,
      bundle
    );

    expect(result).toBeDefined();
    expect(result.id).toBe('wh_abc123');
    expect(result.events).toContain('render.completed');
  });

  test('unsubscribes from webhook', async () => {
    nock(process.env.BASE_URL)
      .delete('/v1/webhooks/wh_abc123')
      .reply(204, {});

    const bundle = {
      authData: { apiKey: 'docu_live_test123' },
      subscribeData: { id: 'wh_abc123' },
    };

    const result = await appTester(
      App.triggers.renderCompleted.operation.performUnsubscribe,
      bundle
    );

    expect(result).toBeDefined();
  });

  test('processes incoming webhook payload', async () => {
    const bundle = {
      authData: { apiKey: 'docu_live_test123' },
      cleanedRequest: {
        data: {
          id: 'render_xyz789',
          render_id: 'render_xyz789',
          template_id: 'tmpl_abc123',
          template_name: 'Invoice Template',
          status: 'completed',
          duration_ms: 285,
          created_at: '2025-06-15T10:30:00Z',
          completed_at: '2025-06-15T10:30:01Z',
        },
      },
    };

    const results = await appTester(
      App.triggers.renderCompleted.operation.perform,
      bundle
    );

    expect(results).toHaveLength(1);
    expect(results[0].render_id).toBe('render_xyz789');
    expect(results[0].status).toBe('completed');
    expect(results[0].template_id).toBe('tmpl_abc123');
  });

  test('handles webhook payload without nested data wrapper', async () => {
    const bundle = {
      authData: { apiKey: 'docu_live_test123' },
      cleanedRequest: {
        id: 'render_direct001',
        render_id: 'render_direct001',
        status: 'completed',
      },
    };

    const results = await appTester(
      App.triggers.renderCompleted.operation.perform,
      bundle
    );

    expect(results).toHaveLength(1);
    expect(results[0].render_id).toBe('render_direct001');
  });

  test('performList returns sample data', async () => {
    const bundle = {
      authData: { apiKey: 'docu_live_test123' },
    };

    const results = await appTester(
      App.triggers.renderCompleted.operation.performList,
      bundle
    );

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('completed');
    expect(results[0].id).toBeDefined();
    expect(results[0].template_id).toBeDefined();
  });

  test('trigger is configured as REST hook type', () => {
    expect(App.triggers.renderCompleted.type).toBe('hook');
    expect(App.triggers.renderCompleted.operation.performSubscribe).toBeDefined();
    expect(App.triggers.renderCompleted.operation.performUnsubscribe).toBeDefined();
    expect(App.triggers.renderCompleted.operation.perform).toBeDefined();
    expect(App.triggers.renderCompleted.operation.performList).toBeDefined();
  });

  test('trigger has sample and output fields', () => {
    const { sample, outputFields } = App.triggers.renderCompleted.operation;

    expect(sample).toBeDefined();
    expect(sample.id).toBeDefined();
    expect(sample.status).toBe('completed');

    expect(outputFields).toBeDefined();
    expect(outputFields.length).toBeGreaterThan(0);
  });
});
