'use strict';

const authentication = require('./authentication');
const templateResource = require('./resources/template');
const renderCompleted = require('./triggers/renderCompleted');
const renderFailed = require('./triggers/renderFailed');
const renderPdf = require('./creates/renderPdf');
const findTemplate = require('./searches/findTemplate');

const addApiKeyHeader = (request, z, bundle) => {
  if (bundle.authData.apiKey) {
    request.headers['X-API-Key'] = bundle.authData.apiKey;
  }
  return request;
};

const handleHttpErrors = (response, z, bundle) => {
  if (response.status === 401) {
    throw new z.errors.Error(
      'Your DocuForge API key is invalid. Please reconnect your account.',
      'AuthenticationError',
      response.status
    );
  }

  if (response.status === 403) {
    throw new z.errors.Error(
      'You do not have permission to perform this action. Check your plan limits.',
      'ForbiddenError',
      response.status
    );
  }

  if (response.status === 429) {
    throw new z.errors.Error(
      'Rate limit exceeded. Please try again later.',
      'ThrottledError',
      response.status
    );
  }

  return response;
};

module.exports = {
  version: require('./package.json').version,
  platformVersion: require('zapier-platform-core').version,

  authentication,

  beforeRequest: [addApiKeyHeader],
  afterResponse: [handleHttpErrors],

  resources: {
    [templateResource.key]: templateResource,
  },

  triggers: {
    [renderCompleted.key]: renderCompleted,
    [renderFailed.key]: renderFailed,
  },

  creates: {
    [renderPdf.key]: renderPdf,
  },

  searches: {
    [findTemplate.key]: findTemplate,
  },
};
