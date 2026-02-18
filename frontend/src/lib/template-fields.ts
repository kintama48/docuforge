const DATA_AT_PATTERN = /data\.at\(\s*["'`]([^"'`]+)["'`]/g;
const DATA_PATH_PATTERN = /data\.([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g;
const MUSTACHE_PATTERN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_.[\]]*)\s*\}\}/g;

const RESERVED_DATA_MEMBERS = new Set(["at", "len", "keys", "values"]);

export function extractDynamicFieldPathsFromSource(source: string): string[] {
  const fields = new Set<string>();

  for (const match of source.matchAll(DATA_AT_PATTERN)) {
    const path = match[1]?.trim();
    if (path) fields.add(path);
  }

  for (const match of source.matchAll(DATA_PATH_PATTERN)) {
    const path = match[1]?.trim();
    if (!path) continue;
    const first = path.split(".")[0];
    if (!first || RESERVED_DATA_MEMBERS.has(first)) continue;
    fields.add(path);
  }

  for (const match of source.matchAll(MUSTACHE_PATTERN)) {
    const path = match[1]?.trim();
    if (path) fields.add(path);
  }

  return Array.from(fields).sort();
}

export function buildSampleDataFromPaths(paths: string[]): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const rawPath of paths) {
    const path = rawPath.trim();
    if (!path) continue;

    const segments = path.split(".");
    let cursor: Record<string, unknown> = output;

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index]!;
      const isArraySegment = segment.endsWith("[]");
      const key = isArraySegment ? segment.slice(0, -2) : segment;
      const isLast = index === segments.length - 1;

      if (isArraySegment) {
        if (!Array.isArray(cursor[key])) {
          cursor[key] = [{}];
        }
        const first = (cursor[key] as Record<string, unknown>[])[0]!;
        if (isLast) {
          if (Object.keys(first).length === 0) {
            cursor[key] = [""];
          }
          break;
        }
        cursor = first;
        continue;
      }

      if (isLast) {
        if (cursor[key] === undefined) {
          cursor[key] = "";
        }
        break;
      }

      if (!cursor[key] || typeof cursor[key] !== "object" || Array.isArray(cursor[key])) {
        cursor[key] = {};
      }
      cursor = cursor[key] as Record<string, unknown>;
    }
  }

  return output;
}
