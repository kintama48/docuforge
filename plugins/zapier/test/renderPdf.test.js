'use strict';

const zapier = require('zapier-platform-core');
const nock = require('nock');
const App = require('../index');

zapier.tools.env.inject();

describe('creates/renderPdf', () => {
  beforeAll(() => {
    if (!process.env.BASE_URL) {
      process.env.BASE_URL = 'https://api.docuforge.dev';
    }
  });

  afterEach(() => {
    nock.cleanAll();
  });

  test('sends correct render request to API', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 fake pdf content');

    const scope = nock(process.env.BASE_URL)
      .post('/v1/render', {
        template_id: 'tmpl_abc123',
        data: { name: 'Acme Corp', amount: '1500' },
      })
      .reply(200, pdfBuffer, {
        'Content-Type': 'application/pdf',
        'X-Render-Id': 'render_xyz789',
        'X-Render-Duration-Ms': '342',
      });

    // Call the perform function directly with a mock z object
    const mockZ = {
      request: async (opts) => {
        const res = await require('http').request;
        // Use nock-intercepted fetch
        const url = new URL(opts.url);
        const http = require('http');
        const https = require('https');

        return new Promise((resolve, reject) => {
          const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: opts.method || 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(opts.headers || {}),
            },
          };

          const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              resolve({
                status: res.statusCode,
                headers: {
                  get: (key) => res.headers[key.toLowerCase()],
                },
                content: data,
                data: data,
              });
            });
          });

          if (opts.body) {
            req.write(typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body));
          }
          req.end();
        });
      },
      stashFile: async () => 'https://zapier-dev-files.s3.amazonaws.com/test/render_xyz789.pdf',
    };

    const renderPdf = require('../creates/renderPdf');
    const bundle = {
      authData: { apiKey: 'docu_live_test123' },
      inputData: {
        template_id: 'tmpl_abc123',
        data: { name: 'Acme Corp', amount: '1500' },
      },
    };

    const result = await renderPdf.operation.perform(mockZ, bundle);

    expect(result).toBeDefined();
    expect(result.render_id).toBe('render_xyz789');
    expect(result.template_id).toBe('tmpl_abc123');
    expect(result.duration_ms).toBe(342);
    expect(result.file).toBe('https://zapier-dev-files.s3.amazonaws.com/test/render_xyz789.pdf');
  });

  test('sends empty data object when data not provided', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 fake pdf content');

    nock(process.env.BASE_URL)
      .post('/v1/render', {
        template_id: 'tmpl_abc123',
        data: {},
      })
      .reply(200, pdfBuffer, {
        'Content-Type': 'application/pdf',
        'X-Render-Id': 'render_nodata001',
        'X-Render-Duration-Ms': '120',
      });

    const mockZ = {
      request: async (opts) => {
        const https = require('https');
        const url = new URL(opts.url);

        return new Promise((resolve, reject) => {
          const req = https.request(
            {
              hostname: url.hostname,
              path: url.pathname,
              method: opts.method || 'GET',
              headers: { 'Content-Type': 'application/json' },
            },
            (res) => {
              let data = '';
              res.on('data', (chunk) => (data += chunk));
              res.on('end', () => {
                resolve({
                  status: res.statusCode,
                  headers: { get: (key) => res.headers[key.toLowerCase()] },
                  content: data,
                });
              });
            }
          );
          if (opts.body) req.write(JSON.stringify(opts.body));
          req.end();
        });
      },
      stashFile: async () => 'https://zapier-dev-files.s3.amazonaws.com/test/file.pdf',
    };

    const renderPdf = require('../creates/renderPdf');
    const bundle = {
      authData: { apiKey: 'docu_live_test123' },
      inputData: { template_id: 'tmpl_abc123' },
    };

    const result = await renderPdf.operation.perform(mockZ, bundle);

    expect(result).toBeDefined();
    expect(result.render_id).toBe('render_nodata001');
    expect(result.duration_ms).toBe(120);
  });

  test('renderPdf has correct input fields configuration', () => {
    const inputFields = App.creates.renderPdf.operation.inputFields;

    expect(inputFields).toHaveLength(2);

    const templateField = inputFields.find((f) => f.key === 'template_id');
    expect(templateField.required).toBe(true);
    expect(templateField.dynamic).toBe('templateList.id.name');

    const dataField = inputFields.find((f) => f.key === 'data');
    expect(dataField.dict).toBe(true);
    expect(dataField.required).toBe(false);
  });

  test('renderPdf has sample and output fields', () => {
    const { sample, outputFields } = App.creates.renderPdf.operation;

    expect(sample).toBeDefined();
    expect(sample.id).toBeDefined();
    expect(sample.file).toBeDefined();

    expect(outputFields).toBeDefined();
    expect(outputFields.length).toBeGreaterThan(0);

    const fileField = outputFields.find((f) => f.key === 'file');
    expect(fileField).toBeDefined();
    expect(fileField.label).toBe('PDF File URL');
  });
});
