import { describe, expect, test } from 'bun:test';
import { ValidationError } from '../../src/lib/errors';
import { buildRenderJobId } from '../../src/services/render-queue';

describe('render queue utilities', () => {
  test('buildRenderJobId is deterministic for same user/idempotency pair', () => {
    const first = buildRenderJobId('usr_123', 'idem-abc');
    const second = buildRenderJobId('usr_123', 'idem-abc');

    expect(first).toBe(second);
    expect(first.startsWith('rjq_')).toBe(true);
  });

  test('buildRenderJobId changes when idempotency key changes', () => {
    const first = buildRenderJobId('usr_123', 'idem-a');
    const second = buildRenderJobId('usr_123', 'idem-b');

    expect(first).not.toBe(second);
  });

  test('buildRenderJobId rejects empty userId', () => {
    expect(() => buildRenderJobId('   ', 'idem-key')).toThrow(ValidationError);
  });

  test('buildRenderJobId rejects empty idempotency key', () => {
    expect(() => buildRenderJobId('usr_123', '  ')).toThrow(ValidationError);
  });
});
