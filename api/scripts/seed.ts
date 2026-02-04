import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { eq, isNull } from 'drizzle-orm';
import { getDb, schema } from '../src/db/client';
import { generateTemplateId, generateVersionId, generateUserId, generateApiKeyId } from '../src/lib/id';
import { generateRawApiKey, hashApiKey, extractKeyPrefix } from '../src/lib/api-key';
import { getPlanLimit } from '../src/config/env';
import { runMigrations } from '../src/db/migrate';

const TEMPLATES_DIR = join(import.meta.dir, '..', 'templates');

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
    .select({ name: schema.templates.name })
    .from(schema.templates)
    .where(isNull(schema.templates.userId));

  const existingNames = new Set(existingTemplates.map((t) => t.name));

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

    if (existingNames.has(config.name)) {
      console.log(`Skipping ${config.name}: already exists`);
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

    const templateId = generateTemplateId();
    const versionId = generateVersionId();

    // Create template (official = userId is null)
    await db.insert(schema.templates).values({
      id: templateId,
      userId: null,
      name: config.name,
      description: config.description,
      liveVersionId: versionId,
      isPublic: true,
      createdAt: now,
      updatedAt: now,
    });

    // Create version
    await db.insert(schema.templateVersions).values({
      id: versionId,
      templateId,
      versionNumber: 1,
      source,
      files: null,
      defaults,
      commitMessage: 'Initial official template',
      createdAt: now,
    });

    console.log(`✓ Seeded: ${config.name}`);
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
