"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type * as MonacoType from "monaco-editor";
import { useEditorStore } from "@/src/stores/editor";
import { registerTypstCompletions, registerTypstLanguage } from "@/src/lib/typst";
import { useAssets } from "@/src/hooks/use-assets";
import { buildTypstDecorations } from "@/src/lib/typst-decorations";
import { useTheme } from "@/src/lib/theme";

// FE-C3 fix: Use proper Monaco types instead of 'any'
type MonacoEditor = MonacoType.editor.IStandaloneCodeEditor;

const Monaco = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export function MonacoEditor() {
  const { resolvedTheme } = useTheme();
  const activeFile = useEditorStore((state) => state.activeFile);
  const source = useEditorStore((state) => state.source);
  const files = useEditorStore((state) => state.files);
  const data = useEditorStore((state) => state.data);
  const readOnly = useEditorStore((state) => state.readOnly);
  const editorMode = useEditorStore((state) => state.editorMode);
  const lowCodeSpec = useEditorStore((state) => state.lowCodeSpec);
  const advancedTypstEnabled = useEditorStore(
    (state) => state.advancedTypstEnabled
  );
  const renderError = useEditorStore((state) => state.renderError);
  const setEditorInstance = useEditorStore((state) => state.setEditorInstance);
  const setCursorPosition = useEditorStore((state) => state.setCursorPosition);
  const detachFromLowCode = useEditorStore((state) => state.detachFromLowCode);
  const editorRef = useRef<MonacoEditor | null>(null);
  const monacoRef = useRef<typeof MonacoType | null>(null);
  const cursorListenerRef = useRef<{ dispose: () => void } | null>(null);
  const decorationListenerRef = useRef<{ dispose: () => void } | null>(null);
  const completionProviderRef = useRef<{ dispose: () => void } | null>(null);
  const decorationIdsRef = useRef<string[]>([]);
  const setSource = useEditorStore((state) => state.setSource);
  const setFileContent = useEditorStore((state) => state.setFileContent);
  const { data: assets } = useAssets();

  const value = activeFile === "main.typ" ? source : files[activeFile] || "";
  const monacoTheme =
    resolvedTheme === "dark" ? "docuforge-dark" : "docuforge-light";
  const dataKeys = useMemo(() => Object.keys(data || {}), [data]);
  const assetNames = assets?.assets?.map((asset) => asset.name) || [];

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;
    if (renderError) {
      monacoRef.current.editor.setModelMarkers(model, "typst", [
        {
          startLineNumber: renderError.line,
          startColumn: renderError.column,
          endLineNumber: renderError.line,
          endColumn: renderError.column + 1,
          message: renderError.message,
          severity: monacoRef.current.MarkerSeverity.Error,
        },
      ]);
      editorRef.current.revealPositionInCenter({
        lineNumber: renderError.line,
        column: renderError.column,
      });
    } else {
      monacoRef.current.editor.setModelMarkers(model, "typst", []);
    }
  }, [renderError]);

  useEffect(() => {
    return () => {
      cursorListenerRef.current?.dispose();
      decorationListenerRef.current?.dispose();
      completionProviderRef.current?.dispose();
    };
  }, []);

  const updateDecorations = useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;
    const decorations = buildTypstDecorations(model, monaco);
    decorationIdsRef.current = editor.deltaDecorations(
      decorationIdsRef.current,
      decorations
    );
  }, []);

  useEffect(() => {
    updateDecorations();
  }, [value, updateDecorations]);

  return (
    <Monaco
      height="100%"
      language="typst"
      theme={monacoTheme}
      value={value}
      beforeMount={(monaco) => {
        registerTypstLanguage(monaco);
        // FE-M6 fix: Dispose previous provider before re-registering
        completionProviderRef.current?.dispose();
        completionProviderRef.current = registerTypstCompletions(monaco, {
          assets: assetNames,
          dataKeys,
        });
      }}
      onMount={(editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        setEditorInstance(editor, monaco);
        cursorListenerRef.current?.dispose();
        cursorListenerRef.current = editor.onDidChangeCursorPosition((event) => {
          setCursorPosition(event.position.lineNumber, event.position.column);
        });
        decorationListenerRef.current?.dispose();
        decorationListenerRef.current = editor.onDidChangeModelContent(() => {
          updateDecorations();
        });
        updateDecorations();
      }}
      onChange={(val) => {
        if (readOnly) return;
        const nextValue = val ?? "";
        if (activeFile === "main.typ") {
          if (
            editorMode === "low-code" &&
            advancedTypstEnabled &&
            lowCodeSpec !== null
          ) {
            detachFromLowCode();
          }
          setSource(nextValue);
        } else {
          setFileContent(activeFile, nextValue);
        }
      }}
      options={{
        fontSize: 14,
        fontFamily: "IBM Plex Mono, ui-monospace, monospace",
        minimap: { enabled: false },
        lineNumbers: "on",
        wordWrap: "on",
        renderWhitespace: "selection",
        bracketPairColorization: { enabled: true },
        scrollBeyondLastLine: false,
        tabSize: 2,
        automaticLayout: true,
        readOnly,
      }}
    />
  );
}
