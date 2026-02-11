"use client";

import type { editor, Monaco } from "monaco-editor";

// FE-M4 fix: Pre-compile regexes once (outside the function) to avoid
// re-creation per call. Process all patterns in a single pass per line.
const HEADING_RE = /^=+\s+/;
const BOLD_RE = /\*[^*]+\*/g;
const ITALIC_RE = /_[^_]+_/g;
const FUNCTION_RE = /#[a-zA-Z0-9_-]+\[/g;

interface InlinePattern {
  regex: RegExp;
  className: string;
}

const INLINE_PATTERNS: InlinePattern[] = [
  { regex: BOLD_RE, className: "monaco-typst-bold" },
  { regex: ITALIC_RE, className: "monaco-typst-italic" },
  { regex: FUNCTION_RE, className: "monaco-typst-function" },
];

export function buildTypstDecorations(
  model: editor.ITextModel,
  monaco: typeof Monaco
) {
  const decorations: editor.IModelDeltaDecoration[] = [];
  const lineCount = model.getLineCount();

  for (let lineNumber = 1; lineNumber <= lineCount; lineNumber += 1) {
    const line = model.getLineContent(lineNumber);

    if (HEADING_RE.test(line)) {
      decorations.push({
        range: new monaco.Range(lineNumber, 1, lineNumber, line.length + 1),
        options: { inlineClassName: "monaco-typst-heading" },
      });
    }

    for (const pattern of INLINE_PATTERNS) {
      pattern.regex.lastIndex = 0;
      let match = pattern.regex.exec(line);
      while (match) {
        decorations.push({
          range: new monaco.Range(
            lineNumber,
            match.index + 1,
            lineNumber,
            match.index + match[0].length + 1
          ),
          options: { inlineClassName: pattern.className },
        });
        match = pattern.regex.exec(line);
      }
    }
  }

  return decorations;
}
