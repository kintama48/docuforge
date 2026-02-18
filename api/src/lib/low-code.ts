import { z } from 'zod';

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
const DYNAMIC_PATH_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*$/;
const MUSTACHE_FIELD_PATTERN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}/g;

const dynamicFieldSchema = z.string().regex(DYNAMIC_PATH_PATTERN, 'Invalid field path');

const headerBlockSchema = z.object({
  type: z.literal('header'),
  props: z.object({
    title: z.string().min(1).max(240),
    subtitle: z.string().max(500).optional(),
    align: z.enum(['left', 'center', 'right']).optional(),
  }),
});

const paragraphBlockSchema = z.object({
  type: z.literal('paragraph'),
  props: z.object({
    text: z.string().min(1).max(10000),
  }),
});

const dividerBlockSchema = z.object({
  type: z.literal('divider'),
  props: z.object({}).optional(),
});

const lineItemsTableBlockSchema = z.object({
  type: z.literal('line_items_table'),
  props: z.object({
    title: z.string().max(120).optional(),
    items_path: dynamicFieldSchema.optional().default('items'),
    columns: z
      .array(z.enum(['name', 'description', 'qty', 'price', 'total']))
      .min(1)
      .max(5)
      .optional(),
  }),
});

export const lowCodeBlockSchema = z.discriminatedUnion('type', [
  headerBlockSchema,
  paragraphBlockSchema,
  dividerBlockSchema,
  lineItemsTableBlockSchema,
]);

export const lowCodeSpecSchema = z.object({
  version: z.literal(1).default(1),
  meta: z
    .object({
      page: z.enum(['a4', 'letter']).optional().default('a4'),
      margin: z.string().max(32).optional().default('24pt'),
    })
    .optional(),
  theme: z
    .object({
      primary: z.string().regex(HEX_COLOR_PATTERN, 'Invalid hex color').optional(),
      text: z.string().regex(HEX_COLOR_PATTERN, 'Invalid hex color').optional(),
      muted: z.string().regex(HEX_COLOR_PATTERN, 'Invalid hex color').optional(),
      font: z.string().min(1).max(120).optional(),
    })
    .optional(),
  blocks: z.array(lowCodeBlockSchema).min(1).max(64),
});

export type LowCodeSpec = z.infer<typeof lowCodeSpecSchema>;

function quote(value: string): string {
  return JSON.stringify(value);
}

function parseDynamicPath(value: string): string | null {
  const match = value.trim().match(/^\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}$/);
  return match?.[1] ?? null;
}

function parseMustacheFieldPaths(value: string): string[] {
  const matches = value.matchAll(MUSTACHE_FIELD_PATTERN);
  const fields = new Set<string>();
  for (const match of matches) {
    if (match[1]) {
      fields.add(match[1]);
    }
  }
  return Array.from(fields);
}

function toTypstPath(path: string): string {
  return `data.${path}`;
}

function toTypstValue(value: string, fallback = ''): string {
  const dynamicPath = parseDynamicPath(value);
  if (!dynamicPath) {
    return quote(value);
  }
  return `${toTypstPath(dynamicPath)} ?? ${quote(fallback)}`;
}

function sanitizeColor(value: string | undefined, fallback: string): string {
  if (value && HEX_COLOR_PATTERN.test(value)) {
    return value;
  }
  return fallback;
}

function blockToTypst(block: LowCodeSpec['blocks'][number]): string {
  if (block.type === 'header') {
    const align = block.props.align ?? 'left';
    const title = toTypstValue(block.props.title, 'Untitled');
    const subtitle = block.props.subtitle ? toTypstValue(block.props.subtitle, '') : null;
    return [
      `#align(${align})[`,
      `  = #(${title})`,
      subtitle ? `  #text(fill: muted, size: 10pt)[#(${subtitle})]` : '',
      ']',
      '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (block.type === 'paragraph') {
    const text = toTypstValue(block.props.text, '');
    return `[#(${text})]\n`;
  }

  if (block.type === 'divider') {
    return '#line(length: 100%, stroke: 0.5pt + rgb("#d1d5db"))\n';
  }

  const columns = block.props.columns ?? ['name', 'qty', 'price', 'total'];
  const itemsPath = block.props.items_path || 'items';
  const titleLine = block.props.title
    ? `#text(weight: "semibold", fill: primary)[#(${toTypstValue(block.props.title, 'Items')})]\n`
    : '';
  const colLabels = columns.map((column) => `[${column.toUpperCase()}]`).join(', ');
  const cells = columns
    .map((column) => `          [#(item.${column} ?? "")]`)
    .join(',\n');

  return [
    titleLine.trimEnd(),
    `#let _items = ${toTypstPath(itemsPath)} ?? ()`,
    '#table(',
    `  columns: ${columns.length},`,
    '  inset: 8pt,',
    '  stroke: (x: none, y: 0.5pt + rgb("#d1d5db")),',
    `  ${colLabels},`,
    '  .._items.map(item => (',
    cells,
    '  )),',
    ')',
    '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function compileLowCodeSpec(input: LowCodeSpec): string {
  const spec = lowCodeSpecSchema.parse(input);
  const page = spec.meta?.page === 'letter' ? 'us-letter' : 'a4';
  const margin = spec.meta?.margin ?? '24pt';
  const primary = sanitizeColor(spec.theme?.primary, '#0D2659');
  const text = sanitizeColor(spec.theme?.text, '#111827');
  const muted = sanitizeColor(spec.theme?.muted, '#6B7280');
  const font = spec.theme?.font ?? 'Inter';
  const body = spec.blocks.map(blockToTypst).join('\n');

  return `#let data = sys.inputs
#set page(paper: "${page}", margin: ${margin})
#set text(font: ${quote(font)}, fill: rgb(${quote(text)}), size: 11pt)
#let primary = rgb(${quote(primary)})
#let muted = rgb(${quote(muted)})

${body}`.trim();
}

export function collectLowCodeFields(specInput: LowCodeSpec): string[] {
  const spec = lowCodeSpecSchema.parse(specInput);
  const fields = new Set<string>();

  for (const block of spec.blocks) {
    if (block.type === 'header') {
      parseMustacheFieldPaths(block.props.title).forEach((path) => fields.add(path));
      if (block.props.subtitle) {
        parseMustacheFieldPaths(block.props.subtitle).forEach((path) => fields.add(path));
      }
      continue;
    }

    if (block.type === 'paragraph') {
      parseMustacheFieldPaths(block.props.text).forEach((path) => fields.add(path));
      continue;
    }

    if (block.type === 'line_items_table') {
      const path = block.props.items_path || 'items';
      fields.add(path);
      const columns = block.props.columns ?? ['name', 'qty', 'price', 'total'];
      columns.forEach((column) => fields.add(`${path}[].${column}`));
    }
  }

  return Array.from(fields).sort();
}

export function inferLowCodeDefaults(specInput: LowCodeSpec): Record<string, unknown> {
  const paths = collectLowCodeFields(specInput);
  const output: Record<string, unknown> = {};

  for (const path of paths) {
    if (path.includes('[].')) {
      const [listName, child] = path.split('[].');
      if (!Array.isArray(output[listName])) {
        output[listName] = [{}];
      }
      const first = (output[listName] as Record<string, unknown>[])[0];
      first[child] = '';
      continue;
    }

    const segments = path.split('.');
    let cursor: Record<string, unknown> = output;
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index]!;
      if (index === segments.length - 1) {
        cursor[segment] = '';
        break;
      }
      if (!cursor[segment] || typeof cursor[segment] !== 'object' || Array.isArray(cursor[segment])) {
        cursor[segment] = {};
      }
      cursor = cursor[segment] as Record<string, unknown>;
    }
  }

  return output;
}
