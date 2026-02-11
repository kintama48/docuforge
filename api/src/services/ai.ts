import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';

let geminiClient: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }
  return geminiClient;
}

function getGeminiModel(modelName?: string): GenerativeModel {
  const client = getGeminiClient();
  const model = modelName || process.env.AI_MODEL || 'gemini-2.5-flash';
  return client.getGenerativeModel({ model });
}

export function setGeminiClient(client: GoogleGenerativeAI | null) {
  geminiClient = client;
}

/** Strip markdown code fences from AI response */
function stripCodeFences(content: string): string {
  let code = content.trim();
  if (code.startsWith('```typst')) {
    code = code.slice(8);
  } else if (code.startsWith('```')) {
    code = code.slice(3);
  }
  if (code.endsWith('```')) {
    code = code.slice(0, -3);
  }
  return code.trim();
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

export interface AiGenerateParams {
  imageBase64: string;
}

export interface AiGenerateResult {
  code: string;
  tokensUsed: number;
}

export async function aiEditCode(params: AiEditParams): Promise<AiEditResult> {
  const model = getGeminiModel();

  const assetContext =
    params.assetNames.length > 0
      ? `\n\nThe user has these assets available: ${params.assetNames.join(', ')}. You can reference them in Typst using #image("asset-name.png") for images or #set text(font: "FontName") for fonts.`
      : '';

  const response = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Current Typst code:\n\`\`\`typst\n${params.currentCode}\n\`\`\`\n\nUser request: ${params.prompt}`,
          },
        ],
      },
    ],
    systemInstruction: SYSTEM_PROMPT + assetContext,
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.3,
    },
  });

  const content = response.response.text() || params.currentCode;
  const tokensUsed = response.response.usageMetadata?.totalTokenCount || 0;

  return {
    code: stripCodeFences(content),
    tokensUsed,
  };
}

export async function aiGenerateFromImage(params: AiGenerateParams): Promise<AiGenerateResult> {
  const model = getGeminiModel();

  // Extract raw base64 data (strip data URI prefix if present)
  let mimeType = 'image/png';
  let base64Data = params.imageBase64;
  if (base64Data.startsWith('data:')) {
    const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    }
  }

  const response = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { text: 'Generate Typst code that matches this screenshot.' },
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
    systemInstruction:
      SYSTEM_PROMPT +
      '\nYou will be given a screenshot of a document. Recreate the layout in Typst as faithfully as possible. Return ONLY Typst code.',
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.3,
    },
  });

  const content = response.response.text() || '';
  const tokensUsed = response.response.usageMetadata?.totalTokenCount || 0;

  return { code: stripCodeFences(content), tokensUsed };
}
