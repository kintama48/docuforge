'use strict';

const performSubscribe = async (z, bundle) => {
  const response = await z.request({
    url: `${process.env.BASE_URL}/v1/webhooks`,
    method: 'POST',
    body: {
      url: bundle.targetUrl,
      events: ['render.completed'],
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
      id: 'render_sample_001',
      render_id: 'render_sample_001',
      template_id: 'tmpl_abc123',
      template_name: 'Invoice Template',
      status: 'completed',
      duration_ms: 285,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    },
  ];
};

module.exports = {
  key: 'renderCompleted',
  noun: 'Render',
  type: 'hook',

  display: {
    label: 'Render Completed',
    description: 'Triggers when a PDF render completes successfully.',
    important: true,
  },

  operation: {
    performSubscribe,
    performUnsubscribe,
    perform,
    performList,

    sample: {
      id: 'render_sample_001',
      render_id: 'render_sample_001',
      template_id: 'tmpl_abc123',
      template_name: 'Invoice Template',
      status: 'completed',
      duration_ms: 285,
      created_at: '2025-06-15T10:30:00Z',
      completed_at: '2025-06-15T10:30:01Z',
    },

    outputFields: [
      { key: 'id', label: 'ID' },
      { key: 'render_id', label: 'Render ID' },
      { key: 'template_id', label: 'Template ID' },
      { key: 'template_name', label: 'Template Name' },
      { key: 'status', label: 'Status' },
      { key: 'duration_ms', label: 'Duration (ms)', type: 'integer' },
      { key: 'created_at', label: 'Created At', type: 'datetime' },
      { key: 'completed_at', label: 'Completed At', type: 'datetime' },
    ],
  },
};
