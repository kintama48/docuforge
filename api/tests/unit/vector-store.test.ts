import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { cosineSimilarity, resetVectorStore } from '../../src/services/vector-store';

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const v = [1, 2, 3, 4, 5];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0);
  });

  it('returns 0 for orthogonal vectors', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0);
  });

  it('returns -1 for opposite vectors', () => {
    const a = [1, 2, 3];
    const b = [-1, -2, -3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0);
  });

  it('returns correct similarity for arbitrary vectors', () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    // cos(a,b) = (4+10+18) / (sqrt(14) * sqrt(77)) = 32 / sqrt(1078) ≈ 0.9746
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.9746, 3);
  });

  it('returns 0 when either vector is zero', () => {
    const zero = [0, 0, 0];
    const v = [1, 2, 3];
    expect(cosineSimilarity(zero, v)).toBe(0);
    expect(cosineSimilarity(v, zero)).toBe(0);
  });

  it('handles high-dimensional vectors (768-dim)', () => {
    const a = Array.from({ length: 768 }, (_, i) => Math.sin(i));
    const b = Array.from({ length: 768 }, (_, i) => Math.cos(i));
    const result = cosineSimilarity(a, b);
    expect(result).toBeGreaterThanOrEqual(-1);
    expect(result).toBeLessThanOrEqual(1);
  });
});

describe('vector-store state', () => {
  beforeEach(() => {
    resetVectorStore();
  });

  it('isInitialized returns false after reset', async () => {
    const { isInitialized } = await import('../../src/services/vector-store');
    expect(isInitialized()).toBe(false);
  });

  it('searchDocs returns empty when not initialized', async () => {
    const { searchDocs } = await import('../../src/services/vector-store');
    const results = await searchDocs('test query');
    expect(results).toEqual([]);
  });
});
