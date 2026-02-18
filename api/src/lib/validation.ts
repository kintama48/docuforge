import { z } from 'zod';
import { zValidator as honoZValidator } from '@hono/zod-validator';
import type { Context } from 'hono';
import { lowCodeSpecSchema } from './low-code';

/**
 * Custom zValidator that returns 422 for validation errors (per spec section 6.3)
 */
export const zValidator = <T extends z.ZodType>(target: 'json' | 'query' | 'param', schema: T) => {
  return honoZValidator(target, schema, (result, c: Context) => {
    if (!result.success) {
      return c.json(
        {
          error: 'validation_error',
          message: 'Validation failed',
          details: {
            issues: result.error.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message,
            })),
          },
        },
        422
      );
    }
  });
};

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
});

// Render schemas
export const renderSchema = z.object({
  template_id: z.string().min(1, 'template_id is required'),
  data: z.record(z.unknown()).optional().default({}),
});

export const renderPreviewSchema = z
  .object({
    source: z.string().min(1).max(102400, 'Source must be under 100KB').optional(),
    low_code_spec: lowCodeSpecSchema.optional(),
    files: z.record(z.string().max(102400)).optional(),
    data: z.record(z.unknown()).optional().default({}),
  })
  .refine((data) => Boolean(data.source) || data.low_code_spec !== undefined, {
    message: 'Either source or low_code_spec is required',
    path: ['source'],
  });

export const renderJobParamSchema = z.object({
  jobId: z.string().min(1).max(128),
});

// Template schemas
export const createTemplateSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).nullable().optional(),
    source: z.string().min(1).max(1048576, 'Source must be under 1MB').optional(),
    low_code_spec: lowCodeSpecSchema.optional(),
    files: z.record(z.string().max(102400)).optional(),
    defaults: z.record(z.unknown()).optional(),
    commit_message: z.string().max(200).optional(),
  })
  .refine((data) => Boolean(data.source) || data.low_code_spec !== undefined, {
    message: 'Either source or low_code_spec is required',
    path: ['source'],
  });

export const publishVersionSchema = z
  .object({
    source: z.string().min(1).max(1048576, 'Source must be under 1MB').optional(),
    low_code_spec: lowCodeSpecSchema.optional(),
    files: z.record(z.string().max(102400)).optional(),
    defaults: z.record(z.unknown()).optional(),
    commit_message: z.string().max(200).optional(),
  })
  .refine((data) => Boolean(data.source) || data.low_code_spec !== undefined, {
    message: 'Either source or low_code_spec is required',
    path: ['source'],
  });

export const updateTemplateSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).nullable().optional(),
  })
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message: 'At least one field must be provided',
  });

export const forkTemplateSchema = z.object({
  name: z.string().min(1).max(100),
});

const queryBoolean = z.preprocess((value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', ''].includes(normalized)) return false;
  }
  return value;
}, z.boolean());

export const listTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  include_official: queryBoolean.default(true),
});

// Asset schemas
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg', '.ttf', '.otf', '.woff2'];
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.svg': ['image/svg+xml'],
  '.ttf': ['font/ttf', 'application/x-font-ttf'],
  '.otf': ['font/otf', 'application/x-font-opentype'],
  '.woff2': ['font/woff2'],
};

export const requestUploadUrlSchema = z
  .object({
    filename: z.string().min(1).max(255),
    content_type: z.string().min(1),
    size_bytes: z.number().int().positive(),
  })
  .refine(
    (data) => {
      const ext = data.filename.slice(data.filename.lastIndexOf('.')).toLowerCase();
      return ALLOWED_EXTENSIONS.includes(ext);
    },
    { message: `File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` }
  )
  .refine(
    (data) => {
      const ext = data.filename.slice(data.filename.lastIndexOf('.')).toLowerCase();
      const allowedMimes = ALLOWED_MIME_TYPES[ext] || [];
      return allowedMimes.includes(data.content_type);
    },
    { message: 'Content type does not match file extension' }
  )
  .refine(
    (data) => {
      const ext = data.filename.slice(data.filename.lastIndexOf('.')).toLowerCase();
      const isFont = ['.ttf', '.otf', '.woff2'].includes(ext);
      const maxSize = isFont ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
      return data.size_bytes <= maxSize;
    },
    { message: 'File size exceeds limit (5MB for images, 10MB for fonts)' }
  );

export const confirmUploadSchema = z.object({
  asset_id: z.string().min(1),
  name: z.string().min(1).max(255),
  hash: z.string().min(1),
});

// Billing schemas
export const createCheckoutSchema = z.object({
  plan: z.enum(['dev', 'starter', 'pro']),
});

// AI schemas
export const aiEditSchema = z.object({
  prompt: z.string().min(1).max(2000),
  current_code: z.string().min(1).max(102400),
  asset_names: z.array(z.string()).optional().default([]),
});

// API-M6 fix: Limit base64 image size to prevent DoS via memory exhaustion
// ~13.7M chars base64 ≈ 10MB binary
const MAX_BASE64_IMAGE_CHARS = 13_700_000;

export const aiGenerateSchema = z.object({
  image_base64: z.string().min(1).max(MAX_BASE64_IMAGE_CHARS, 'Image exceeds 10MB limit'),
});

// Webhook schemas
export const webhookEvents = ['render.completed', 'render.failed'] as const;

export const createWebhookSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  events: z.array(z.enum(webhookEvents)).min(1, 'At least one event required'),
});

export const updateWebhookSchema = z
  .object({
    url: z.string().url('Must be a valid URL').optional(),
    events: z.array(z.enum(webhookEvents)).min(1).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((d) => d.url !== undefined || d.events !== undefined || d.is_active !== undefined, {
    message: 'At least one field must be provided',
  });

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type RenderInput = z.infer<typeof renderSchema>;
export type RenderPreviewInput = z.infer<typeof renderPreviewSchema>;
export type RenderJobParamInput = z.infer<typeof renderJobParamSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type PublishVersionInput = z.infer<typeof publishVersionSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type ForkTemplateInput = z.infer<typeof forkTemplateSchema>;
export type ListTemplatesQuery = z.infer<typeof listTemplatesQuerySchema>;
export type RequestUploadUrlInput = z.infer<typeof requestUploadUrlSchema>;
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type AiEditInput = z.infer<typeof aiEditSchema>;
export type AiGenerateInput = z.infer<typeof aiGenerateSchema>;
export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
