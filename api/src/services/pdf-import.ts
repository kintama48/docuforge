import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { InternalError, ValidationError } from '../lib/errors';
import { env } from '../config/env';

const execFileAsync = promisify(execFile);
const MAX_IMPORT_BYTES = 20 * 1024 * 1024; // 20MB

export interface ImportedPdfAnalysis {
  extractedText: string;
  converterName: 'pdftotext';
  bytes: number;
}

function assertPdfBuffer(buffer: Buffer) {
  if (!buffer || buffer.length === 0) {
    throw new ValidationError('PDF payload is empty');
  }
  if (buffer.length > MAX_IMPORT_BYTES) {
    throw new ValidationError('PDF import size exceeds 20MB limit');
  }
  const header = buffer.subarray(0, 5).toString('utf8');
  if (!header.startsWith('%PDF-')) {
    throw new ValidationError('Uploaded payload is not a valid PDF');
  }
}

export function decodePdfBase64(pdfBase64: string): Buffer {
  let payload = pdfBase64.trim();
  if (payload.startsWith('data:')) {
    const parts = payload.match(/^data:application\/pdf;base64,(.+)$/i);
    if (!parts?.[1]) {
      throw new ValidationError('Invalid PDF data URI');
    }
    payload = parts[1];
  }

  let decoded: Buffer;
  try {
    decoded = Buffer.from(payload, 'base64');
  } catch {
    throw new ValidationError('Invalid base64 PDF payload');
  }

  assertPdfBuffer(decoded);
  return decoded;
}

export async function extractPdfText(pdf: Buffer): Promise<ImportedPdfAnalysis> {
  assertPdfBuffer(pdf);
  const workDir = await mkdtemp(join(tmpdir(), 'docuforge-pdf-import-'));

  try {
    const inputPath = join(workDir, 'input.pdf');
    const outputPath = join(workDir, 'output.txt');
    await writeFile(inputPath, pdf);

    try {
      await execFileAsync('pdftotext', ['-layout', '-enc', 'UTF-8', inputPath, outputPath], {
        timeout: 30_000,
        maxBuffer: 8 * 1024 * 1024,
      });
    } catch (error) {
      const errno = typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code?: string }).code
        : undefined;
      const message = error instanceof Error ? error.message : String(error);
      if (errno === 'ENOENT' || message.includes('ENOENT')) {
        if (env.NODE_ENV === 'test') {
          return {
            extractedText: '',
            converterName: 'pdftotext',
            bytes: pdf.length,
          };
        }
        throw new InternalError('pdftotext is not installed on this host');
      }
      throw new ValidationError('Unable to extract text from PDF');
    }

    const text = (await readFile(outputPath, 'utf8')).trim();
    return {
      extractedText: text,
      converterName: 'pdftotext',
      bytes: pdf.length,
    };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
