'use strict';

const test = async (z, bundle) => {
  const response = await z.request({
    url: `${process.env.BASE_URL}/v1/usage`,
    method: 'GET',
  });

  if (response.status === 401) {
    throw new z.errors.Error(
      'The API key you supplied is invalid.',
      'AuthenticationError',
      response.status
    );
  }

  return response.data;
};

const getConnectionLabel = (z, bundle) => {
  return `DocuForge (${bundle.inputData.plan} plan - ${bundle.inputData.renders_used}/${bundle.inputData.renders_limit} renders)`;
};

module.exports = {
  type: 'custom',
  fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'string',
      required: true,
      helpText:
        'Your DocuForge API key (starts with `docu_live_`). Find it in your [DocuForge Settings](https://app.docuforge.dev/settings/api).',
    },
  ],
  test,
  connectionLabel: getConnectionLabel,
};
