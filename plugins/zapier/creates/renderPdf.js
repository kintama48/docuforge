'use strict';

const perform = async (z, bundle) => {
  const response = await z.request({
    url: `${process.env.BASE_URL}/v1/render`,
    method: 'POST',
    body: {
      template_id: bundle.inputData.template_id,
      data: bundle.inputData.data || {},
    },
  });

  const renderId =
    response.headers.get('x-render-id') ||
    response.headers.get('X-Render-Id') ||
    `render_${Date.now()}`;

  const durationMs =
    response.headers.get('x-render-duration-ms') ||
    response.headers.get('X-Render-Duration-Ms') ||
    null;

  const file = await z.stashFile(response, response.content.length, `${renderId}.pdf`, 'application/pdf');

  return {
    id: renderId,
    render_id: renderId,
    duration_ms: durationMs ? parseInt(durationMs, 10) : null,
    file,
    template_id: bundle.inputData.template_id,
  };
};

module.exports = {
  key: 'renderPdf',
  noun: 'PDF',

  display: {
    label: 'Render PDF',
    description: 'Renders a PDF from a DocuForge Typst template with the provided data.',
    important: true,
  },

  operation: {
    inputFields: [
      {
        key: 'template_id',
        label: 'Template',
        type: 'string',
        required: true,
        dynamic: 'templateList.id.name',
        helpText: 'Select the Typst template to render.',
      },
      {
        key: 'data',
        label: 'Template Data',
        type: 'string',
        dict: true,
        required: false,
        helpText:
          'Key-value pairs to populate the template. Keys must match the variables defined in your Typst template.',
      },
    ],
    perform,
    sample: {
      id: 'render_abc123',
      render_id: 'render_abc123',
      duration_ms: 342,
      file: 'https://zapier-dev-files.s3.amazonaws.com/cli-platform/render_abc123.pdf',
      template_id: 'tmpl_abc123',
    },
    outputFields: [
      { key: 'id', label: 'Render ID' },
      { key: 'render_id', label: 'Render ID' },
      { key: 'duration_ms', label: 'Render Duration (ms)', type: 'integer' },
      { key: 'file', label: 'PDF File URL' },
      { key: 'template_id', label: 'Template ID' },
    ],
  },
};
