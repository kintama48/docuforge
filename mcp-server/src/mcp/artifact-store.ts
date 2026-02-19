import { randomUUID } from 'node:crypto';

export interface StoredArtifact {
  id: string;
  uri: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  createdAt: number;
  expiresAt: number;
}

export class ArtifactStore {
  private readonly ttlMs: number;
  private readonly artifacts = new Map<string, StoredArtifact>();

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  put(pdf: Uint8Array, fileName: string): StoredArtifact {
    const id = randomUUID();
    const now = Date.now();
    const artifact: StoredArtifact = {
      id,
      uri: `docuforge://renders/${id}.pdf`,
      fileName,
      mimeType: 'application/pdf',
      bytes: pdf,
      createdAt: now,
      expiresAt: now + this.ttlMs,
    };

    this.artifacts.set(id, artifact);
    return artifact;
  }

  get(id: string): StoredArtifact | null {
    const artifact = this.artifacts.get(id);
    if (!artifact) {
      return null;
    }

    if (artifact.expiresAt <= Date.now()) {
      this.artifacts.delete(id);
      return null;
    }

    return artifact;
  }

  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [id, artifact] of this.artifacts.entries()) {
      if (artifact.expiresAt <= now) {
        this.artifacts.delete(id);
        removed += 1;
      }
    }

    return removed;
  }

  size(): number {
    return this.artifacts.size;
  }
}
