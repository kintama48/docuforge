import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { getDb, schema } from '../src/db/client';
import { generateTemplateId, generateVersionId } from '../src/lib/id';
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
    .where(({ isNull }, { userId }) => isNull(userId));

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

seedTemplates()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
