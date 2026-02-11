import { describe, it, expect } from "vitest";
import { buildTypstDecorations } from "@/src/lib/typst-decorations";

function createModel(lines: string[]) {
  return {
    getLineCount: () => lines.length,
    getLineContent: (line: number) => lines[line - 1],
  };
}

function createMonaco() {
  class Range {
    constructor(
      public startLineNumber: number,
      public startColumn: number,
      public endLineNumber: number,
      public endColumn: number
    ) {}
  }
  return { Range };
}

describe("buildTypstDecorations", () => {
  it("creates decorations for headings and inline styles", () => {
    const model = createModel([
      "= Heading",
      "This is *bold* and _italic_",
      "#underline[text]",
    ]);
    const monaco = createMonaco();

    const decorations = buildTypstDecorations(model as any, monaco as any);
    const classes = decorations.map((d: any) => d.options.inlineClassName);

    expect(classes).toContain("monaco-typst-heading");
    expect(classes).toContain("monaco-typst-bold");
    expect(classes).toContain("monaco-typst-italic");
    expect(classes).toContain("monaco-typst-function");
  });
});
