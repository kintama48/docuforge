import { Hono } from 'hono';

import { jwtAuth } from '../middleware/auth';
import { noCache } from '../middleware/cache';
import { zValidator, aiEditSchema, aiGenerateSchema } from '../lib/validation';
import { aiEditCode, aiGenerateFromImage } from '../services/ai';
import { env } from '../config/env';

const ai = new Hono();

// AI responses are non-deterministic — never cache
ai.use('*', noCache);

// Middleware to check if AI is enabled
ai.use('*', async (c, next) => {
  if (!env.AI_ENABLED) {
    return c.json({ error: 'ai_disabled', message: 'AI features are currently disabled' }, 503);
  }
  await next();
});

// POST /v1/ai/edit - AI-powered code editing
ai.post('/edit', jwtAuth, zValidator('json', aiEditSchema), async (c) => {
  const data = c.req.valid('json');

  const result = await aiEditCode({
    prompt: data.prompt,
    currentCode: data.current_code,
    assetNames: data.asset_names,
  });

  return c.json({
    code: result.code,
    tokens_used: result.tokensUsed,
  });
});

// POST /v1/ai/generate - AI-powered template generation from image
ai.post('/generate', jwtAuth, zValidator('json', aiGenerateSchema), async (c) => {
  const data = c.req.valid('json');

  const result = await aiGenerateFromImage({
    imageBase64: data.image_base64,
  });

  return c.json({
    code: result.code,
    tokens_used: result.tokensUsed,
  });
});

export default ai;
