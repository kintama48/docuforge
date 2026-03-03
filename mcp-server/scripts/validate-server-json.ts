import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

async function main() {
  const metadataPath = resolve(import.meta.dir, '..', 'server.json');
  const raw = await readFile(metadataPath, 'utf8');
  const metadata = JSON.parse(raw) as Record<string, unknown>;

  const schemaUrl = String(metadata.$schema || '');
  if (!schemaUrl) {
    throw new Error('server.json is missing $schema');
  }

  const schemaResponse = await fetch(schemaUrl, {
    signal: AbortSignal.timeout(10_000),
  });

  if (!schemaResponse.ok) {
    throw new Error(`Unable to fetch schema ${schemaUrl} (${schemaResponse.status})`);
  }

  const schema = await schemaResponse.json();
  const ajv = new Ajv({
    allErrors: true,
    strict: false,
  });
  addFormats(ajv);

  const validate = ajv.compile(schema);
  const ok = validate(metadata);

  if (!ok) {
    console.error('server.json failed schema validation:');
    for (const issue of validate.errors || []) {
      console.error(`- ${issue.instancePath || '/'}: ${issue.message || 'invalid'}`);
    }
    process.exit(1);
  }

  console.log('server.json schema validation passed');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
