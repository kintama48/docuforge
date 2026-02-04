"use client";

import { create } from "zustand";
import type { TemplateDetail, TemplateVersion } from "@/src/lib/api-types";

type RenderError = { message: string; file: string; line: number; column: number };

type EditorState = {
  templateId: string | null;
  templateName: string;
  templateDescription: string;
  source: string;
  files: Record<string, string>;
  activeFile: string;
  data: Record<string, unknown>;
  dataString: string;
  isDirty: boolean;
  lastSavedSource: string;
  publishedVersion: number | null;
  renderStatus: "idle" | "rendering" | "success" | "error";
  renderError: RenderError | null;
  renderDuration: number | null;
  pdfBlob: Blob | null;
  pdfUrl: string | null;
  readOnly: boolean;
  viewingVersion: number | null;
  dataError: string | null;
  pdfScrollTop: number;
  editorInstance: any | null;
  monacoInstance: any | null;
  cursorPosition: { line: number; column: number } | null;
  loadTemplate: (template: TemplateDetail) => void;
  loadVersion: (version: TemplateVersion) => void;
  setSource: (source: string) => void;
  setTemplateName: (name: string) => void;
  setTemplateDescription: (description: string) => void;
  setActiveFile: (filename: string) => void;
  addFile: (filename: string) => void;
  removeFile: (filename: string) => void;
  renameFile: (from: string, to: string) => void;
  setFileContent: (filename: string, content: string) => void;
  setData: (jsonString: string) => void;
  setDataError: (error: string | null) => void;
  setPdfResult: (blob: Blob, duration: number) => void;
  setRenderError: (error: RenderError | null) => void;
  markClean: () => void;
  setReadOnly: (value: boolean) => void;
  setViewingVersion: (version: number | null) => void;
  setPublishedVersion: (version: number | null) => void;
  setPdfScrollTop: (value: number) => void;
  setEditorInstance: (editor: any | null, monaco: any | null) => void;
  setCursorPosition: (line: number, column: number) => void;
  insertSnippet: (snippet: string) => void;
  revealError: (line: number, column: number) => void;
  reset: () => void;
};

const initialState = {
  templateId: null,
  templateName: "",
  templateDescription: "",
  source: "",
  files: {},
  activeFile: "main.typ",
  data: {},
  dataString: "{}",
  isDirty: false,
  lastSavedSource: "",
  publishedVersion: null,
  renderStatus: "idle" as const,
  renderError: null,
  renderDuration: null,
  pdfBlob: null,
  pdfUrl: null,
  readOnly: false,
  viewingVersion: null,
  dataError: null,
  pdfScrollTop: 0,
  editorInstance: null,
  monacoInstance: null,
  cursorPosition: { line: 1, column: 1 },
};

export const useEditorStore = create<EditorState>((set, get) => ({
  ...initialState,
  loadTemplate: (template) => {
    const defaults = template.live_version?.defaults || {};
    const source = template.live_version?.source || "";
    const files = template.live_version?.files || {};
    set({
      templateId: template.id,
      templateName: template.name,
      templateDescription: template.description || "",
      source,
      files,
      activeFile: "main.typ",
      data: defaults,
      dataString: JSON.stringify(defaults, null, 2),
      dataError: null,
      isDirty: false,
      lastSavedSource: source,
      publishedVersion: template.live_version?.version_number ?? null,
      readOnly: false,
      viewingVersion: null,
    });
  },
  loadVersion: (version) => {
    const defaults = version.defaults || {};
    const source = version.source || "";
    const files = version.files || {};
    set({
      source,
      files,
      activeFile: "main.typ",
      data: defaults,
      dataString: JSON.stringify(defaults, null, 2),
      dataError: null,
      isDirty: false,
      lastSavedSource: source,
    });
  },
  setSource: (source) => {
    const lastSavedSource = get().lastSavedSource;
    set({
      source,
      isDirty: source !== lastSavedSource,
    });
  },
  setTemplateName: (name) => set({ templateName: name }),
  setTemplateDescription: (description) => set({ templateDescription: description }),
  setActiveFile: (filename) => set({ activeFile: filename }),
  addFile: (filename) => {
    set((state) => ({
      files: { ...state.files, [filename]: "" },
      activeFile: filename,
      isDirty: true,
    }));
  },
  removeFile: (filename) => {
    set((state) => {
      const files = { ...state.files };
      delete files[filename];
      return { files, activeFile: "main.typ", isDirty: true };
    });
  },
  renameFile: (from, to) => {
    set((state) => {
      if (!(from in state.files)) return {};
      const files = { ...state.files };
      const content = files[from];
      delete files[from];
      files[to] = content;
      return {
        files,
        activeFile: state.activeFile === from ? to : state.activeFile,
        isDirty: true,
      };
    });
  },
  setFileContent: (filename, content) => {
    set((state) => ({
      files: { ...state.files, [filename]: content },
      isDirty: true,
    }));
  },
  setData: (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString || "{}");
      set({ data: parsed, dataString: jsonString, dataError: null });
    } catch {
      set({ dataString: jsonString, dataError: "Invalid JSON" });
    }
  },
  setDataError: (error) => set({ dataError: error }),
  setPdfResult: (blob, duration) => {
    const currentUrl = get().pdfUrl;
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    const pdfUrl = URL.createObjectURL(blob);
    set({
      pdfBlob: blob,
      pdfUrl,
      renderDuration: duration,
      renderStatus: "success",
      renderError: null,
    });
  },
  setRenderError: (error) => {
    set({
      renderError: error,
      renderStatus: error ? "error" : "idle",
    });
  },
  markClean: () => set({ isDirty: false, lastSavedSource: get().source }),
  setReadOnly: (value) => set({ readOnly: value }),
  setViewingVersion: (version) => set({ viewingVersion: version }),
  setPublishedVersion: (version) => set({ publishedVersion: version }),
  setPdfScrollTop: (value) => set({ pdfScrollTop: value }),
  setEditorInstance: (editor, monaco) =>
    set({ editorInstance: editor, monacoInstance: monaco }),
  setCursorPosition: (line, column) => set({ cursorPosition: { line, column } }),
  insertSnippet: (snippet) => {
    const editor = get().editorInstance;
    const monaco = get().monacoInstance;
    if (!editor || !monaco) return;
    const position = editor.getPosition();
    if (!position) return;
    const range = new monaco.Range(
      position.lineNumber,
      position.column,
      position.lineNumber,
      position.column
    );
    editor.executeEdits("insert-snippet", [
      { range, text: snippet, forceMoveMarkers: true },
    ]);
    editor.focus();
  },
  revealError: (line, column) => {
    const editor = get().editorInstance;
    if (!editor) return;
    editor.revealPositionInCenter({ lineNumber: line, column });
    editor.setPosition({ lineNumber: line, column });
    editor.focus();
  },
  reset: () => {
    const currentUrl = get().pdfUrl;
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    set({ ...initialState });
  },
}));
