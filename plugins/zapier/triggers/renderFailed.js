'use strict';

const performSubscribe = async (z, bundle) => {
  const response = await z.request({
    url: `${process.env.BASE_URL}/v1/webhooks`,
    method: 'POST',
    body: {
      url: bundle.targetUrl,
      events: ['render.failed'],
    },
  });

  return response.data.data || response.data;
};

const performUnsubscribe = async (z, bundle) => {
  const webhookId = bundle.subscribeData.id;

  const response = await z.request({
    url: `${process.env.BASE_URL}/v1/webhooks/${webhookId}`,
    method: 'DELETE',
  });

  return response.data;
};

const perform = (z, bundle) => {
  const data = bundle.cleanedRequest.data || bundle.cleanedRequest;

  return [data];
};

const performList = async (z, bundle) => {
  return [
    {
      id: 'render_sample_002',
      render_id: 'render_sample_002',
      template_id: 'tmpl_abc123',
      template_name: 'Invoice Template',
      status: 'failed',
      error: 'Typst compilation error: missing variable "company_name"',
      created_at: new Date().toISOString(),
      failed_at: new Date().toISOString(),
    },
  ];
};

module.exports = {
  key: 'renderFailed',
  noun: 'Render',
  type: 'hook',

  display: {
    label: 'Render Failed',
    description: 'Triggers when a PDF render fails.',
  },

  operation: {
    performSubscribe,
    performUnsubscribe,
    perform,
    performList,

    sample: {
      id: 'render_sample_002',
      render_id: 'render_sample_002',
      template_id: 'tmpl_abc123',
      template_name: 'Invoice Template',
      status: 'failed',
      error: 'Typst compilation error: missing variable "company_name"',
      created_at: '2025-06-15T10:30:00Z',
      failed_at: '2025-06-15T10:30:01Z',
    },

    outputFields: [
      { key: 'id', label: 'ID' },
      { key: 'render_id', label: 'Render ID' },
      { key: 'template_id', label: 'Template ID' },
      { key: 'template_name', label: 'Template Name' },
      { key: 'status', label: 'Status' },
      { key: 'error', label: 'Error Message' },
      { key: 'created_at', label: 'Created At', type: 'datetime' },
      { key: 'failed_at', label: 'Failed At', type: 'datetime' },
    ],
  },
};
