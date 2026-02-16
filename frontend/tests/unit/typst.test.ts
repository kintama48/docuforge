import { describe, it, expect, vi } from "vitest";
import { registerTypstLanguage, registerTypstCompletions } from "@/src/lib/typst";

describe("typst language helpers", () => {
  it("registers language and theme once", () => {
    const languages = {
      getLanguages: vi.fn().mockReturnValue([]),
      register: vi.fn(),
      setMonarchTokensProvider: vi.fn(),
      registerCompletionItemProvider: vi.fn(),
      CompletionItemKind: { Keyword: 1, Function: 2, Snippet: 3, File: 4, Field: 5 },
      CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
    };
    const editor = { defineTheme: vi.fn() };
    const monaco = { languages, editor } as any;

    registerTypstLanguage(monaco);
    expect(languages.register).toHaveBeenCalledWith({ id: "typst" });
    expect(editor.defineTheme).toHaveBeenCalled();

    languages.getLanguages.mockReturnValue([{ id: "typst" }]);
    registerTypstLanguage(monaco);
    expect(languages.register).toHaveBeenCalledTimes(1);
  });

  it("registers completions with assets and data keys", () => {
    const providerCalls: any[] = [];
    const languages = {
      CompletionItemKind: { Keyword: 1, Function: 2, Snippet: 3, File: 4, Field: 5 },
      CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
      registerCompletionItemProvider: vi
        .fn()
        .mockImplementation((_lang: string, provider: any) => providerCalls.push(provider)),
    };

    registerTypstCompletions({ languages } as any, {
      assets: ["logo.png"],
      dataKeys: ["title"],
    });

    const model = {
      getWordUntilPosition: vi.fn().mockReturnValue({
        startColumn: 1,
        endColumn: 1,
      }),
    };
    const position = { lineNumber: 1, column: 1 };
    const suggestions = providerCalls[0].provideCompletionItems(model, position).suggestions;
    expect(suggestions.some((item: any) => item.label === "logo.png")).toBe(true);
    expect(suggestions.some((item: any) => item.label === "sys.inputs.title")).toBe(true);
    expect(suggestions[0].range).toEqual({
      startLineNumber: 1,
      endLineNumber: 1,
      startColumn: 1,
      endColumn: 1,
    });
  });
});
