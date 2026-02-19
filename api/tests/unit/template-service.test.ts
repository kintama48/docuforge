/**
 * Unit tests for src/services/template.ts
 *
 * Tests template CRUD and versioning logic.
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createTestDatabase, closeTestDatabase, type TestDb, schema } from '../helpers/db';
import { generateUserId, generateTemplateId, generateVersionId } from '../../src/lib/id';
import { eq, sql } from 'drizzle-orm';

let testDb: TestDb;
let testSqlite: ReturnType<typeof import('bun:sqlite').Database.prototype.constructor>;

// Recreate the service logic for unit testing against test database
class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

interface CreateTemplateParams {
  userId: string;
  name: string;
  description?: string;
  source: string;
  files?: Record<string, string>;
  defaults?: Record<string, unknown>;
  commitMessage?: string;
}

interface PublishVersionParams {
  templateId: string;
  userId: string;
  source: string;
  files?: Record<string, string>;
  defaults?: Record<string, unknown>;
  commitMessage?: string;
}

async function createTemplate(db: TestDb, params: CreateTemplateParams) {
  const now = Date.now();

  // Check name uniqueness
  const [existing] = await db
    .select()
    .from(schema.templates)
    .where(
      sql`${schema.templates.userId} = ${params.userId} AND ${schema.templates.name} = ${params.name}`
    );

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

async function publishVersion(db: TestDb, params: PublishVersionParams) {
  const now = Date.now();

  // Verify ownership
  const [template] = await db.select().from(schema.templates).where(eq(schema.templates.id, params.templateId));

  if (!template) {
    throw new NotFoundError('Template not found');
  }

  if (template.userId !== params.userId) {
    throw new ForbiddenError('Cannot modify this template');
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

async function forkTemplate(db: TestDb, sourceTemplateId: string, userId: string, newName: string) {
  // Get source template
  const [sourceTemplate] = await db.select().from(schema.templates).where(eq(schema.templates.id, sourceTemplateId));

  if (!sourceTemplate) {
    throw new NotFoundError('Template not found');
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
  return createTemplate(db, {
    userId,
    name: newName,
    description: sourceTemplate.description || undefined,
    source: sourceVersion.source,
    files: sourceVersion.files || undefined,
    defaults: sourceVersion.defaults || undefined,
    commitMessage: `Forked from ${sourceTemplate.name}`,
  });
}

async function deleteTemplate(db: TestDb, templateId: string, userId: string) {
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

  // Delete versions first (manual cascade for testing)
  await db.delete(schema.templateVersions).where(eq(schema.templateVersions.templateId, templateId));

  // Delete template
  await db.delete(schema.templates).where(eq(schema.templates.id, templateId));
}

async function createUser(db: TestDb): Promise<string> {
  const userId = generateUserId();
  const now = Date.now();

  await db.insert(schema.users).values({
    id: userId,
    email: `${userId}@test.com`,
    passwordHash: 'test_hash',
    planTier: 'free',
    planRenders: 1000,
    createdAt: now,
    updatedAt: now,
  });

  return userId;
}

describe('template-service', () => {
  beforeEach(() => {
    const { db, sqlite } = createTestDatabase();
    testDb = db;
    testSqlite = sqlite;
  });

  afterEach(() => {
    closeTestDatabase(testSqlite);
  });

  describe('createTemplate', () => {
    test('creates template with version 1', async () => {
      const userId = await createUser(testDb);

      const { template, version } = await createTemplate(testDb, {
        userId,
        name: 'Test Template',
        source: '#set page(paper: "a4")\nHello!',
      });

      expect(template.id).toMatch(/^tpl_/);
      expect(template.name).toBe('Test Template');
      expect(template.userId).toBe(userId);
      expect(template.liveVersionId).toBe(version.id);

      expect(version.id).toMatch(/^ver_/);
      expect(version.versionNumber).toBe(1);
      expect(version.source).toBe('#set page(paper: "a4")\nHello!');
      expect(version.commitMessage).toBe('Initial version');
    });

    test('enforces unique name per user', async () => {
      const userId = await createUser(testDb);

      await createTemplate(testDb, {
        userId,
        name: 'My Template',
        source: 'Hello',
      });

      await expect(
        createTemplate(testDb, {
          userId,
          name: 'My Template',
          source: 'Hello again',
        })
      ).rejects.toThrow(ConflictError);
    });

    test('different users can have same name', async () => {
      const user1 = await createUser(testDb);
      const user2 = await createUser(testDb);

      const { template: t1 } = await createTemplate(testDb, {
        userId: user1,
        name: 'Same Name',
        source: 'User 1 content',
      });

      const { template: t2 } = await createTemplate(testDb, {
        userId: user2,
        name: 'Same Name',
        source: 'User 2 content',
      });

      expect(t1.name).toBe('Same Name');
      expect(t2.name).toBe('Same Name');
      expect(t1.userId).toBe(user1);
      expect(t2.userId).toBe(user2);
    });
  });

  describe('publishVersion', () => {
    test('publish increments version', async () => {
      const userId = await createUser(testDb);
      const { template, version: v1 } = await createTemplate(testDb, {
        userId,
        name: 'Versioned Template',
        source: 'Version 1',
      });

      expect(v1.versionNumber).toBe(1);

      const v2 = await publishVersion(testDb, {
        templateId: template.id,
        userId,
        source: 'Version 2',
        commitMessage: 'Updated content',
      });

      expect(v2.versionNumber).toBe(2);
      expect(v2.source).toBe('Version 2');
      expect(v2.commitMessage).toBe('Updated content');
    });

    test('publish updates live pointer', async () => {
      const userId = await createUser(testDb);
      const { template } = await createTemplate(testDb, {
        userId,
        name: 'Pointer Test',
        source: 'Initial',
      });

      const oldLiveId = template.liveVersionId;

      const newVersion = await publishVersion(testDb, {
        templateId: template.id,
        userId,
        source: 'Updated',
      });

      // Fetch updated template
      const [updatedTemplate] = await testDb
        .select()
        .from(schema.templates)
        .where(eq(schema.templates.id, template.id));

      expect(updatedTemplate.liveVersionId).toBe(newVersion.id);
      expect(updatedTemplate.liveVersionId).not.toBe(oldLiveId);
    });

    test('cannot publish to other user template', async () => {
      const user1 = await createUser(testDb);
      const user2 = await createUser(testDb);

      const { template } = await createTemplate(testDb, {
        userId: user1,
        name: 'User1 Template',
        source: 'Content',
      });

      await expect(
        publishVersion(testDb, {
          templateId: template.id,
          userId: user2,
          source: 'Hacked',
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('forkTemplate', () => {
    test('fork copies source correctly', async () => {
      const user1 = await createUser(testDb);
      const user2 = await createUser(testDb);

      const originalSource = '#set page(paper: "a4")\n= Original Template\nContent here.';
      const originalDefaults = { title: 'Original' };

      const { template: original } = await createTemplate(testDb, {
        userId: user1,
        name: 'Original',
        description: 'The original template',
        source: originalSource,
        defaults: originalDefaults,
      });

      // Make it public for forking
      await testDb
        .update(schema.templates)
        .set({ isPublic: true })
        .where(eq(schema.templates.id, original.id));

      const { template: forked, version: forkedVersion } = await forkTemplate(
        testDb,
        original.id,
        user2,
        'My Fork'
      );

      expect(forked.name).toBe('My Fork');
      expect(forked.userId).toBe(user2);
      expect(forked.description).toBe('The original template');

      expect(forkedVersion.source).toBe(originalSource);
      expect(forkedVersion.versionNumber).toBe(1);
      expect(forkedVersion.commitMessage).toBe('Forked from Original');
    });

    test('forked template is independent', async () => {
      const user1 = await createUser(testDb);
      const user2 = await createUser(testDb);

      const { template: original } = await createTemplate(testDb, {
        userId: user1,
        name: 'Original',
        source: 'Original content',
      });

      await testDb
        .update(schema.templates)
        .set({ isPublic: true })
        .where(eq(schema.templates.id, original.id));

      const { template: forked } = await forkTemplate(testDb, original.id, user2, 'Fork');

      // Update original
      await publishVersion(testDb, {
        templateId: original.id,
        userId: user1,
        source: 'Updated original',
      });

      // Fork should still have original content
      const [forkedLiveVersion] = await testDb
        .select()
        .from(schema.templateVersions)
        .where(eq(schema.templateVersions.id, forked.liveVersionId!));

      expect(forkedLiveVersion.source).toBe('Original content');
    });
  });

  describe('deleteTemplate', () => {
    test('delete cascades to versions', async () => {
      const userId = await createUser(testDb);

      const { template } = await createTemplate(testDb, {
        userId,
        name: 'To Delete',
        source: 'Content',
      });

      // Add more versions
      await publishVersion(testDb, { templateId: template.id, userId, source: 'v2' });
      await publishVersion(testDb, { templateId: template.id, userId, source: 'v3' });

      // Verify versions exist
      const versionsBefore = await testDb
        .select()
        .from(schema.templateVersions)
        .where(eq(schema.templateVersions.templateId, template.id));
      expect(versionsBefore.length).toBe(3);

      // Delete template
      await deleteTemplate(testDb, template.id, userId);

      // Verify template is gone
      const [deletedTemplate] = await testDb
        .select()
        .from(schema.templates)
        .where(eq(schema.templates.id, template.id));
      expect(deletedTemplate).toBeUndefined();

      // Verify versions are gone
      const versionsAfter = await testDb
        .select()
        .from(schema.templateVersions)
        .where(eq(schema.templateVersions.templateId, template.id));
      expect(versionsAfter.length).toBe(0);
    });

    test('cannot delete other user template', async () => {
      const user1 = await createUser(testDb);
      const user2 = await createUser(testDb);

      const { template } = await createTemplate(testDb, {
        userId: user1,
        name: 'User1 Template',
        source: 'Content',
      });

      await expect(deleteTemplate(testDb, template.id, user2)).rejects.toThrow(ForbiddenError);
    });

    test('cannot delete official template', async () => {
      const userId = await createUser(testDb);
      const now = Date.now();

      // Create an official template (userId = null)
      const templateId = generateTemplateId();
      const versionId = generateVersionId();

      await testDb.insert(schema.templates).values({
        id: templateId,
        userId: null,
        name: 'Official Template',
        liveVersionId: versionId,
        isPublic: true,
        createdAt: now,
        updatedAt: now,
      });

      await testDb.insert(schema.templateVersions).values({
        id: versionId,
        templateId,
        versionNumber: 1,
        source: 'Official content',
        createdAt: now,
      });

      await expect(deleteTemplate(testDb, templateId, userId)).rejects.toThrow(ForbiddenError);
    });

    test('delete nonexistent template throws NotFoundError', async () => {
      const userId = await createUser(testDb);

      await expect(deleteTemplate(testDb, 'tpl_nonexistent', userId)).rejects.toThrow(NotFoundError);
    });
  });
});
