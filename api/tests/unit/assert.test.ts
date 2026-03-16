import { describe, expect, test } from 'bun:test';
import { assertNever, assertPresent, invariant } from '../../src/lib/assert';
import { InternalError } from '../../src/lib/errors';

describe('api assertion helpers', () => {
  test('assertPresent returns value when present', () => {
    const value = assertPresent('ok', 'value should exist');
    expect(value).toBe('ok');
  });

  test('assertPresent throws typed InternalError when missing', () => {
    expect(() => assertPresent(undefined, 'missing value')).toThrow(InternalError);
  });

  test('invariant throws typed InternalError when condition is false', () => {
    expect(() => invariant(false, 'broken condition')).toThrow(InternalError);
  });

  test('assertNever throws typed InternalError', () => {
    expect(() => assertNever('bad' as never, 'unexpected branch')).toThrow(InternalError);
  });
});
