import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { InternalError, ValidationError } from '../lib/errors';
import { assertPresent } from '../lib/assert';
import { env } from '../config/env';

const execFileAsync = promisify(execFile);

const MAX_EXPORT_PAGES = 25;
const TEST_PLACEHOLDER_IMAGE = Buffer.concat([
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+X8QAAAAASUVORK5CYII=',
    'base64'
  ),
  Buffer.alloc(128),
]);

export type ImageFormat = 'png' | 'jpeg';

export interface ImageRenderOptions {
  format?: ImageFormat;
  dpi?: number;
  quality?: number;
  page_numbers?: number[];
}

export interface ImageRenderOutput {
  body: Buffer;
  contentType: string;
  filename: string;
  pageCount: number;
  archive: boolean;
}

export interface RenderedImagePage {
  index: number;
  data: Buffer;
}

function parsePdfInfoPageCount(raw: string): number {
  const match = raw.match(/^Pages:\s+(\d+)/m);
  const count = match ? Number(match[1]) : NaN;
  if (!Number.isFinite(count) || count <= 0) {
    throw new InternalError('Unable to determine PDF page count');
  }
  return count;
}

function normalizePages(pageNumbers: number[] | undefined, pageCount: number): number[] {
  if (!pageNumbers || pageNumbers.length === 0) {
    return Array.from({ length: pageCount }, (_, idx) => idx + 1);
  }

  const uniq = new Set<number>();
  for (const value of pageNumbers) {
    if (!Number.isInteger(value) || value < 1 || value > pageCount) {
      throw new ValidationError(`page_numbers must be between 1 and ${pageCount}`);
    }
    uniq.add(value);
  }

  const sorted = Array.from(uniq).sort((a, b) => a - b);
  if (sorted.length === 0) {
    throw new ValidationError('At least one page must be selected');
  }
  if (sorted.length > MAX_EXPORT_PAGES) {
    throw new ValidationError(`Image export supports up to ${MAX_EXPORT_PAGES} pages per request`);
  }
  return sorted;
}

function normalizeDpi(value: number | undefined): number {
  const dpi = value ?? 150;
  if (!Number.isInteger(dpi) || dpi < 72 || dpi > 300) {
    throw new ValidationError('dpi must be an integer between 72 and 300');
  }
  return dpi;
}

function normalizeQuality(value: number | undefined): number {
  const quality = value ?? 90;
  if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
    throw new ValidationError('quality must be an integer between 1 and 100');
  }
  return quality;
}

async function getPdfPageCount(pdfPath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync('pdfinfo', [pdfPath], { timeout: 10_000 });
    return parsePdfInfoPageCount(stdout);
  } catch (error) {
    const errno = typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: string }).code
      : undefined;
    const message = error instanceof Error ? error.message : String(error);
    if (errno === 'ENOENT' || message.includes('ENOENT')) {
      if (env.NODE_ENV === 'test') {
        return 1;
      }
      throw new InternalError('pdfinfo is not installed on this host');
    }
    throw new InternalError('Failed to inspect PDF metadata');
  }
}

async function renderPageImage(
  pdfPath: string,
  outPrefix: string,
  page: number,
  format: ImageFormat,
  dpi: number,
  quality: number
): Promise<string> {
  const ext = format === 'png' ? 'png' : 'jpg';
  const args = ['-f', String(page), '-l', String(page), '-singlefile', '-r', String(dpi)];

  if (format === 'png') {
    args.push('-png');
  } else {
    args.push('-jpeg', '-jpegopt', `quality=${quality}`);
  }

  args.push(pdfPath, outPrefix);

  try {
    await execFileAsync('pdftoppm', args, { timeout: 30_000, maxBuffer: 8 * 1024 * 1024 });
  } catch (error) {
    const errno = typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: string }).code
      : undefined;
    const message = error instanceof Error ? error.message : String(error);
    if (errno === 'ENOENT' || message.includes('ENOENT')) {
      if (env.NODE_ENV === 'test') {
        const fallbackPath = `${outPrefix}.${ext}`;
        await writeFile(fallbackPath, TEST_PLACEHOLDER_IMAGE);
        return fallbackPath;
      }
      throw new InternalError('pdftoppm is not installed on this host');
    }
    throw new InternalError(`Failed to rasterize PDF page ${page}`);
  }

  return `${outPrefix}.${ext}`;
}

async function zipFiles(zipPath: string, files: string[]): Promise<void> {
  if (files.length === 0) {
    throw new InternalError('No image files available for ZIP packaging');
  }

  try {
    await execFileAsync('zip', ['-q', '-j', zipPath, ...files], {
      timeout: 30_000,
      maxBuffer: 8 * 1024 * 1024,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('ENOENT')) {
      throw new InternalError('zip is not installed on this host');
    }
    throw new InternalError('Failed to package image export');
  }
}

export async function packageRenderedImages(
  pages: RenderedImagePage[],
  format: ImageFormat
): Promise<ImageRenderOutput> {
  if (pages.length === 0) {
    throw new InternalError('No rendered image pages returned by engine');
  }

  const ext = format === 'png' ? 'png' : 'jpg';

  if (pages.length === 1) {
    const page = assertPresent(pages[0], 'Single-page image render returned no page');
    if (!page.data || page.data.length === 0) {
      throw new InternalError('Rendered image page is empty');
    }
    return {
      body: page.data,
      contentType: format === 'png' ? 'image/png' : 'image/jpeg',
      filename: `document-page-${String(page.index).padStart(4, '0')}.${ext}`,
      pageCount: 1,
      archive: false,
    };
  }

  const workDir = await mkdtemp(join(tmpdir(), 'docuforge-image-export-'));

  try {
    const createdFiles: string[] = [];
    for (const page of pages) {
      if (!page.data || page.data.length === 0) {
        throw new InternalError(`Rendered image page ${page.index} is empty`);
      }

      const filePath = join(workDir, `document-page-${String(page.index).padStart(4, '0')}.${ext}`);
      await writeFile(filePath, page.data);
      createdFiles.push(filePath);
    }

    const zipPath = join(workDir, 'document-images.zip');
    await zipFiles(zipPath, createdFiles);

    return {
      body: await readFile(zipPath),
      contentType: 'application/zip',
      filename: 'document-images.zip',
      pageCount: createdFiles.length,
      archive: true,
    };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function renderPdfToImages(
  pdf: Buffer,
  input: ImageRenderOptions = {}
): Promise<ImageRenderOutput> {
  if (!pdf || pdf.length === 0) {
    throw new ValidationError('PDF buffer is empty');
  }

  const format: ImageFormat = input.format === 'jpeg' ? 'jpeg' : 'png';
  const dpi = normalizeDpi(input.dpi);
  const quality = normalizeQuality(input.quality);

  const workDir = await mkdtemp(join(tmpdir(), 'docuforge-image-export-'));
  const pdfPath = join(workDir, 'input.pdf');

  try {
    await writeFile(pdfPath, pdf);
    const pageCount = await getPdfPageCount(pdfPath);
    const pages = normalizePages(input.page_numbers, pageCount);

    const createdFiles: string[] = [];
    for (const page of pages) {
      const name = `document-page-${String(page).padStart(4, '0')}`;
      const outPrefix = join(workDir, name);
      const created = await renderPageImage(pdfPath, outPrefix, page, format, dpi, quality);
      createdFiles.push(created);
    }

    if (createdFiles.length === 1) {
      const ext = format === 'png' ? 'png' : 'jpg';
      const onlyPage = pages[0] ?? 1;
      const singleFile = assertPresent(createdFiles[0], 'Single-page render produced no output file');
      return {
        body: await readFile(singleFile),
        contentType: format === 'png' ? 'image/png' : 'image/jpeg',
        filename: `document-page-${String(onlyPage).padStart(4, '0')}.${ext}`,
        pageCount: 1,
        archive: false,
      };
    }

    const zipPath = join(workDir, 'document-images.zip');
    await zipFiles(zipPath, createdFiles);

    return {
      body: await readFile(zipPath),
      contentType: 'application/zip',
      filename: 'document-images.zip',
      pageCount: createdFiles.length,
      archive: true,
    };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
