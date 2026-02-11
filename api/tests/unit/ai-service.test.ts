/**
 * Unit tests for AI service logic (Gemini client stubbed).
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { aiEditCode, aiGenerateFromImage, setGeminiClient } from '../../src/services/ai';

let lastRequest: any = null;

const stubGeminiModel = {
  generateContent: async (payload: any) => {
    lastRequest = payload;
    return {
      response: {
        text: () => '```typst\n= Title\nHello\n```',
        usageMetadata: { totalTokenCount: 123 },
      },
    };
  },
};

const stubGeminiClient = {
  getGenerativeModel: () => stubGeminiModel,
};

describe('ai-service', () => {
  beforeEach(() => {
    lastRequest = null;
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.AI_MODEL = 'gemini-2.5-flash';
    setGeminiClient(stubGeminiClient as any);
  });

  afterEach(() => {
    setGeminiClient(null);
  });

  test('aiEditCode strips code fences and returns tokens', async () => {
    const result = await aiEditCode({
      prompt: 'Make it bold',
      currentCode: '= Hello',
      assetNames: ['logo.png'],
    });

    expect(result.code).toBe('= Title\nHello');
    expect(result.tokensUsed).toBe(123);
    expect(lastRequest).toBeDefined();
    expect(lastRequest.systemInstruction).toContain('logo.png');
  });

  test('aiGenerateFromImage formats base64 and strips fences', async () => {
    const result = await aiGenerateFromImage({
      imageBase64: 'Zm9vYmFy',
    });

    expect(result.code).toBe('= Title\nHello');
    expect(result.tokensUsed).toBe(123);
    expect(lastRequest.contents[0].parts[1].inlineData.data).toBe('Zm9vYmFy');
    expect(lastRequest.contents[0].parts[1].inlineData.mimeType).toBe('image/png');
  });
});
