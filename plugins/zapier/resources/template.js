'use strict';

const list = async (z, bundle) => {
  const response = await z.request({
    url: `${process.env.BASE_URL}/v1/templates`,
    params: {
      page: bundle.inputData.page || 1,
      limit: bundle.inputData.limit || 100,
      include_official: bundle.inputData.include_official || false,
    },
  });

  return response.data.data || response.data;
};

const get = async (z, bundle) => {
  const response = await z.request({
    url: `${process.env.BASE_URL}/v1/templates/${bundle.inputData.id}`,
  });

  return response.data.data || response.data;
};

module.exports = {
  key: 'template',
  noun: 'Template',

  list: {
    display: {
      label: 'List Templates',
      description: 'Returns a list of available templates.',
      hidden: true,
    },
    operation: {
      perform: list,
      sample: {
        id: 'tmpl_abc123',
        name: 'Invoice Template',
        description: 'A professional invoice template',
        created_at: '2025-01-15T10:30:00Z',
        updated_at: '2025-06-20T14:00:00Z',
      },
    },
  },

  get: {
    display: {
      label: 'Get Template',
      description: 'Gets details of a specific template.',
      hidden: true,
    },
    operation: {
      inputFields: [
        {
          key: 'id',
          label: 'Template ID',
          type: 'string',
          required: true,
        },
      ],
      perform: get,
      sample: {
        id: 'tmpl_abc123',
        name: 'Invoice Template',
        description: 'A professional invoice template',
        versions: [
          {
            version: 1,
            created_at: '2025-01-15T10:30:00Z',
          },
        ],
        created_at: '2025-01-15T10:30:00Z',
        updated_at: '2025-06-20T14:00:00Z',
      },
    },
  },
};
