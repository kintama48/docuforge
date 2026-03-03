import { Hono } from 'hono';

import { eq, inArray } from 'drizzle-orm';
import { getDb, schema } from '../db/client';
import { jwtAuth } from '../middleware/auth';
import { aiRateLimit } from '../middleware/rate-limit';
import { shortCache, mediumCache, noCache } from '../middleware/cache';
import { etag } from '../middleware/etag';
import {
  zValidator,
  createTemplateSchema,
  publishVersionSchema,
  updateTemplateSchema,
  forkTemplateSchema,
  listTemplatesQuerySchema,
  pdfImportAnalyzeSchema,
  pdfImportCreateSchema,
} from '../lib/validation';
import {
  createTemplate,
  publishVersion,
  updateTemplate,
  forkTemplate,
  deleteTemplate,
  listTemplates,
  getTemplate,
  getTemplateVersion,
} from '../services/template';
import { aiGenerateFromPdfImport } from '../services/ai';
import { consumeAiCreditOrThrow, updateAiUsageLog } from '../services/ai-usage';
import { decodePdfBase64, extractPdfText } from '../services/pdf-import';

const templates = new Hono();

// GET /v1/templates - List templates
templates.get('/', jwtAuth, shortCache, etag, zValidator('query', listTemplatesQuerySchema), async (c) => {
  const query = c.req.valid('query');
  const { userId } = c.get('auth');

  const result = await listTemplates(userId, {
    page: query.page,
    limit: query.limit,
    includeOfficial: query.include_official,
  });

  const db = getDb();

  // API-m2 fix: Batch fetch all live versions instead of N+1 queries
  const versionIds = result.templates
    .map((t) => t.liveVersionId)
    .filter((id): id is string => id !== null);

  const versions = versionIds.length > 0
    ? await db
        .select()
        .from(schema.templateVersions)
        .where(inArray(schema.templateVersions.id, versionIds))
    : [];

  const versionMap = new Map(versions.map((v) => [v.id, v]));

  const templatesWithVersions = result.templates.map((template) => {
    const version = template.liveVersionId ? versionMap.get(template.liveVersionId) : null;
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      is_official: template.userId === null,
      live_version: version
        ? {
            id: version.id,
            version_number: version.versionNumber,
            commit_message: version.commitMessage,
            created_at: version.createdAt,
          }
        : null,
      created_at: template.createdAt,
      updated_at: template.updatedAt,
    };
  });

  return c.json({
    templates: templatesWithVersions,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
    },
  });
});

// GET /v1/templates/:id/versions/:versionId - Get template version detail
templates.get('/:id/versions/:versionId', jwtAuth, mediumCache, etag, async (c) => {
  const templateId = c.req.param('id');
  const versionId = c.req.param('versionId');
  const { userId } = c.get('auth');

  const version = await getTemplateVersion(templateId, versionId, userId);

  return c.json({
    version: {
      id: version.id,
      version_number: version.versionNumber,
      source: version.source,
      files: version.files,
      defaults: version.defaults,
      low_code_spec: version.lowCodeSpec,
      commit_message: version.commitMessage,
      created_at: version.createdAt,
    },
  });
});

// GET /v1/templates/:id - Get template with versions
templates.get('/:id', jwtAuth, mediumCache, etag, async (c) => {
  const templateId = c.req.param('id');
  const { userId } = c.get('auth');

  const { template, versions } = await getTemplate(templateId, userId);

  const liveVersion = versions.find((v) => v.id === template.liveVersionId);

  return c.json({
    template: {
      id: template.id,
      name: template.name,
      description: template.description,
      is_official: template.userId === null,
      live_version: liveVersion
        ? {
            id: liveVersion.id,
            version_number: liveVersion.versionNumber,
            source: liveVersion.source,
            files: liveVersion.files,
            defaults: liveVersion.defaults,
            low_code_spec: liveVersion.lowCodeSpec,
            commit_message: liveVersion.commitMessage,
            created_at: liveVersion.createdAt,
          }
        : null,
      versions: versions.map((v) => ({
        id: v.id,
        version_number: v.versionNumber,
        commit_message: v.commitMessage,
        created_at: v.createdAt,
      })),
      created_at: template.createdAt,
      updated_at: template.updatedAt,
    },
  });
});

// POST /v1/templates - Create template
templates.post('/', jwtAuth, noCache, zValidator('json', createTemplateSchema), async (c) => {
  const data = c.req.valid('json');
  const { userId } = c.get('auth');

  const { template, version } = await createTemplate({
    userId,
    name: data.name,
    description: data.description,
    source: data.source,
    lowCodeSpec: data.low_code_spec,
    files: data.files,
    defaults: data.defaults,
    commitMessage: data.commit_message,
  });

  return c.json(
    {
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        live_version: {
          id: version.id,
          version_number: version.versionNumber,
          source: version.source,
          files: version.files,
          defaults: version.defaults,
          low_code_spec: version.lowCodeSpec,
          commit_message: version.commitMessage,
          created_at: version.createdAt,
        },
        created_at: template.createdAt,
        updated_at: template.updatedAt,
      },
    },
    201
  );
});

// POST /v1/templates/:id/publish - Publish new version
templates.post('/:id/publish', jwtAuth, noCache, zValidator('json', publishVersionSchema), async (c) => {
  const templateId = c.req.param('id');
  const data = c.req.valid('json');
  const { userId } = c.get('auth');

  const version = await publishVersion({
    templateId,
    userId,
    source: data.source,
    lowCodeSpec: data.low_code_spec,
    files: data.files,
    defaults: data.defaults,
    commitMessage: data.commit_message,
  });

  return c.json({
    version: {
      id: version.id,
      version_number: version.versionNumber,
      low_code_spec: version.lowCodeSpec,
      commit_message: version.commitMessage,
      created_at: version.createdAt,
    },
  });
});

// PATCH /v1/templates/:id - Update template metadata
templates.patch('/:id', jwtAuth, noCache, zValidator('json', updateTemplateSchema), async (c) => {
  const templateId = c.req.param('id');
  const data = c.req.valid('json');
  const { userId } = c.get('auth');

  await updateTemplate({
    templateId,
    userId,
    name: data.name,
    description: data.description,
  });

  const { template, versions } = await getTemplate(templateId, userId);
  const liveVersion = versions.find((v) => v.id === template.liveVersionId);

  return c.json({
    template: {
      id: template.id,
      name: template.name,
      description: template.description,
      is_official: template.userId === null,
      live_version: liveVersion
        ? {
            id: liveVersion.id,
            version_number: liveVersion.versionNumber,
            commit_message: liveVersion.commitMessage,
            created_at: liveVersion.createdAt,
          }
        : null,
      created_at: template.createdAt,
      updated_at: template.updatedAt,
    },
  });
});

// POST /v1/templates/:id/fork - Fork template
templates.post('/:id/fork', jwtAuth, noCache, zValidator('json', forkTemplateSchema), async (c) => {
  const sourceTemplateId = c.req.param('id');
  const { name } = c.req.valid('json');
  const { userId } = c.get('auth');

  const { template, version } = await forkTemplate(sourceTemplateId, userId, name);

  return c.json(
    {
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        live_version: {
          id: version.id,
          version_number: version.versionNumber,
          source: version.source,
          low_code_spec: version.lowCodeSpec,
          commit_message: version.commitMessage,
          created_at: version.createdAt,
        },
        created_at: template.createdAt,
        updated_at: template.updatedAt,
      },
    },
    201
  );
});

// DELETE /v1/templates/:id - Delete template
templates.delete('/:id', jwtAuth, noCache, async (c) => {
  const templateId = c.req.param('id');
  const { userId } = c.get('auth');

  await deleteTemplate(templateId, userId);

  return c.json({ message: 'Template deleted' });
});

// POST /v1/templates/import/pdf/analyze - Analyze PDF and generate best-effort Typst draft
templates.post(
  '/import/pdf/analyze',
  jwtAuth,
  aiRateLimit,
  noCache,
  zValidator('json', pdfImportAnalyzeSchema),
  async (c) => {
    const { userId } = c.get('auth');
    const data = c.req.valid('json');
    const usageLogId = await consumeAiCreditOrThrow(userId, 'pdf_import', 1);

    try {
      const pdfBuffer = decodePdfBase64(data.pdf_base64);
      const analysis = await extractPdfText(pdfBuffer);
      const ai = await aiGenerateFromPdfImport({
        fileName: data.file_name,
        converterOutput: analysis.extractedText,
        userPrompt: data.user_prompt,
      });

      await updateAiUsageLog(usageLogId, {
        status: 'consumed',
        tokensUsed: ai.tokensUsed,
      });

      return c.json({
        analysis: {
          source: ai.code,
          tokens_used: ai.tokensUsed,
          converter: analysis.converterName,
          extracted_text_preview: analysis.extractedText.slice(0, 5000),
          ai_credit_charged: 1,
          usage_log_id: usageLogId,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'PDF import analysis failed';
      await updateAiUsageLog(usageLogId, {
        status: 'failed',
        errorMessage: message,
      });
      throw error;
    }
  }
);

// POST /v1/templates/import/pdf/create - Create editable template draft from analyzed source
templates.post(
  '/import/pdf/create',
  jwtAuth,
  noCache,
  zValidator('json', pdfImportCreateSchema),
  async (c) => {
    const { userId } = c.get('auth');
    const data = c.req.valid('json');

    const { template, version } = await createTemplate({
      userId,
      name: data.name,
      description: data.description,
      source: data.source,
      defaults: data.defaults,
      commitMessage: data.commit_message || 'Imported from PDF',
    });

    return c.json(
      {
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
          live_version: {
            id: version.id,
            version_number: version.versionNumber,
            source: version.source,
            files: version.files,
            defaults: version.defaults,
            low_code_spec: version.lowCodeSpec,
            commit_message: version.commitMessage,
            created_at: version.createdAt,
          },
          created_at: template.createdAt,
          updated_at: template.updatedAt,
        },
      },
      201
    );
  }
);

export default templates;
