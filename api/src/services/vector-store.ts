import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { loadAndChunkDocs, type RawChunk } from './typst-docs';
import { env } from '../config/env';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocChunk {
  id: string;
  content: string;
  category: string;
  functionName?: string;
  embedding: number[];
}

export interface SearchResult {
  chunk: { id: string; content: string; category: string; functionName?: string };
  score: number;
}

interface EmbeddingCache {
  docsHash: string;
  model: string;
  chunks: DocChunk[];
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let chunks: DocChunk[] = [];
let initialized = false;

const CACHE_PATH = join(import.meta.dir, '../../data/typst-docs/.embeddings.json');
const BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

function magnitude(v: number[]): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) {
    sum += v[i] * v[i];
  }
  return Math.sqrt(sum);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct(a, b) / (magA * magB);
}

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

async function hashChunks(rawChunks: RawChunk[]): Promise<string> {
  const combined = rawChunks.map((c) => c.content).join('\n');
  const hash = new Bun.CryptoHasher('sha256');
  hash.update(combined);
  return hash.digest('hex');
}

// ---------------------------------------------------------------------------
// Embedding
// ---------------------------------------------------------------------------

async function embedTexts(texts: string[], model: string): Promise<number[][]> {
  const client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const embeddingModel = client.getGenerativeModel({ model });
  const embeddings: number[][] = [];

  // Process in batches
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((text) => embeddingModel.embedContent(text))
    );
    for (const result of results) {
      embeddings.push(result.embedding.values);
    }
  }

  return embeddings;
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

async function loadCache(): Promise<EmbeddingCache | null> {
  try {
    const data = await readFile(CACHE_PATH, 'utf-8');
    return JSON.parse(data) as EmbeddingCache;
  } catch {
    return null;
  }
}

async function saveCache(cache: EmbeddingCache): Promise<void> {
  try {
    await writeFile(CACHE_PATH, JSON.stringify(cache));
  } catch (err) {
    console.warn('Failed to save embedding cache:', err);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize the vector store: load docs, chunk, embed, and store in memory.
 * Uses cached embeddings if available and docs haven't changed.
 */
export async function initVectorStore(): Promise<void> {
  const embeddingModel = env.RAG_EMBEDDING_MODEL;

  console.log('RAG: Loading Typst documentation...');
  const rawChunks = await loadAndChunkDocs();
  console.log(`RAG: Loaded ${rawChunks.length} chunks from documentation`);

  if (rawChunks.length === 0) {
    console.warn('RAG: No documentation chunks found, skipping initialization');
    return;
  }

  const docsHash = await hashChunks(rawChunks);

  // Try to load from cache
  const cache = await loadCache();
  if (cache && cache.docsHash === docsHash && cache.model === embeddingModel) {
    console.log('RAG: Using cached embeddings');
    chunks = cache.chunks;
    initialized = true;
    return;
  }

  // Embed all chunks
  console.log(`RAG: Embedding ${rawChunks.length} chunks with ${embeddingModel}...`);
  const texts = rawChunks.map((c) => c.content);
  const embeddings = await embedTexts(texts, embeddingModel);

  chunks = rawChunks.map((raw, i) => ({
    ...raw,
    embedding: embeddings[i],
  }));

  // Save cache
  await saveCache({ docsHash, model: embeddingModel, chunks });
  console.log('RAG: Vector store initialized and cached');

  initialized = true;
}

/** Check if the vector store has been initialized */
export function isInitialized(): boolean {
  return initialized;
}

/**
 * Search the vector store for chunks relevant to the query.
 * Returns top-K results sorted by similarity score.
 */
export async function searchDocs(query: string, topK?: number): Promise<SearchResult[]> {
  if (!initialized || chunks.length === 0) return [];

  const k = topK ?? env.RAG_TOP_K;
  const embeddingModel = env.RAG_EMBEDDING_MODEL;

  // Embed the query
  const [queryEmbedding] = await embedTexts([query], embeddingModel);

  // Calculate similarities
  const scored = chunks.map((chunk) => ({
    chunk: {
      id: chunk.id,
      content: chunk.content,
      category: chunk.category,
      functionName: chunk.functionName,
    },
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  // Sort by score descending and return top-K above threshold
  return scored
    .filter((r) => r.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/** Reset the vector store (for testing) */
export function resetVectorStore(): void {
  chunks = [];
  initialized = false;
}
