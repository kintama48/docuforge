import { eq, and, sql, or, isNull } from 'drizzle-orm';
import { getDb, schema } from '../db/client';
import { generateTemplateId, generateVersionId } from '../lib/id';
import { ConflictError, NotFoundError, ForbiddenError } from '../lib/errors';
import type { TemplateSelect, TemplateVersionSelect } from '../db/schema';

export interface CreateTemplateParams {
  userId: string;
  name: string;
  description?: string;
  source: string;
  files?: Record<string, string>;
  defaults?: Record<string, unknown>;
  commitMessage?: string;
}

export interface PublishVersionParams {
  templateId: string;
  userId: string;
  source: string;
  files?: Record<string, string>;
  defaults?: Record<string, unknown>;
  commitMessage?: string;
}

export interface UpdateTemplateParams {
  templateId: string;
  userId: string;
  name?: string;
  description?: string | null;
}

export async function createTemplate(params: CreateTemplateParams): Promise<{
  template: TemplateSelect;
  version: TemplateVersionSelect;
}> {
  const db = getDb();
  const now = Date.now();

  // Check name uniqueness
  const [existing] = await db
    .select()
    .from(schema.templates)
    .where(and(eq(schema.templates.userId, params.userId), eq(schema.templates.name, params.name)));

  if (existing) {
    throw new ConflictError(`Template with name "${params.name}" already exists`);
  }

  const templateId = generateTemplateId();
  const versionId = generateVersionId();

  // Create template
  await db.insert(schema.templates).values({
    id: templateId,
    userId: params.userId,
    name: params.name,
    description: params.description || null,
    liveVersionId: versionId,
    isPublic: false,
    createdAt: now,
    updatedAt: now,
  });

  // Create initial version
  await db.insert(schema.templateVersions).values({
    id: versionId,
    templateId,
    versionNumber: 1,
    source: params.source,
    files: params.files || null,
    defaults: params.defaults || null,
    commitMessage: params.commitMessage || 'Initial version',
    createdAt: now,
  });

  const [template] = await db.select().from(schema.templates).where(eq(schema.templates.id, templateId));
  const [version] = await db.select().from(schema.templateVersions).where(eq(schema.templateVersions.id, versionId));

  return { template: template!, version: version! };
}

export async function publishVersion(params: PublishVersionParams): Promise<TemplateVersionSelect> {
  const db = getDb();
  const now = Date.now();

  // Verify ownership
  const [template] = await db.select().from(schema.templates).where(eq(schema.templates.id, params.templateId));

  if (!template) {
    throw new NotFoundError('Template not found');
  }

  if (template.userId !== params.userId) {
    throw new NotFoundError('Template not found'); // Return 404 to not reveal existence
  }

  // Get latest version number
  const [latest] = await db
    .select({ maxVersion: sql<number>`MAX(version_number)` })
    .from(schema.templateVersions)
    .where(eq(schema.templateVersions.templateId, params.templateId));

  const newVersionNumber = (latest?.maxVersion || 0) + 1;
  const versionId = generateVersionId();

  // Create new version
  await db.insert(schema.templateVersions).values({
    id: versionId,
    templateId: params.templateId,
    versionNumber: newVersionNumber,
    source: params.source,
    files: params.files || null,
    defaults: params.defaults || null,
    commitMessage: params.commitMessage || null,
    createdAt: now,
  });

  // Update template
  await db
    .update(schema.templates)
    .set({ liveVersionId: versionId, updatedAt: now })
    .where(eq(schema.templates.id, params.templateId));

  const [version] = await db.select().from(schema.templateVersions).where(eq(schema.templateVersions.id, versionId));

  return version!;
}

export async function forkTemplate(
  sourceTemplateId: string,
  userId: string,
  newName: string
): Promise<{ template: TemplateSelect; version: TemplateVersionSelect }> {
  const db = getDb();

  // Get source template
  const [sourceTemplate] = await db.select().from(schema.templates).where(eq(schema.templates.id, sourceTemplateId));

  if (!sourceTemplate) {
    throw new NotFoundError('Template not found');
  }

  // Template must be public or official (null userId)
  if (sourceTemplate.userId !== null && sourceTemplate.userId !== userId && !sourceTemplate.isPublic) {
    throw new ForbiddenError('Cannot fork this template');
  }

  // Get live version
  if (!sourceTemplate.liveVersionId) {
    throw new NotFoundError('Template has no published version');
  }

  const [sourceVersion] = await db
    .select()
    .from(schema.templateVersions)
    .where(eq(schema.templateVersions.id, sourceTemplate.liveVersionId));

  if (!sourceVersion) {
    throw new NotFoundError('Template version not found');
  }

  // Create forked template
  return createTemplate({
    userId,
    name: newName,
    description: sourceTemplate.description || undefined,
    source: sourceVersion.source,
    files: sourceVersion.files || undefined,
    defaults: sourceVersion.defaults || undefined,
    commitMessage: `Forked from ${sourceTemplate.name}`,
  });
}

export async function deleteTemplate(templateId: string, userId: string): Promise<void> {
  const db = getDb();

  const [template] = await db.select().from(schema.templates).where(eq(schema.templates.id, templateId));

  if (!template) {
    throw new NotFoundError('Template not found');
  }

  // Cannot delete official templates
  if (template.userId === null) {
    throw new ForbiddenError('Cannot delete official templates');
  }

  if (template.userId !== userId) {
    throw new ForbiddenError('Cannot delete this template');
  }

  // Delete (cascade will remove versions)
  await db.delete(schema.templates).where(eq(schema.templates.id, templateId));
}

export async function updateTemplate(
  params: UpdateTemplateParams
): Promise<TemplateSelect> {
  const db = getDb();
  const now = Date.now();

  const [template] = await db
    .select()
    .from(schema.templates)
    .where(eq(schema.templates.id, params.templateId));

  if (!template) {
    throw new NotFoundError('Template not found');
  }

  if (template.userId === null) {
    throw new ForbiddenError('Cannot update official templates');
  }

  if (template.userId !== params.userId) {
    throw new ForbiddenError('Cannot update this template');
  }

  if (params.name && params.name !== template.name) {
    const [existing] = await db
      .select()
      .from(schema.templates)
      .where(and(eq(schema.templates.userId, params.userId), eq(schema.templates.name, params.name)));
    if (existing) {
      throw new ConflictError(`Template with name "${params.name}" already exists`);
    }
  }

  const nextName = params.name ?? template.name;
  const nextDescription =
    params.description === undefined ? template.description : params.description;

  await db
    .update(schema.templates)
    .set({ name: nextName, description: nextDescription, updatedAt: now })
    .where(eq(schema.templates.id, params.templateId));

  const [updated] = await db
    .select()
    .from(schema.templates)
    .where(eq(schema.templates.id, params.templateId));

  return updated!;
}

export async function listTemplates(
  userId: string,
  options: { page: number; limit: number; includeOfficial: boolean }
): Promise<{ templates: TemplateSelect[]; total: number }> {
  const db = getDb();
  const offset = (options.page - 1) * options.limit;

  // Build where clause
  const whereClause = options.includeOfficial
    ? or(eq(schema.templates.userId, userId), isNull(schema.templates.userId))
    : eq(schema.templates.userId, userId);

  const templates = await db
    .select()
    .from(schema.templates)
    .where(whereClause)
    .limit(options.limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(schema.templates)
    .where(whereClause);

  return {
    templates,
    total: countResult?.count || 0,
  };
}

export async function getTemplate(
  templateId: string,
  userId: string
): Promise<{ template: TemplateSelect; versions: TemplateVersionSelect[] }> {
  const db = getDb();

  const [template] = await db.select().from(schema.templates).where(eq(schema.templates.id, templateId));

  if (!template) {
    throw new NotFoundError('Template not found');
  }

  // Check access
  if (template.userId !== null && template.userId !== userId && !template.isPublic) {
    throw new NotFoundError('Template not found');
  }

  const versions = await db
    .select()
    .from(schema.templateVersions)
    .where(eq(schema.templateVersions.templateId, templateId))
    .orderBy(sql`version_number DESC`);

  return { template, versions };
}

export async function getTemplateVersion(
  templateId: string,
  versionId: string,
  userId: string
): Promise<TemplateVersionSelect> {
  const db = getDb();

  const [template] = await db.select().from(schema.templates).where(eq(schema.templates.id, templateId));

  if (!template) {
    throw new NotFoundError('Template not found');
  }

  if (template.userId !== null && template.userId !== userId && !template.isPublic) {
    throw new NotFoundError('Template not found');
  }

  const [version] = await db
    .select()
    .from(schema.templateVersions)
    .where(and(eq(schema.templateVersions.id, versionId), eq(schema.templateVersions.templateId, templateId)));

  if (!version) {
    throw new NotFoundError('Template version not found');
  }

  return version;
}
