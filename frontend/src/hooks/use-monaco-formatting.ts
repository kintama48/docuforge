"use client";

import { useCallback, useEffect, useRef } from "react";
import { useEditorStore } from "@/src/stores/editor";

export type FormatAction =
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "h1"
  | "h2"
  | "bullet"
  | "number"
  | "link"
  | "image"
  | "code"
  | "table";

type MonacoRange = {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
};

type MonacoPosition = { lineNumber: number; column: number };

function getStartPosition(range: MonacoRange) {
  const start = (range as any).getStartPosition?.();
  if (start) return start as MonacoPosition;
  return { lineNumber: range.startLineNumber, column: range.startColumn };
}

function positionAtOffset(
  start: MonacoPosition,
  text: string,
  offset: number
) {
  const before = text.slice(0, Math.max(0, offset));
  const lines = before.split("\n");
  if (lines.length === 1) {
    return {
      lineNumber: start.lineNumber,
      column: start.column + before.length,
    };
  }
  const lastLine = lines[lines.length - 1] ?? "";
  return {
    lineNumber: start.lineNumber + lines.length - 1,
    column: lastLine.length + 1,
  };
}

export function useMonacoFormatting() {
  const editor = useEditorStore((state) => state.editorInstance);
  const monaco = useEditorStore((state) => state.monacoInstance);
  const commandEditorRef = useRef<any>(null);

  const replaceRange = useCallback(
    (
      range: MonacoRange,
      text: string,
      selection?: { start: number; end: number }
    ) => {
      if (!editor || !monaco) return;
      editor.pushUndoStop();
      editor.executeEdits("power-bar", [
        { range, text, forceMoveMarkers: true },
      ]);
      if (selection) {
        const start = getStartPosition(range);
        const selectionStart = positionAtOffset(start, text, selection.start);
        const selectionEnd = positionAtOffset(start, text, selection.end);
        editor.setSelection(
          new monaco.Selection(
            selectionStart.lineNumber,
            selectionStart.column,
            selectionEnd.lineNumber,
            selectionEnd.column
          )
        );
      }
      editor.focus();
      editor.pushUndoStop();
    },
    [editor, monaco]
  );

  const toggleInlineWrapper = useCallback(
    (prefix: string, suffix: string) => {
      if (!editor || !monaco) return;
      const model = editor.getModel();
      const selection = editor.getSelection();
      if (!model || !selection) return;

      const text = model.getValueInRange(selection);
      const isEmpty =
        (selection as any).isEmpty?.() ??
        (selection.startLineNumber === selection.endLineNumber &&
          selection.startColumn === selection.endColumn);

      if (isEmpty) {
        const insertText = `${prefix}${suffix}`;
        replaceRange(selection, insertText, {
          start: prefix.length,
          end: prefix.length,
        });
        return;
      }

      const start = selection.getStartPosition();
      const end = selection.getEndPosition();
      const singleLine = start.lineNumber === end.lineNumber;

      if (text.startsWith(prefix) && text.endsWith(suffix)) {
        const nextText = text.slice(prefix.length, text.length - suffix.length);
        replaceRange(selection, nextText, { start: 0, end: nextText.length });
        return;
      }

      if (singleLine && start.column > prefix.length) {
        const prefixRange = new monaco.Range(
          start.lineNumber,
          start.column - prefix.length,
          start.lineNumber,
          start.column
        );
        const suffixRange = new monaco.Range(
          end.lineNumber,
          end.column,
          end.lineNumber,
          end.column + suffix.length
        );
        const before = model.getValueInRange(prefixRange);
        const after = model.getValueInRange(suffixRange);
        if (before === prefix && after === suffix) {
          const wrapRange = new monaco.Range(
            start.lineNumber,
            start.column - prefix.length,
            end.lineNumber,
            end.column + suffix.length
          );
          replaceRange(wrapRange, text, { start: 0, end: text.length });
          return;
        }
      }

      const wrapped = `${prefix}${text}${suffix}`;
      replaceRange(selection, wrapped, {
        start: prefix.length,
        end: prefix.length + text.length,
      });
    },
    [editor, monaco, replaceRange]
  );

  const toggleLinePrefix = useCallback(
    (prefix: string, alternates: string[] = []) => {
      if (!editor || !monaco) return;
      const model = editor.getModel();
      const selection = editor.getSelection();
      if (!model || !selection) return;

      const edits: { range: MonacoRange; text: string }[] = [];
      const startLine = selection.startLineNumber;
      const endLine = selection.endLineNumber;

      for (let line = startLine; line <= endLine; line += 1) {
        const lineContent = model.getLineContent(line);
        if (lineContent.startsWith(prefix)) {
          edits.push({
            range: new monaco.Range(line, 1, line, 1 + prefix.length),
            text: "",
          });
          continue;
        }
        const alternate = alternates.find((alt) => lineContent.startsWith(alt));
        if (alternate) {
          edits.push({
            range: new monaco.Range(line, 1, line, 1 + alternate.length),
            text: prefix,
          });
          continue;
        }
        edits.push({
          range: new monaco.Range(line, 1, line, 1),
          text: prefix,
        });
      }

      editor.pushUndoStop();
      editor.executeEdits("power-bar", edits);
      editor.focus();
      editor.pushUndoStop();
    },
    [editor, monaco]
  );

  const insertSnippet = useCallback(
    (snippet: string, cursorOffset?: { start: number; end: number }) => {
      if (!editor || !monaco) return;
      const selection = editor.getSelection();
      if (!selection) return;
      replaceRange(selection, snippet, cursorOffset);
    },
    [editor, monaco, replaceRange]
  );

  const applyAction = useCallback(
    (action: FormatAction) => {
      switch (action) {
        case "bold":
          toggleInlineWrapper("*", "*");
          return;
        case "italic":
          toggleInlineWrapper("_", "_");
          return;
        case "underline":
          toggleInlineWrapper("#underline[", "]");
          return;
        case "strike":
          toggleInlineWrapper("#strike[", "]");
          return;
        case "h1":
          toggleLinePrefix("= ", ["== "]);
          return;
        case "h2":
          toggleLinePrefix("== ", ["= "]);
          return;
        case "bullet":
          toggleLinePrefix("- ", ["+ "]);
          return;
        case "number":
          toggleLinePrefix("+ ", ["- "]);
          return;
        case "link": {
          if (!editor) return;
          const selection = editor.getSelection();
          const model = editor.getModel();
          if (!selection || !model) return;
          const text = model.getValueInRange(selection) || "text";
          const snippet = `#link(\"url\")[${text}]`;
          const urlStart = '#link(\"'.length;
          const urlEnd = urlStart + "url".length;
          insertSnippet(snippet, { start: urlStart, end: urlEnd });
          return;
        }
        case "image": {
          const snippet = '#image("file")';
          const start = '#image("'.length;
          const end = start + "file".length;
          insertSnippet(snippet, { start, end });
          return;
        }
        case "code": {
          const selection = editor?.getSelection();
          const model = editor?.getModel();
          if (!selection || !model) return;
          const text = model.getValueInRange(selection);
          if (text) {
            const snippet = `\`\`\`\n${text}\n\`\`\``;
            insertSnippet(snippet, {
              start: 4,
              end: 4 + text.length,
            });
            return;
          }
          const snippet = "```\n\n```";
          insertSnippet(snippet, { start: 4, end: 4 });
          return;
        }
        case "table": {
          const snippet = `#table(\n  columns: 2,\n  [Header 1], [Header 2],\n  [Cell 1], [Cell 2],\n)`;
          const cursor = "#table(\n  columns: 2,\n  [".length;
          insertSnippet(snippet, { start: cursor, end: cursor + "Header 1".length });
          return;
        }
        default:
          return;
      }
    },
    [editor, insertSnippet, toggleInlineWrapper, toggleLinePrefix]
  );

  // FE-M5 fix: Store and dispose command disposables to prevent duplicate handlers
  const commandDisposablesRef = useRef<Array<{ dispose: () => void }>>([]);

  useEffect(() => {
    if (!editor || !monaco) return;
    if (commandEditorRef.current === editor) return;
    commandEditorRef.current = editor;

    // Dispose previous commands
    commandDisposablesRef.current.forEach((d) => d.dispose());
    commandDisposablesRef.current = [];

    const d1 = editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () =>
      applyAction("bold")
    );
    const d2 = editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () =>
      applyAction("italic")
    );
    const d3 = editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () =>
      applyAction("link")
    );
    commandDisposablesRef.current = [d1, d2, d3].filter(Boolean) as Array<{ dispose: () => void }>;

    return () => {
      commandDisposablesRef.current.forEach((d) => d.dispose());
      commandDisposablesRef.current = [];
    };
  }, [editor, monaco, applyAction]);

  return {
    applyAction,
    ready: Boolean(editor && monaco),
  };
}
