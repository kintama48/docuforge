import { describe, expect, it } from 'bun:test';
import { assertNever, assertPresent, invariant } from '../../src/lib/assert';

describe('mcp assertion helpers', () => {
  it('assertPresent returns the given value', () => {
    expect(assertPresent('ok', 'value required')).toBe('ok');
  });

  it('assertPresent throws on nullish input', () => {
    expect(() => assertPresent(undefined, 'missing')).toThrow('MCP assertion failed');
  });

  it('invariant throws on false', () => {
    expect(() => invariant(false, 'invalid state')).toThrow('MCP assertion failed');
  });

  it('assertNever throws for unexpected branch', () => {
    expect(() => assertNever('bad' as never, 'unexpected branch')).toThrow('MCP assertion failed');
  });
});
