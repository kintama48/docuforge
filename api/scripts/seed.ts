import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { eq, isNull } from 'drizzle-orm';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getDb, schema } from '../src/db/client';
import { generateTemplateId, generateVersionId, generateUserId, generateApiKeyId } from '../src/lib/id';
import { generateRawApiKey, hashApiKey, extractKeyPrefix } from '../src/lib/api-key';
import { getPlanLimit, env } from '../src/config/env';
import { runMigrations } from '../src/db/migrate';

const TEMPLATES_DIR = join(import.meta.dir, '..', 'templates');
const FRONTEND_PUBLIC_PREVIEWS = join(import.meta.dir, '..', '..', 'frontend', 'public', 'template-previews');

async function generatePreview(
  templateId: string,
  source: string,
  files: Record<string, string> | null,
  defaults: Record<string, unknown> | null
): Promise<string | null> {
  try {
    const engineUrl = env.ENGINE_URL;
    const body = {
      template: { main: source, files: files ?? {} },
      data: defaults ?? {},
      options: { output: 'images', image_format: 'png', image_dpi: 144, image_pages: [1] },
    };

    const res = await fetch(`${engineUrl}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      console.warn(`  Preview render failed for ${templateId}: ${res.status}`);
      return null;
    }

    const json = (await res.json()) as { pages?: Array<{ data?: string }> };
    const pageData = json.pages?.[0]?.data;
    if (!pageData) return null;

    const pngBuffer = Buffer.from(pageData, 'base64');

    // Try R2 first
    try {
      const s3 = new S3Client({
        region: 'auto',
        endpoint: env.R2_ENDPOINT,
        credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
      });
      const r2Key = `template-previews/${templateId}.png`;
      await s3.send(new PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: r2Key,
        Body: pngBuffer,
        ContentType: 'image/png',
      }));
      return `${env.R2_PUBLIC_URL}/${r2Key}`;
    } catch (r2Err) {
      // Fallback: write to frontend/public/template-previews/
      console.warn(`  R2 upload failed, falling back to local: ${r2Err instanceof Error ? r2Err.message : r2Err}`);
      mkdirSync(FRONTEND_PUBLIC_PREVIEWS, { recursive: true });
      writeFileSync(join(FRONTEND_PUBLIC_PREVIEWS, `${templateId}.png`), pngBuffer);
      return `/template-previews/${templateId}.png`;
    }
  } catch (err) {
    console.warn(`  Preview generation failed for ${templateId}: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

interface TemplateConfig {
  name: string;
  description: string;
}

const TEMPLATE_CONFIGS: Record<string, TemplateConfig> = {
  invoice: {
    name: 'Standard Invoice',
    description: 'Professional A4 invoice template with itemized billing, tax calculations, and company branding.',
  },
  receipt: {
    name: 'Thermal Receipt',
    description: 'Compact 80mm receipt template for point-of-sale systems with itemized totals.',
  },
  'shipping-label': {
    name: 'Shipping Label',
    description: '4×6 inch shipping label with tracking barcode, addresses, and package details.',
  },
  report: {
    name: 'Business Report',
    description: 'Multi-page A4 report template with table of contents, sections, and professional formatting.',
  },
  certificate: {
    name: 'Certificate of Achievement',
    description: 'Elegant A4 landscape certificate with decorative borders and official seal.',
  },
};

async function seedTemplates() {
  console.log('Running migrations...');
  await runMigrations();

  const db = getDb();
  const now = Date.now();

  // Get existing official templates
  const existingTemplates = await db
    .select({ id: schema.templates.id, name: schema.templates.name, previewUrl: schema.templates.previewUrl })
    .from(schema.templates)
    .where(isNull(schema.templates.userId));

  const existingNames = new Set(existingTemplates.map((t) => t.name));
  const existingByName = new Map(existingTemplates.map((t) => [t.name, t]));

  // Read template directories
  const templateDirs = readdirSync(TEMPLATES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  console.log(`Found ${templateDirs.length} templates to seed...`);

  for (const templateDir of templateDirs) {
    const config = TEMPLATE_CONFIGS[templateDir];
    if (!config) {
      console.log(`Skipping ${templateDir}: no config defined`);
      continue;
    }

    const mainPath = join(TEMPLATES_DIR, templateDir, 'main.typ');
    const defaultsPath = join(TEMPLATES_DIR, templateDir, 'defaults.json');

    if (!existsSync(mainPath)) {
      console.log(`Skipping ${templateDir}: main.typ not found`);
      continue;
    }

    const source = readFileSync(mainPath, 'utf-8');
    let defaults: Record<string, unknown> | null = null;

    if (existsSync(defaultsPath)) {
      defaults = JSON.parse(readFileSync(defaultsPath, 'utf-8'));
    }

    // Bundle the shared design module + any sibling .typ files so templates can
    // `#import "design.typ": *`. The engine receives all files in one map.
    const filesMap: Record<string, string> = {};
    const sharedDesignPath = join(TEMPLATES_DIR, '_shared', 'design.typ');
    if (existsSync(sharedDesignPath)) {
      filesMap['design.typ'] = readFileSync(sharedDesignPath, 'utf-8');
    }
    for (const entry of readdirSync(join(TEMPLATES_DIR, templateDir))) {
      if (entry.endsWith('.typ') && entry !== 'main.typ') {
        filesMap[entry] = readFileSync(join(TEMPLATES_DIR, templateDir, entry), 'utf-8');
      }
    }

    // Backfill preview for existing templates that don't have one
    if (existingNames.has(config.name)) {
      const existing = existingByName.get(config.name)!;
      if (!existing.previewUrl) {
        console.log(`Backfilling preview for ${config.name}...`);
        const filesForPreview = Object.keys(filesMap).length > 0 ? filesMap : null;
        const preview = await generatePreview(existing.id, source, filesForPreview, defaults);
        if (preview) {
          await db.update(schema.templates).set({ previewUrl: preview }).where(eq(schema.templates.id, existing.id));
          console.log(`  Preview updated: ${preview}`);
        }
      } else {
        console.log(`Skipping ${config.name}: already exists with preview`);
      }
      continue;
    }

    const templateId = generateTemplateId();
    const versionId = generateVersionId();

    const previewUrl = await generatePreview(templateId, source, Object.keys(filesMap).length > 0 ? filesMap : null, defaults);

    // Create template (official = userId is null)
    await db.insert(schema.templates).values({
      id: templateId,
      userId: null,
      name: config.name,
      description: config.description,
      liveVersionId: versionId,
      isPublic: true,
      previewUrl,
      createdAt: now,
      updatedAt: now,
    });

    // Create version
    await db.insert(schema.templateVersions).values({
      id: versionId,
      templateId,
      versionNumber: 1,
      source,
      files: Object.keys(filesMap).length > 0 ? filesMap : null,
      defaults,
      commitMessage: 'Initial official template',
      createdAt: now,
    });

    console.log(`✓ Seeded: ${config.name}${previewUrl ? ' (preview: ' + previewUrl + ')' : ' (no preview)'}`);
  }

  console.log('Seeding complete!');
}

async function seedTestUser() {
  const db = getDb();
  const now = Date.now();
  const email = 'abdullah.baig416@gmail.com';
  const password = '123123123';

  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (existing) {
    console.log(`✓ Test user already exists: ${email}`);
    return;
  }

  const passwordHash = await Bun.password.hash(password);
  const userId = generateUserId();

  await db.insert(schema.users).values({
    id: userId,
    email,
    emailCanonical: email.toLowerCase().trim(),
    passwordHash,
    planTier: 'free',
    planRenders: getPlanLimit('free'),
    createdAt: now,
    updatedAt: now,
  });

  const rawKey = generateRawApiKey();
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = extractKeyPrefix(rawKey);
  const keyId = generateApiKeyId();

  await db.insert(schema.apiKeys).values({
    id: keyId,
    userId,
    keyHash,
    keyPrefix,
    name: 'Default',
    createdAt: now,
    isRevoked: false,
  });

  console.log(`✓ Seeded test user: ${email}`);
  console.log(`✓ Test API key prefix: ${keyPrefix}`);
}

seedTemplates()
  .then(seedTestUser)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
