'use strict';

const zapier = require('zapier-platform-core');
const App = require('../index');

const appTester = zapier.createAppTester(App);

zapier.tools.env.inject();

describe('authentication', () => {
  beforeAll(() => {
    if (!process.env.BASE_URL) {
      process.env.BASE_URL = 'https://api.docuforge.dev';
    }
  });

  test('adds API key header via beforeRequest middleware', () => {
    const request = { headers: {} };
    const bundle = { authData: { apiKey: 'docu_live_test123' } };

    const result = App.beforeRequest[0](request, null, bundle);

    expect(result.headers['X-API-Key']).toBe('docu_live_test123');
  });

  test('skips header when no apiKey is present', () => {
    const request = { headers: {} };
    const bundle = { authData: {} };

    const result = App.beforeRequest[0](request, null, bundle);

    expect(result.headers['X-API-Key']).toBeUndefined();
  });

  test('authentication test succeeds with valid key', async () => {
    const bundle = {
      authData: {
        apiKey: 'docu_live_test123',
      },
    };

    const mockResponse = {
      status: 200,
      data: {
        plan: 'pro',
        renders_used: 42,
        renders_limit: 1000,
      },
    };

    const nock = require('nock');
    nock(process.env.BASE_URL)
      .get('/v1/usage')
      .reply(200, mockResponse.data);

    const result = await appTester(App.authentication.test, bundle);

    expect(result).toBeDefined();
    expect(result.plan).toBe('pro');
    expect(result.renders_used).toBe(42);
  });

  test('authentication test fails with invalid key', async () => {
    const bundle = {
      authData: {
        apiKey: 'docu_live_invalid',
      },
    };

    const nock = require('nock');
    nock(process.env.BASE_URL)
      .get('/v1/usage')
      .reply(401, { error: 'Unauthorized' });

    await expect(
      appTester(App.authentication.test, bundle)
    ).rejects.toThrow();
  });

  test('connectionLabel formats correctly', () => {
    const bundle = {
      inputData: {
        plan: 'pro',
        renders_used: 42,
        renders_limit: 1000,
      },
    };

    const label = App.authentication.connectionLabel(null, bundle);

    expect(label).toBe('DocuForge (pro plan - 42/1000 renders)');
  });

  test('authentication fields are configured correctly', () => {
    expect(App.authentication.type).toBe('custom');
    expect(App.authentication.fields).toHaveLength(1);

    const apiKeyField = App.authentication.fields[0];
    expect(apiKeyField.key).toBe('apiKey');
    expect(apiKeyField.required).toBe(true);
    expect(apiKeyField.helpText).toContain('docu_live_');
  });
});
