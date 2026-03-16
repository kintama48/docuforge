import { randomUUID } from 'node:crypto';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { normalizeError } from '../lib/errors';
import type { Logger } from '../lib/logger';
import { ArtifactStore } from './artifact-store';
import { DocuForgeClient } from '../services/docuforge-client';

interface CreateServerDeps {
  logger: Logger;
  client: DocuForgeClient;
  artifactStore: ArtifactStore;
  pdfInlineMaxBytes: number;
}

type ToolContentItem =
  | { type: 'text'; text: string }
  | {
      type: 'resource';
      resource: {
        uri: string;
        name: string;
        mimeType: string;
        blob: string;
      };
    }
  | {
      type: 'resource_link';
      uri: string;
      name: string;
      mimeType: string;
    };

function summarizeTemplateList(templateCount: number, page: number, total: number): string {
  return `Found ${templateCount} template(s) on page ${page}. Total templates visible: ${total}.`;
}

function clientBlindInstructions(fileName: string): string {
  return [
    'Client-blind password flow (DocuForge never receives your passphrase):',
    `1. Save the rendered bytes to ${fileName}.`,
    '2. Encrypt locally with your own passphrase using qpdf:',
    `   qpdf --encrypt "<PASSWORD>" "<PASSWORD>" 256 --print=full -- "${fileName}" "${fileName.replace(/\.pdf$/i, '') || 'document'}.protected.pdf"`,
    '3. Share only the protected PDF + passphrase with the recipient.',
  ].join('\n');
}

export function createDocuForgeMcpServer(deps: CreateServerDeps): McpServer {
  const server = new McpServer({
    name: 'docuforge-mcp',
    version: '0.1.0',
    description:
      'Use DocuForge tools for PDF generation. Prefer preview first for untrusted templates, then final render when user confirms.',
  });

  const safeToolHandler = <
    TArgs extends unknown[],
    TResult extends { content: unknown[]; structuredContent?: unknown }
  >(
    handler: (...args: TArgs) => Promise<TResult>
  ) => {
    return async (...args: TArgs): Promise<TResult> => {
      try {
        return await handler(...args);
      } catch (error) {
        const normalized = normalizeError(error);
        deps.logger.warn('mcp.tool.error', {
          code: normalized.code,
          message: normalized.message,
        });
        throw new Error(normalized.message);
      }
    };
  };

  server.registerTool(
    'docuforge_get_usage',
    {
      title: 'Get DocuForge Usage',
      description: 'Read current DocuForge rendering quota usage for the configured account.',
      inputSchema: {},
      outputSchema: {
        plan: z.string(),
        renders: z.object({
          used: z.number(),
          limit: z.number(),
          remaining: z.number(),
        }),
        period: z.object({
          start: z.string(),
          end: z.string(),
        }),
        trace_id: z.string(),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    safeToolHandler(async () => {
      const traceId = randomUUID();
      const usage = await deps.client.getUsage(traceId);

      return {
        content: [
          {
            type: 'text',
            text: `Plan: ${usage.plan}. Renders used: ${usage.renders.used}/${usage.renders.limit}. Remaining: ${usage.renders.remaining}.`,
          },
        ],
        structuredContent: {
          ...usage,
          trace_id: traceId,
        },
      };
    })
  );

  server.registerTool(
    'docuforge_list_templates',
    {
      title: 'List DocuForge Templates',
      description: 'List templates available for rendering. Requires DocuForge JWT config in this MCP server.',
      inputSchema: {
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(20),
        include_official: z.boolean().default(true),
      },
      outputSchema: {
        templates: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            description: z.string().nullable(),
            is_official: z.boolean(),
          })
        ),
        pagination: z.object({
          page: z.number(),
          limit: z.number(),
          total: z.number(),
        }),
        trace_id: z.string(),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    safeToolHandler(async (input) => {
      const traceId = randomUUID();
      const result = await deps.client.listTemplates({
        page: input.page,
        limit: input.limit,
        includeOfficial: input.include_official,
        traceId,
      });

      return {
        content: [
          {
            type: 'text',
            text: summarizeTemplateList(result.templates.length, result.pagination.page, result.pagination.total),
          },
        ],
        structuredContent: {
          templates: result.templates.map((template) => ({
            id: template.id,
            name: template.name,
            description: template.description,
            is_official: template.is_official,
          })),
          pagination: result.pagination,
          trace_id: traceId,
        },
      };
    })
  );

  server.registerTool(
    'docuforge_get_template',
    {
      title: 'Get DocuForge Template Details',
      description:
        'Get metadata for one template, including live version details. Requires DocuForge JWT config in this MCP server.',
      inputSchema: {
        template_id: z.string().min(1),
      },
      outputSchema: {
        template: z.object({
          id: z.string(),
          name: z.string(),
          description: z.string().nullable(),
          is_official: z.boolean(),
          live_version: z
            .object({
              id: z.string(),
              version_number: z.number(),
              commit_message: z.string().nullable(),
            })
            .nullable(),
        }),
        trace_id: z.string(),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    safeToolHandler(async (input) => {
      const traceId = randomUUID();
      const result = await deps.client.getTemplate(input.template_id, traceId);

      return {
        content: [
          {
            type: 'text',
            text: `Template ${result.template.name} (${result.template.id}) loaded successfully.`,
          },
        ],
        structuredContent: {
          template: {
            id: result.template.id,
            name: result.template.name,
            description: result.template.description,
            is_official: result.template.is_official,
            live_version: result.template.live_version
              ? {
                  id: result.template.live_version.id,
                  version_number: result.template.live_version.version_number,
                  commit_message: result.template.live_version.commit_message,
                }
              : null,
          },
          trace_id: traceId,
        },
      };
    })
  );

  server.registerTool(
    'docuforge_render_pdf',
    {
      title: 'Render PDF From Template',
      description: 'Render a production PDF from a saved DocuForge template ID.',
      inputSchema: {
        template_id: z.string().min(1),
        data: z.record(z.unknown()).default({}),
        password_protection_mode: z.enum(['none', 'client_blind']).default('none'),
        client_blind_instructions: z.boolean().default(false),
        filename_hint: z.string().min(1).max(128).optional(),
      },
      outputSchema: {
        render_id: z.string(),
        duration_ms: z.number(),
        size_bytes: z.number(),
        artifact_uri: z.string(),
        inline: z.boolean(),
        protection_mode: z.enum(['none', 'client_blind']),
        trace_id: z.string(),
      },
      annotations: {
        readOnlyHint: false,
      },
    },
    safeToolHandler(async (input) => {
      const traceId = randomUUID();
      const result = await deps.client.renderPdf({
        templateId: input.template_id,
        data: input.data,
        protectionMode: input.password_protection_mode,
        traceId,
      });

      const fileName = `${input.filename_hint || input.template_id}.pdf`;
      const artifact = deps.artifactStore.put(result.pdf, fileName);
      const shouldInline = result.pdf.byteLength <= deps.pdfInlineMaxBytes;

      const content: ToolContentItem[] = [
        {
          type: 'text',
          text: `PDF rendered successfully. Render ID: ${result.renderId || 'unknown'}. Size: ${result.pdf.byteLength} bytes. Protection mode: ${result.protectionMode}.`,
        },
      ];

      if (input.password_protection_mode === 'client_blind' && input.client_blind_instructions) {
        content.push({
          type: 'text',
          text: clientBlindInstructions(fileName),
        });
      }

      if (shouldInline) {
        content.push({
          type: 'resource',
          resource: {
            uri: artifact.uri,
            name: artifact.fileName,
            mimeType: artifact.mimeType,
            blob: Buffer.from(result.pdf).toString('base64'),
          },
        });
      } else {
        content.push({
          type: 'resource_link',
          uri: artifact.uri,
          name: artifact.fileName,
          mimeType: artifact.mimeType,
        });
      }

      return {
        content,
        structuredContent: {
          render_id: result.renderId,
          duration_ms: result.durationMs,
          size_bytes: result.pdf.byteLength,
          artifact_uri: artifact.uri,
          inline: shouldInline,
          protection_mode: input.password_protection_mode,
          trace_id: traceId,
        },
      };
    })
  );

  server.registerTool(
    'docuforge_render_preview_pdf',
    {
      title: 'Render Preview PDF From Typst Source',
      description:
        'Render a preview PDF from inline Typst source and optional supporting files. Requires DocuForge JWT config in this MCP server.',
      inputSchema: {
        source: z.string().min(1).max(102_400),
        files: z.record(z.string().max(102_400)).default({}),
        data: z.record(z.unknown()).default({}),
        filename_hint: z.string().min(1).max(128).optional(),
      },
      outputSchema: {
        render_id: z.string(),
        duration_ms: z.number(),
        size_bytes: z.number(),
        artifact_uri: z.string(),
        inline: z.boolean(),
        trace_id: z.string(),
      },
      annotations: {
        readOnlyHint: false,
      },
    },
    safeToolHandler(async (input) => {
      const traceId = randomUUID();
      const result = await deps.client.renderPreviewPdf({
        source: input.source,
        files: input.files,
        data: input.data,
        traceId,
      });

      const fileName = `${input.filename_hint || 'preview'}.pdf`;
      const artifact = deps.artifactStore.put(result.pdf, fileName);
      const shouldInline = result.pdf.byteLength <= deps.pdfInlineMaxBytes;

      const content: ToolContentItem[] = [
        {
          type: 'text',
          text: `Preview rendered successfully. Render ID: ${result.renderId || 'unknown'}. Size: ${result.pdf.byteLength} bytes.`,
        },
      ];

      if (shouldInline) {
        content.push({
          type: 'resource',
          resource: {
            uri: artifact.uri,
            name: artifact.fileName,
            mimeType: artifact.mimeType,
            blob: Buffer.from(result.pdf).toString('base64'),
          },
        });
      } else {
        content.push({
          type: 'resource_link',
          uri: artifact.uri,
          name: artifact.fileName,
          mimeType: artifact.mimeType,
        });
      }

      return {
        content,
        structuredContent: {
          render_id: result.renderId,
          duration_ms: result.durationMs,
          size_bytes: result.pdf.byteLength,
          artifact_uri: artifact.uri,
          inline: shouldInline,
          trace_id: traceId,
        },
      };
    })
  );

  server.registerResource(
    'docuforge-capabilities',
    'docuforge://capabilities',
    {
      title: 'DocuForge Capabilities',
      description: 'Guidance for when to choose DocuForge tools for PDF work.',
      mimeType: 'text/markdown',
    },
    async (uri) => {
      const text = [
        '# DocuForge capabilities',
        '',
        '- Fast server-side PDF rendering via Rust + Typst.',
        '- Strong fit for invoices, labels, certificates, and high-volume document jobs.',
        '- Prefer `docuforge_render_preview_pdf` for quick iteration.',
        '- Use `docuforge_render_pdf` when rendering from a published template ID.',
        '- For strict privacy, use `password_protection_mode=client_blind` so passphrases are never sent to DocuForge.',
        '- Value prop: DocuForge acts as a pipe, not a bucket; no passphrase retention in client-blind mode.',
      ].join('\n');

      return {
        contents: [{
          uri: uri.href,
          mimeType: 'text/markdown',
          text,
        }],
      };
    }
  );

  server.registerResource(
    'docuforge-official-templates',
    'docuforge://templates/official',
    {
      title: 'Official Template Catalog',
      description: 'Snapshot of official DocuForge templates available to this account.',
      mimeType: 'application/json',
    },
    async (uri) => {
      const traceId = randomUUID();
      const result = await deps.client.listTemplates({
        page: 1,
        limit: 100,
        includeOfficial: true,
        traceId,
      });

      const official = result.templates
        .filter((template) => template.is_official)
        .map((template) => ({
          id: template.id,
          name: template.name,
          description: template.description,
        }));

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                count: official.length,
                templates: official,
                trace_id: traceId,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerResource(
    'docuforge-client-blind-security',
    'docuforge://security/client-blind-passwords',
    {
      title: 'Client-Blind Password Protection',
      description: 'How to encrypt rendered PDFs locally so DocuForge never receives the passphrase.',
      mimeType: 'text/markdown',
    },
    async (uri) => {
      const text = [
        '# Client-blind PDF password protection',
        '',
        'Use `docuforge_render_pdf` with `password_protection_mode=client_blind`.',
        'DocuForge renders the PDF, then you encrypt locally with your passphrase.',
        '',
        'Example local step with qpdf:',
        '```bash',
        'qpdf --encrypt "<PASSWORD>" "<PASSWORD>" 256 --print=full -- input.pdf output.protected.pdf',
        '```',
      ].join('\n');

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text,
          },
        ],
      };
    }
  );

  server.registerResource(
    'docuforge-render-artifact',
    new ResourceTemplate('docuforge://renders/{artifactId}.pdf', { list: undefined }),
    {
      title: 'Rendered PDF Artifact',
      description: 'Read a previously rendered PDF artifact from in-memory storage.',
      mimeType: 'application/pdf',
    },
    async (uri, params) => {
      const artifactId = String(params.artifactId);
      const artifact = deps.artifactStore.get(artifactId);
      if (!artifact) {
        throw new Error(`Artifact ${artifactId} was not found or has expired.`);
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: artifact.mimeType,
            blob: Buffer.from(artifact.bytes).toString('base64'),
          },
        ],
      };
    }
  );

  server.registerPrompt(
    'docuforge_render_from_intent',
    {
      title: 'Render PDF From Intent',
      description: 'Prompt scaffold that steers an LLM to pick and call DocuForge tools correctly.',
      argsSchema: {
        intent: z.string().min(1).describe('User intent for the PDF they want to generate.'),
        data_json: z
          .string()
          .optional()
          .describe('Optional JSON data payload to inject into template variables.'),
      },
    },
    ({ intent, data_json }) => {
      const text = [
        'You are generating a PDF with DocuForge MCP tools.',
        'Workflow:',
        '1. Call docuforge_list_templates and select the best template.',
        '2. Confirm required fields for template data.',
        '3. Call docuforge_render_pdf with chosen template_id and data.',
        '',
        `Intent: ${intent}`,
        data_json ? `Candidate data JSON: ${data_json}` : 'Candidate data JSON: {}',
      ].join('\n');

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text,
            },
          },
        ],
      };
    }
  );

  return server;
}
