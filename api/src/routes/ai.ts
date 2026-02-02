import { Hono } from 'hono';

import { jwtAuth } from '../middleware/auth';
import { aiRateLimit } from '../middleware/rate-limit';
import { zValidator, aiEditSchema } from '../lib/validation';
import { aiEditCode } from '../services/ai';

const ai = new Hono();

// POST /v1/ai/edit - AI-powered code editing
ai.post('/edit', jwtAuth, aiRateLimit, zValidator('json', aiEditSchema), async (c) => {
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

export default ai;
