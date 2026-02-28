import { describe, expect, test } from 'bun:test';
import {
  collectLowCodeFields,
  compileLowCodeSpec,
  inferLowCodeDefaults,
  lowCodeSpecSchema,
} from '../../src/lib/low-code';

describe('low-code module', () => {
  test('compiles a simple spec into deterministic Typst', () => {
    const spec = {
      version: 1 as const,
      meta: { page: 'a4' as const, margin: '20pt' },
      theme: { primary: '#1F4B99', text: '#111827', muted: '#6B7280', font: 'Inter' },
      blocks: [
        {
          type: 'header' as const,
          props: { title: '{{invoice.title}}', subtitle: 'Prepared for {{customer.name}}' },
        },
        {
          type: 'line_items_table' as const,
          props: { items_path: 'items', columns: ['name', 'qty', 'price', 'total'] as const },
        },
      ],
    };

    const compiled = compileLowCodeSpec(spec);
    expect(compiled).toContain('#let data = sys.inputs');
    expect(compiled).toContain('#set page(paper: "a4", margin: 20pt)');
    expect(compiled).toContain('data.at("invoice", default: (:)).at("title", default: "Untitled")');
    expect(compiled).not.toContain('??');
    expect(compiled).toContain(')).flatten(),');
    expect(compiled).toContain('#table(');
  });

  test('collects dynamic field paths from placeholders and table blocks', () => {
    const spec = lowCodeSpecSchema.parse({
      version: 1,
      blocks: [
        {
          type: 'header',
          props: { title: '{{invoice.title}}', subtitle: 'To {{customer.name}}' },
        },
        {
          type: 'paragraph',
          props: { text: '{{invoice.notes}}' },
        },
        {
          type: 'line_items_table',
          props: { items_path: 'items', columns: ['name', 'qty', 'total'] },
        },
      ],
    });

    expect(collectLowCodeFields(spec)).toEqual([
      'customer.name',
      'invoice.notes',
      'invoice.title',
      'items',
      'items[].name',
      'items[].qty',
      'items[].total',
    ]);
  });

  test('infers nested defaults from collected fields', () => {
    const spec = {
      version: 1 as const,
      blocks: [
        {
          type: 'header' as const,
          props: { title: '{{invoice.title}}' },
        },
        {
          type: 'line_items_table' as const,
          props: { items_path: 'items', columns: ['name', 'price'] as const },
        },
      ],
    };

    expect(inferLowCodeDefaults(spec)).toEqual({
      invoice: { title: '' },
      items: [{ name: '', price: '' }],
    });
  });
});
