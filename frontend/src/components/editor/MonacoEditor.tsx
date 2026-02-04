"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef } from "react";
import { useEditorStore } from "@/src/stores/editor";
import { registerTypstCompletions, registerTypstLanguage } from "@/src/lib/typst";
import { useAssets } from "@/src/hooks/use-assets";

const Monaco = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export function MonacoEditor() {
  const activeFile = useEditorStore((state) => state.activeFile);
  const source = useEditorStore((state) => state.source);
  const files = useEditorStore((state) => state.files);
  const data = useEditorStore((state) => state.data);
  const readOnly = useEditorStore((state) => state.readOnly);
  const renderError = useEditorStore((state) => state.renderError);
  const setEditorInstance = useEditorStore((state) => state.setEditorInstance);
  const setCursorPosition = useEditorStore((state) => state.setCursorPosition);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const cursorListenerRef = useRef<{ dispose: () => void } | null>(null);
  const setSource = useEditorStore((state) => state.setSource);
  const setFileContent = useEditorStore((state) => state.setFileContent);
  const { data: assets } = useAssets();

  const value = activeFile === "main.typ" ? source : files[activeFile] || "";
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
    };
  }, []);

  return (
    <Monaco
      height="100%"
      language="typst"
      theme="docuforge-dark"
      value={value}
      beforeMount={(monaco) => {
        registerTypstLanguage(monaco);
        registerTypstCompletions(monaco, {
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
      }}
      onChange={(val) => {
        if (readOnly) return;
        const nextValue = val ?? "";
        if (activeFile === "main.typ") {
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
