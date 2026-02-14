'use strict';

const perform = async (z, bundle) => {
  const response = await z.request({
    url: `${process.env.BASE_URL}/v1/templates`,
    params: {
      page: 1,
      limit: 100,
      include_official: true,
    },
  });

  const templates = response.data.data || response.data;
  const query = (bundle.inputData.name || '').toLowerCase().trim();

  if (!query) {
    return templates;
  }

  return templates.filter((template) =>
    template.name.toLowerCase().includes(query)
  );
};

module.exports = {
  key: 'findTemplate',
  noun: 'Template',

  display: {
    label: 'Find Template',
    description: 'Finds a template by name.',
  },

  operation: {
    inputFields: [
      {
        key: 'name',
        label: 'Template Name',
        type: 'string',
        required: true,
        helpText: 'The name (or partial name) of the template to search for.',
      },
    ],
    perform,
    sample: {
      id: 'tmpl_abc123',
      name: 'Invoice Template',
      description: 'A professional invoice template',
      created_at: '2025-01-15T10:30:00Z',
      updated_at: '2025-06-20T14:00:00Z',
    },
    outputFields: [
      { key: 'id', label: 'Template ID' },
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
      { key: 'created_at', label: 'Created At', type: 'datetime' },
      { key: 'updated_at', label: 'Updated At', type: 'datetime' },
    ],
  },
};
