import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { searchDocs, isInitialized, type SearchResult } from './vector-store';
import type { EngineErrorResponse } from '../types';
import { env } from '../config/env';

let geminiClient: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }
  return geminiClient;
}

function getGeminiModel(modelName?: string): GenerativeModel {
  const client = getGeminiClient();
  const model = modelName || env.AI_MODEL;
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

/** Build a RAG context string from search results */
function buildRagContext(results: SearchResult[]): string {
  if (results.length === 0) return '';
  return `\n\nRelevant Typst documentation:\n${results.map((r) => r.chunk.content).join('\n---\n')}`;
}

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

export interface AiGenerateFromPdfImportParams {
  fileName: string;
  converterOutput: string;
  userPrompt?: string;
}

export async function aiEditCode(params: AiEditParams): Promise<AiEditResult> {
  const model = getGeminiModel();

  const assetContext =
    params.assetNames.length > 0
      ? `\n\nThe user has these assets available: ${params.assetNames.join(', ')}. You can reference them in Typst using #image("asset-name.png") for images or #set text(font: "FontName") for fonts.`
      : '';

  // RAG: search for relevant Typst documentation
  let ragContext = '';
  if (isInitialized()) {
    const results = await searchDocs(params.prompt);
    ragContext = buildRagContext(results);
  }

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
    systemInstruction: SYSTEM_PROMPT + assetContext + ragContext,
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

  // RAG: get broad layout/styling docs for image-to-code generation
  let ragContext = '';
  if (isInitialized()) {
    const results = await searchDocs('typst page layout grid table image text styling');
    ragContext = buildRagContext(results);
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
      '\nYou will be given a screenshot of a document. Recreate the layout in Typst as faithfully as possible. Return ONLY Typst code.' +
      ragContext,
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.3,
    },
  });

  const content = response.response.text() || '';
  const tokensUsed = response.response.usageMetadata?.totalTokenCount || 0;

  return { code: stripCodeFences(content), tokensUsed };
}

export async function aiGenerateFromPdfImport(
  params: AiGenerateFromPdfImportParams
): Promise<AiGenerateResult> {
  const model = getGeminiModel();

  let ragContext = '';
  if (isInitialized()) {
    const results = await searchDocs('typst invoice table layout forms spacing headers');
    ragContext = buildRagContext(results);
  }

  const prompt = `Reconstruct the closest possible Typst template from this extracted PDF text.

File name: ${params.fileName}
User intent: ${params.userPrompt?.trim() || 'No extra user instructions.'}

Converter output:
${params.converterOutput || '[No extracted text available from converter.]'}

Requirements:
- Return valid Typst source only.
- Prioritize practical editability over pixel-perfect recreation.
- Use clear sections (header/body/tables/totals) when inferred.
- If details are missing, generate sensible placeholders using sys.inputs.
`;

  const response = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    systemInstruction:
      SYSTEM_PROMPT +
      '\nYou convert extracted PDF text into an editable Typst template. Return only Typst source.' +
      ragContext,
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.25,
    },
  });

  const content = response.response.text() || '';
  const tokensUsed = response.response.usageMetadata?.totalTokenCount || 0;
  return { code: stripCodeFences(content), tokensUsed };
}

/**
 * Generate a fix suggestion for a Typst compilation error using relevant docs.
 * Has a 3-second timeout — returns null if AI is too slow.
 */
export async function generateErrorSuggestion(
  error: EngineErrorResponse,
  ragResults: SearchResult[]
): Promise<string | null> {
  if (ragResults.length === 0) return null;

  try {
    const model = getGeminiModel();
    const docsContext = ragResults.map((r) => r.chunk.content).join('\n---\n');

    const prompt = `Typst compilation error: ${error.message || error.error}${
      error.span ? ` at ${error.span.file}:${error.span.line}:${error.span.column}` : ''
    }

Relevant Typst documentation:
${docsContext}

Provide a brief, actionable fix suggestion in 1-2 sentences. Focus on the specific syntax or function usage that caused the error.`;

    const response = await Promise.race([
      model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction: 'You are a Typst expert. Provide concise fix suggestions for compilation errors. No code blocks, just a plain text explanation.',
        generationConfig: { maxOutputTokens: 200, temperature: 0.2 },
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);

    if (!response) return null;
    return response.response.text()?.trim() || null;
  } catch {
    return null;
  }
}
