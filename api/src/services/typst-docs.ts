import { readdir, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';

export interface RawChunk {
  id: string;
  content: string;
  category: string;
  functionName?: string;
}

const DOCS_DIR = join(import.meta.dir, '../../data/typst-docs');
const MAX_CHUNK_TOKENS = 500;

/** Rough token count estimate (1 token ≈ 4 chars) */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Split text on paragraph boundaries, keeping chunks under maxTokens */
function splitOnParagraphs(text: string, maxTokens: number): string[] {
  const paragraphs = text.split(/\n\n+/);
  const result: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    const combined = current ? `${current}\n\n${para}` : para;
    if (estimateTokens(combined) > maxTokens && current) {
      result.push(current.trim());
      current = para;
    } else {
      current = combined;
    }
  }
  if (current.trim()) {
    result.push(current.trim());
  }
  return result;
}

/** Extract function name from a heading like "## text()" or "## #grid()" */
function extractFunctionName(heading: string): string | undefined {
  const match = heading.match(/#*\s*#?(\w[\w.]*)\s*\(/);
  return match?.[1];
}

/**
 * Load all markdown files from api/data/typst-docs/ and split into chunks.
 * Each ## heading becomes a chunk. Large chunks are split on paragraph boundaries.
 */
export async function loadAndChunkDocs(): Promise<RawChunk[]> {
  const files = await readdir(DOCS_DIR);
  const mdFiles = files.filter((f) => f.endsWith('.md')).sort();
  const chunks: RawChunk[] = [];

  for (const file of mdFiles) {
    const content = await readFile(join(DOCS_DIR, file), 'utf-8');
    const category = basename(file, '.md');

    // Split on ## headings
    const sections = content.split(/^(?=## )/m);

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      if (!section) continue;

      // Extract heading for context
      const headingMatch = section.match(/^##\s+(.+)/);
      const heading = headingMatch?.[1] || category;
      const functionName = extractFunctionName(heading);

      if (estimateTokens(section) <= MAX_CHUNK_TOKENS) {
        chunks.push({
          id: `${category}:${functionName || i}:0`,
          content: section,
          category,
          functionName,
        });
      } else {
        // Split large sections on paragraphs
        const subChunks = splitOnParagraphs(section, MAX_CHUNK_TOKENS);
        for (let j = 0; j < subChunks.length; j++) {
          // Prefix subsequent chunks with the heading for context
          const chunkContent = j === 0 ? subChunks[j] : `## ${heading}\n\n${subChunks[j]}`;
          chunks.push({
            id: `${category}:${functionName || i}:${j}`,
            content: chunkContent,
            category,
            functionName,
          });
        }
      }
    }
  }

  return chunks;
}
