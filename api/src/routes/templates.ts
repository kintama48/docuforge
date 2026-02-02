import { Hono } from 'hono';

import { eq } from 'drizzle-orm';
import { getDb, schema } from '../db/client';
import { jwtAuth } from '../middleware/auth';
import {
  zValidator,
  createTemplateSchema,
  publishVersionSchema,
  forkTemplateSchema,
  listTemplatesQuerySchema,
} from '../lib/validation';
import {
  createTemplate,
  publishVersion,
  forkTemplate,
  deleteTemplate,
  listTemplates,
  getTemplate,
} from '../services/template';

const templates = new Hono();

// GET /v1/templates - List templates
templates.get('/', jwtAuth, zValidator('query', listTemplatesQuerySchema), async (c) => {
  const query = c.req.valid('query');
  const { userId } = c.get('auth');

  const result = await listTemplates(userId, {
    page: query.page,
    limit: query.limit,
    includeOfficial: query.include_official,
  });

  const db = getDb();

  // Fetch live versions for each template
  const templatesWithVersions = await Promise.all(
    result.templates.map(async (template) => {
      let liveVersion = null;
      if (template.liveVersionId) {
        const [version] = await db
          .select()
          .from(schema.templateVersions)
          .where(eq(schema.templateVersions.id, template.liveVersionId));
        if (version) {
          liveVersion = {
            id: version.id,
            version_number: version.versionNumber,
            commit_message: version.commitMessage,
            created_at: version.createdAt,
          };
        }
      }

      return {
        id: template.id,
        name: template.name,
        description: template.description,
        is_official: template.userId === null,
        live_version: liveVersion,
        created_at: template.createdAt,
        updated_at: template.updatedAt,
      };
    })
  );

  return c.json({
    templates: templatesWithVersions,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
    },
  });
});

// GET /v1/templates/:id - Get template with versions
templates.get('/:id', jwtAuth, async (c) => {
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
templates.post('/', jwtAuth, zValidator('json', createTemplateSchema), async (c) => {
  const data = c.req.valid('json');
  const { userId } = c.get('auth');

  const { template, version } = await createTemplate({
    userId,
    name: data.name,
    description: data.description,
    source: data.source,
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
templates.post('/:id/publish', jwtAuth, zValidator('json', publishVersionSchema), async (c) => {
  const templateId = c.req.param('id');
  const data = c.req.valid('json');
  const { userId } = c.get('auth');

  const version = await publishVersion({
    templateId,
    userId,
    source: data.source,
    files: data.files,
    defaults: data.defaults,
    commitMessage: data.commit_message,
  });

  return c.json({
    version: {
      id: version.id,
      version_number: version.versionNumber,
      commit_message: version.commitMessage,
      created_at: version.createdAt,
    },
  });
});

// POST /v1/templates/:id/fork - Fork template
templates.post('/:id/fork', jwtAuth, zValidator('json', forkTemplateSchema), async (c) => {
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
templates.delete('/:id', jwtAuth, async (c) => {
  const templateId = c.req.param('id');
  const { userId } = c.get('auth');

  await deleteTemplate(templateId, userId);

  return c.json({ message: 'Template deleted' });
});

export default templates;
