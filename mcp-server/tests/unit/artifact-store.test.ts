import { describe, expect, it } from 'bun:test';
import { ArtifactStore } from '../../src/mcp/artifact-store';

describe('ArtifactStore', () => {
  it('stores and retrieves artifacts', () => {
    const store = new ArtifactStore(5_000);
    const artifact = store.put(new Uint8Array([1, 2, 3]), 'sample.pdf');

    const found = store.get(artifact.id);

    expect(found).not.toBeNull();
    expect(found?.uri).toBe(artifact.uri);
    expect(found?.fileName).toBe('sample.pdf');
    expect(found?.bytes.byteLength).toBe(3);
  });

  it('expires old artifacts', async () => {
    const store = new ArtifactStore(25);
    const artifact = store.put(new Uint8Array([1]), 'short.pdf');

    await Bun.sleep(30);

    const found = store.get(artifact.id);
    expect(found).toBeNull();
  });

  it('cleanup removes expired entries', async () => {
    const store = new ArtifactStore(25);
    store.put(new Uint8Array([1]), 'one.pdf');
    store.put(new Uint8Array([2]), 'two.pdf');

    await Bun.sleep(30);

    const removed = store.cleanup();
    expect(removed).toBe(2);
    expect(store.size()).toBe(0);
  });
});
