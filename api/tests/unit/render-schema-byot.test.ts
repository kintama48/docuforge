/**
 * Unit tests for the BYOT (Bring Your Own Template) changes to renderSchema.
 * KAN-41: polymorphic body — exactly one of template_id XOR typst_string.
 */
import { describe, test, expect } from 'bun:test';
import { renderSchema } from '../../src/lib/validation';

describe('renderSchema (BYOT / KAN-41)', () => {
  // ---------------------------------------------------------------------------
  // Managed path — template_id present, no typst_string
  // ---------------------------------------------------------------------------
  describe('managed mode (template_id)', () => {
    test('valid managed request passes', () => {
      const result = renderSchema.safeParse({
        template_id: 'tpl_abc123',
        data: { name: 'Alice' },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.template_id).toBe('tpl_abc123');
        expect(result.data.typst_string).toBeUndefined();
        expect(result.data.password_protection_mode).toBe('none');
      }
    });

    test('managed request without data passes (defaults to {})', () => {
      const result = renderSchema.safeParse({ template_id: 'tpl_xyz' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data).toEqual({});
      }
    });

    test('managed request with client_blind mode passes', () => {
      const result = renderSchema.safeParse({
        template_id: 'tpl_abc',
        password_protection_mode: 'client_blind',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.password_protection_mode).toBe('client_blind');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // BYOT / raw injection path — typst_string present, no template_id
  // ---------------------------------------------------------------------------
  describe('BYOT mode (typst_string)', () => {
    test('valid BYOT request passes', () => {
      const result = renderSchema.safeParse({
        typst_string: '#set page(paper: "a4")\nHello',
        data: { greeting: 'world' },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.typst_string).toBe('#set page(paper: "a4")\nHello');
        expect(result.data.template_id).toBeUndefined();
        expect(result.data.password_protection_mode).toBe('none');
      }
    });

    test('BYOT request without data passes (defaults to {})', () => {
      const result = renderSchema.safeParse({
        typst_string: 'Hello, world!',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data).toEqual({});
      }
    });

    test('BYOT request with password_protection_mode passes', () => {
      const result = renderSchema.safeParse({
        typst_string: 'Hello',
        password_protection_mode: 'client_blind',
      });
      expect(result.success).toBe(true);
    });

    test('oversized typst_string (> 1 MB) is rejected with 400-ready error', () => {
      const oversized = 'x'.repeat(1_048_577); // 1 char over limit
      const result = renderSchema.safeParse({ typst_string: oversized });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages.some((m) => m.includes('1 MB') || m.includes('1,048,576'))).toBe(true);
      }
    });

    test('typst_string at exactly 1 MB passes', () => {
      const maxLen = 'x'.repeat(1_048_576); // exactly at limit
      const result = renderSchema.safeParse({ typst_string: maxLen });
      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // XOR enforcement
  // ---------------------------------------------------------------------------
  describe('XOR enforcement', () => {
    test('both template_id and typst_string → rejected', () => {
      const result = renderSchema.safeParse({
        template_id: 'tpl_abc123',
        typst_string: '#set page("a4")\nHi',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(
          messages.some(
            (m) => m.toLowerCase().includes('template_id') || m.toLowerCase().includes('exactly one')
          )
        ).toBe(true);
      }
    });

    test('neither template_id nor typst_string → rejected', () => {
      const result = renderSchema.safeParse({ data: { key: 'val' } });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(
          messages.some(
            (m) => m.toLowerCase().includes('template_id') || m.toLowerCase().includes('exactly one')
          )
        ).toBe(true);
      }
    });

    test('empty body → rejected', () => {
      const result = renderSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Regression: existing renderSchema tests still pass
  // ---------------------------------------------------------------------------
  describe('regression: prior managed-mode behaviour unchanged', () => {
    test('server_ephemeral_legacy password mode is still rejected', () => {
      const result = renderSchema.safeParse({
        template_id: 'tpl_abc',
        password_protection_mode: 'server_ephemeral_legacy',
      });
      expect(result.success).toBe(false);
    });

    test('empty template_id string is rejected (min-length guard)', () => {
      const result = renderSchema.safeParse({ template_id: '' });
      expect(result.success).toBe(false);
    });
  });
});
