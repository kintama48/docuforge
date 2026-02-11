"use client";

import type * as Monaco from "monaco-editor";

const keywords = [
  "#set",
  "#let",
  "#show",
  "#import",
  "#include",
  "#if",
  "#else",
  "#for",
  "#while",
  "#return",
];

const builtins = [
  "#table",
  "#image",
  "#text",
  "#page",
  "#align",
  "#grid",
  "#stack",
  "#columns",
  "#rect",
  "#circle",
  "#line",
  "#heading",
  "#link",
  "#emph",
  "#strong",
  "#underline",
  "#strike",
  "#super",
  "#sub",
  "#raw",
  "#quote",
  "#cite",
  "#ref",
  "#figure",
  "#counter",
  "#state",
  "#datetime",
  "#sys",
];

const snippets = [
  {
    label: "#image",
    insertText: '#image("${1:filename.png}", width: ${2:50%})',
  },
  {
    label: "#table",
    insertText:
      "#table(\n  columns: 3,\n  [${1:Header 1}], [${2:Header 2}], [${3:Header 3}],\n)",
  },
];

export function registerTypstLanguage(monaco: typeof Monaco) {
  if (monaco.languages.getLanguages().some((lang) => lang.id === "typst")) {
    return;
  }

  monaco.languages.register({ id: "typst" });

  monaco.languages.setMonarchTokensProvider("typst", {
    keywords,
    builtins,
    tokenizer: {
      root: [
        [/\/\/.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [/#(set|let|show|import|include|if|else|for|while|return)/, "keyword"],
        [/#(table|image|text|page|align|grid|stack|columns|rect|circle|line)/, "type"],
        [/#(heading|link|emph|strong|underline|strike|super|sub)/, "type"],
        [/#(raw|quote|cite|ref|figure|counter|state|datetime|sys)/, "type"],
        [/= .+$/, "markup.heading"],
        [/\*[^*]+\*/, "markup.bold"],
        [/_[^_]+_/, "markup.italic"],
        [/`[^`]+`/, "markup.code"],
        [/".*?"/, "string"],
        [/\b\d+(\.\d+)?(em|cm|pt|%|in)?\b/, "number"],
        [/\$[^$]+\$/, "metatag"],
        [/sys\.inputs/, "variable.predefined"],
      ],
      comment: [
        [/[^\/*]+/, "comment"],
        ["\\*/", "comment", "@pop"],
        [/[\/*]/, "comment"],
      ],
    },
  });

  monaco.editor.defineTheme("docuforge-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6e7681" },
      { token: "keyword", foreground: "ff7b72" },
      { token: "type", foreground: "79c0ff" },
      { token: "string", foreground: "a5d6ff" },
      { token: "number", foreground: "ffa657" },
      { token: "markup.heading", foreground: "d2a8ff" },
      { token: "markup.bold", foreground: "ffffff", fontStyle: "bold" },
      { token: "markup.italic", foreground: "ffffff", fontStyle: "italic" },
      { token: "variable.predefined", foreground: "ffa657", fontStyle: "bold" },
    ],
    colors: {
      "editor.background": "#0f1117",
      "editor.foreground": "#c9d1d9",
    },
  });
}

export function registerTypstCompletions(
  monaco: typeof Monaco,
  options: { assets?: string[]; dataKeys?: string[] } = {}
) {
  const completions = [
    ...keywords.map((item) => ({
      label: item,
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: item,
    })),
    ...builtins.map((item) => ({
      label: item,
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: item,
    })),
    ...snippets.map((snippet) => ({
      label: snippet.label,
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: snippet.insertText,
      insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    })),
  ];

  const assetItems =
    options.assets?.map((asset) => ({
      label: asset,
      kind: monaco.languages.CompletionItemKind.File,
      insertText: asset,
    })) || [];

  const dataItems =
    options.dataKeys?.map((key) => ({
      label: `sys.inputs.${key}`,
      kind: monaco.languages.CompletionItemKind.Field,
      insertText: `sys.inputs.${key}`,
    })) || [];

  // FE-M6 fix: Return the disposable so callers can clean up
  return monaco.languages.registerCompletionItemProvider("typst", {
    provideCompletionItems: () => ({
      suggestions: [...completions, ...assetItems, ...dataItems],
    }),
  });
}
