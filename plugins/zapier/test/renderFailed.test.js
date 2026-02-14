'use strict';

const zapier = require('zapier-platform-core');
const nock = require('nock');
const App = require('../index');

const appTester = zapier.createAppTester(App);

zapier.tools.env.inject();

describe('triggers/renderFailed', () => {
  beforeAll(() => {
    if (!process.env.BASE_URL) {
      process.env.BASE_URL = 'https://api.docuforge.dev';
    }
  });

  afterEach(() => {
    nock.cleanAll();
  });

  test('subscribes to render.failed webhook', async () => {
    const webhookData = {
      data: {
        id: 'wh_fail123',
        url: 'https://hooks.zapier.com/hooks/standard/456/def/',
        events: ['render.failed'],
        secret: 'whsec_fail123',
        created_at: '2025-06-15T10:00:00Z',
      },
    };

    nock(process.env.BASE_URL)
      .post('/v1/webhooks', {
        url: 'https://hooks.zapier.com/hooks/standard/456/def/',
        events: ['render.failed'],
      })
      .reply(201, webhookData);

    const bundle = {
      authData: { apiKey: 'docu_live_test123' },
      targetUrl: 'https://hooks.zapier.com/hooks/standard/456/def/',
    };

    const result = await appTester(
      App.triggers.renderFailed.operation.performSubscribe,
      bundle
    );

    expect(result).toBeDefined();
    expect(result.id).toBe('wh_fail123');
    expect(result.events).toContain('render.failed');
  });

  test('unsubscribes from webhook', async () => {
    nock(process.env.BASE_URL)
      .delete('/v1/webhooks/wh_fail123')
      .reply(204, {});

    const bundle = {
      authData: { apiKey: 'docu_live_test123' },
      subscribeData: { id: 'wh_fail123' },
    };

    const result = await appTester(
      App.triggers.renderFailed.operation.performUnsubscribe,
      bundle
    );

    expect(result).toBeDefined();
  });

  test('processes incoming webhook payload with error info', async () => {
    const bundle = {
      authData: { apiKey: 'docu_live_test123' },
      cleanedRequest: {
        data: {
          id: 'render_fail789',
          render_id: 'render_fail789',
          template_id: 'tmpl_abc123',
          template_name: 'Invoice Template',
          status: 'failed',
          error: 'Typst compilation error: missing variable "company_name"',
          created_at: '2025-06-15T10:30:00Z',
          failed_at: '2025-06-15T10:30:01Z',
        },
      },
    };

    const results = await appTester(
      App.triggers.renderFailed.operation.perform,
      bundle
    );

    expect(results).toHaveLength(1);
    expect(results[0].render_id).toBe('render_fail789');
    expect(results[0].status).toBe('failed');
    expect(results[0].error).toContain('missing variable');
    expect(results[0].template_id).toBe('tmpl_abc123');
  });

  test('handles payload without nested data wrapper', async () => {
    const bundle = {
      authData: { apiKey: 'docu_live_test123' },
      cleanedRequest: {
        id: 'render_direct_fail001',
        render_id: 'render_direct_fail001',
        status: 'failed',
        error: 'Template not found',
      },
    };

    const results = await appTester(
      App.triggers.renderFailed.operation.perform,
      bundle
    );

    expect(results).toHaveLength(1);
    expect(results[0].render_id).toBe('render_direct_fail001');
    expect(results[0].error).toBe('Template not found');
  });

  test('performList returns sample with error fields', async () => {
    const bundle = {
      authData: { apiKey: 'docu_live_test123' },
    };

    const results = await appTester(
      App.triggers.renderFailed.operation.performList,
      bundle
    );

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('failed');
    expect(results[0].error).toBeDefined();
    expect(results[0].id).toBeDefined();
    expect(results[0].template_id).toBeDefined();
  });

  test('trigger is configured as REST hook type', () => {
    expect(App.triggers.renderFailed.type).toBe('hook');
    expect(App.triggers.renderFailed.operation.performSubscribe).toBeDefined();
    expect(App.triggers.renderFailed.operation.performUnsubscribe).toBeDefined();
    expect(App.triggers.renderFailed.operation.perform).toBeDefined();
    expect(App.triggers.renderFailed.operation.performList).toBeDefined();
  });

  test('has sample and output fields with error field', () => {
    const { sample, outputFields } = App.triggers.renderFailed.operation;

    expect(sample).toBeDefined();
    expect(sample.id).toBeDefined();
    expect(sample.status).toBe('failed');
    expect(sample.error).toBeDefined();

    expect(outputFields).toBeDefined();
    expect(outputFields.length).toBeGreaterThan(0);

    const errorField = outputFields.find((f) => f.key === 'error');
    expect(errorField).toBeDefined();
    expect(errorField.label).toBe('Error Message');
  });
});
