import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

const SYSTEM_PROMPT = `You are a Typst expert. Typst is a modern typesetting language for creating beautiful documents.

When modifying Typst code:
1. Use #set for styling (e.g., #set text(font: "Inter"))
2. Use #let for variables and functions
3. Access input data via sys.inputs (e.g., sys.inputs.name)
4. Use #grid, #table, #stack for layouts
5. Use #rect, #circle, #line for shapes
6. Use #place for absolute positioning

Return ONLY the modified Typst code. No explanations, no markdown code blocks, just the raw Typst code.`;

export interface AiEditParams {
  prompt: string;
  currentCode: string;
  assetNames: string[];
}

export interface AiEditResult {
  code: string;
  tokensUsed: number;
}

export async function aiEditCode(params: AiEditParams): Promise<AiEditResult> {
  const openai = getOpenAI();
  const model = process.env.AI_MODEL || 'gpt-4o';

  const assetContext =
    params.assetNames.length > 0
      ? `\n\nThe user has these assets available: ${params.assetNames.join(', ')}. You can reference them in Typst using #image("asset-name.png") for images or #set text(font: "FontName") for fonts.`
      : '';

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT + assetContext,
      },
      {
        role: 'user',
        content: `Current Typst code:\n\`\`\`typst\n${params.currentCode}\n\`\`\`\n\nUser request: ${params.prompt}`,
      },
    ],
    max_tokens: 4096,
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content || params.currentCode;
  const tokensUsed = response.usage?.total_tokens || 0;

  // Clean up response (remove markdown code blocks if present)
  let code = content.trim();
  if (code.startsWith('```typst')) {
    code = code.slice(8);
  } else if (code.startsWith('```')) {
    code = code.slice(3);
  }
  if (code.endsWith('```')) {
    code = code.slice(0, -3);
  }
  code = code.trim();

  return {
    code,
    tokensUsed,
  };
}
