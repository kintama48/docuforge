'use strict';

const zapier = require('zapier-platform-core');
const nock = require('nock');
const App = require('../index');

const appTester = zapier.createAppTester(App);

zapier.tools.env.inject();

describe('searches/findTemplate', () => {
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

  test('filters templates by name (case-insensitive partial match)', async () => {
    nock(process.env.BASE_URL)
      .get('/v1/templates')
      .query({ page: 1, limit: 100, include_official: true })
      .reply(200, templatesListResponse);

    const bundle = {
      authData: { apiKey: 'docu_live_test123' },
      inputData: { name: 'invoice' },
    };

    const results = await appTester(
      App.searches.findTemplate.operation.perform,
      bundle
    );

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('tpl_abc123');
    expect(results[0].name).toBe('Invoice Template');
  });

  test('returns all templates when empty query', async () => {
    nock(process.env.BASE_URL)
      .get('/v1/templates')
      .query({ page: 1, limit: 100, include_official: true })
      .reply(200, templatesListResponse);

    const bundle = {
      authData: { apiKey: 'docu_live_test123' },
      inputData: { name: '' },
    };

    const results = await appTester(
      App.searches.findTemplate.operation.perform,
      bundle
    );

    expect(results).toHaveLength(3);
    expect(results[0].id).toBe('tpl_abc123');
    expect(results[1].id).toBe('tpl_def456');
    expect(results[2].id).toBe('tpl_ghi789');
  });

  test('returns empty array when no match', async () => {
    nock(process.env.BASE_URL)
      .get('/v1/templates')
      .query({ page: 1, limit: 100, include_official: true })
      .reply(200, templatesListResponse);

    const bundle = {
      authData: { apiKey: 'docu_live_test123' },
      inputData: { name: 'nonexistent' },
    };

    const results = await appTester(
      App.searches.findTemplate.operation.perform,
      bundle
    );

    expect(results).toHaveLength(0);
  });

  test('has correct input fields configuration', () => {
    const inputFields = App.searches.findTemplate.operation.inputFields;

    expect(inputFields).toHaveLength(1);

    const nameField = inputFields.find((f) => f.key === 'name');
    expect(nameField).toBeDefined();
    expect(nameField.label).toBe('Template Name');
    expect(nameField.type).toBe('string');
    expect(nameField.required).toBe(true);
  });

  test('has sample and output fields', () => {
    const { sample, outputFields } = App.searches.findTemplate.operation;

    expect(sample).toBeDefined();
    expect(sample.id).toBeDefined();
    expect(sample.name).toBeDefined();
    expect(sample.description).toBeDefined();

    expect(outputFields).toBeDefined();
    expect(outputFields.length).toBeGreaterThan(0);

    const idField = outputFields.find((f) => f.key === 'id');
    expect(idField).toBeDefined();
    expect(idField.label).toBe('Template ID');

    const nameField = outputFields.find((f) => f.key === 'name');
    expect(nameField).toBeDefined();
    expect(nameField.label).toBe('Name');
  });
});
