'use strict';

const zapier = require('zapier-platform-core');
const nock = require('nock');
const App = require('../index');

const appTester = zapier.createAppTester(App);

zapier.tools.env.inject();

describe('resources/template', () => {
  beforeAll(() => {
    if (!process.env.BASE_URL) {
      process.env.BASE_URL = 'https://api.docuforge.dev';
    }
  });

  afterEach(() => {
    nock.cleanAll();
  });

  const templatesListResponse = {
    data: [
      { id: 'tpl_abc123', name: 'Invoice Template', description: 'Professional invoice', created_at: '2025-01-15T10:30:00Z', updated_at: '2025-06-20T14:00:00Z' },
      { id: 'tpl_def456', name: 'Receipt Template', description: 'Simple receipt', created_at: '2025-02-10T08:00:00Z', updated_at: '2025-05-15T12:00:00Z' },
      { id: 'tpl_ghi789', name: 'Contract Agreement', description: 'Legal contract template', created_at: '2025-03-01T09:00:00Z', updated_at: '2025-04-20T16:30:00Z' },
    ],
  };

  const templateDetailResponse = {
    data: {
      id: 'tpl_abc123',
      name: 'Invoice Template',
      description: 'Professional invoice',
      versions: [{ version: 1, created_at: '2025-01-15T10:30:00Z' }],
      created_at: '2025-01-15T10:30:00Z',
      updated_at: '2025-06-20T14:00:00Z',
    },
  };

  test('lists templates successfully', async () => {
    nock(process.env.BASE_URL)
      .get('/v1/templates')
      .query(true)
      .reply(200, templatesListResponse);

    const bundle = {
      authData: { apiKey: 'docu_live_test123' },
      inputData: {},
    };

    const results = await appTester(
      App.resources.template.list.operation.perform,
      bundle
    );

    expect(results).toHaveLength(3);
    expect(results[0].id).toBe('tpl_abc123');
    expect(results[0].name).toBe('Invoice Template');
    expect(results[1].id).toBe('tpl_def456');
    expect(results[2].id).toBe('tpl_ghi789');
  });

  test('gets a single template by ID', async () => {
    nock(process.env.BASE_URL)
      .get('/v1/templates/tpl_abc123')
      .reply(200, templateDetailResponse);

    const bundle = {
      authData: { apiKey: 'docu_live_test123' },
      inputData: { id: 'tpl_abc123' },
    };

    const result = await appTester(
      App.resources.template.get.operation.perform,
      bundle
    );

    expect(result).toBeDefined();
    expect(result.id).toBe('tpl_abc123');
    expect(result.name).toBe('Invoice Template');
    expect(result.versions).toHaveLength(1);
    expect(result.versions[0].version).toBe(1);
  });

  test('both operations are hidden (for dynamic dropdowns)', () => {
    expect(App.resources.template.list.display.hidden).toBe(true);
    expect(App.resources.template.get.display.hidden).toBe(true);
  });

  test('has correct sample data', () => {
    const listSample = App.resources.template.list.operation.sample;
    expect(listSample).toBeDefined();
    expect(listSample.id).toBeDefined();
    expect(listSample.name).toBeDefined();
    expect(listSample.description).toBeDefined();

    const getSample = App.resources.template.get.operation.sample;
    expect(getSample).toBeDefined();
    expect(getSample.id).toBeDefined();
    expect(getSample.name).toBeDefined();
    expect(getSample.versions).toBeDefined();
    expect(getSample.versions).toHaveLength(1);
  });
});
