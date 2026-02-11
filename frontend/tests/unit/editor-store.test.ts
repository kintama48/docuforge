import { describe, expect, it, beforeEach, vi } from "vitest";
import { useEditorStore } from "@/src/stores/editor";
import type { TemplateDetail } from "@/src/lib/api-types";

const template: TemplateDetail = {
  id: "tpl_1",
  name: "Invoice",
  description: "Invoice template",
  is_official: false,
  live_version: {
    id: "ver_1",
    version_number: 1,
    source: "#set page()",
    files: { "utils.typ": "#let x = 1" },
    defaults: { invoice_id: "1234" },
    commit_message: "Initial",
    created_at: 1738377600,
  },
  versions: [
    {
      id: "ver_1",
      version_number: 1,
      commit_message: "Initial",
      created_at: 1738377600,
    },
  ],
  created_at: 1738377600,
  updated_at: 1738377600,
};

describe("editor store", () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it("loadTemplate populates fields", () => {
    useEditorStore.getState().loadTemplate(template);
    expect(useEditorStore.getState().templateId).toBe("tpl_1");
    expect(useEditorStore.getState().source).toBe("#set page()");
    expect(useEditorStore.getState().data.invoice_id).toBe("1234");
  });

  it("setSource marks dirty", () => {
    useEditorStore.getState().loadTemplate(template);
    useEditorStore.getState().setSource("#set page(paper: \"a4\")");
    expect(useEditorStore.getState().isDirty).toBe(true);
  });

  it("setSource keeps clean when unchanged", () => {
    useEditorStore.getState().loadTemplate(template);
    useEditorStore.getState().setSource("#set page()");
    expect(useEditorStore.getState().isDirty).toBe(false);
  });

  it("addFile creates entry", () => {
    useEditorStore.getState().addFile("utils.typ");
    expect(useEditorStore.getState().files["utils.typ"]).toBeDefined();
  });

  it("removeFile deletes entry", () => {
    useEditorStore.getState().addFile("utils.typ");
    useEditorStore.getState().removeFile("utils.typ");
    expect(useEditorStore.getState().files["utils.typ"]).toBeUndefined();
  });

  it("setData parses valid JSON", () => {
    useEditorStore.getState().setData('{"name":"Acme"}');
    expect(useEditorStore.getState().data.name).toBe("Acme");
  });

  it("renameFile moves content and active file", () => {
    useEditorStore.getState().addFile("utils.typ");
    useEditorStore.getState().setFileContent("utils.typ", "content");
    useEditorStore.getState().setActiveFile("utils.typ");
    useEditorStore.getState().renameFile("utils.typ", "helpers.typ");
    expect(useEditorStore.getState().files["helpers.typ"]).toBe("content");
    expect(useEditorStore.getState().files["utils.typ"]).toBeUndefined();
    expect(useEditorStore.getState().activeFile).toBe("helpers.typ");
  });

  it("renameFile ignores missing file", () => {
    useEditorStore.getState().renameFile("missing.typ", "next.typ");
    expect(useEditorStore.getState().files["next.typ"]).toBeUndefined();
  });

  it("loadVersion updates source and defaults", () => {
    useEditorStore.getState().loadVersion({
      id: "ver_2",
      version_number: 2,
      source: "#set page()",
      files: { "utils.typ": "#let x = 1" },
      defaults: { foo: "bar" },
      commit_message: "Update",
      created_at: 1738377600,
    });
    expect(useEditorStore.getState().source).toBe("#set page()");
    expect(useEditorStore.getState().files["utils.typ"]).toBeDefined();
    expect(useEditorStore.getState().data.foo).toBe("bar");
  });

  it("sets error on invalid JSON", () => {
    useEditorStore.getState().setData("{");
    expect(useEditorStore.getState().dataError).toBe("Invalid JSON");
  });

  it("updates template fields and metadata setters", () => {
    const store = useEditorStore.getState();
    store.setTemplateName("New name");
    store.setTemplateDescription("New description");
    store.setActiveFile("notes.typ");
    store.setFileContent("notes.typ", "content");
    store.setRateLimitUntil(123);
    store.setReadOnly(true);
    store.setViewingVersion(2);
    store.setPublishedVersion(4);
    store.setPdfScrollTop(42);
    store.setCursorPosition(3, 7);

    const state = useEditorStore.getState();
    expect(state.templateName).toBe("New name");
    expect(state.templateDescription).toBe("New description");
    expect(state.activeFile).toBe("notes.typ");
    expect(state.files["notes.typ"]).toBe("content");
    expect(state.rateLimitUntil).toBe(123);
    expect(state.readOnly).toBe(true);
    expect(state.viewingVersion).toBe(2);
    expect(state.publishedVersion).toBe(4);
    expect(state.pdfScrollTop).toBe(42);
    expect(state.cursorPosition).toEqual({ line: 3, column: 7 });
  });

  it("updates pdf result and revokes previous url", () => {
    const createSpy = vi.spyOn(URL, "createObjectURL");
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");
    createSpy.mockReturnValueOnce("blob:first");
    createSpy.mockReturnValueOnce("blob:second");

    const blob = new Blob(["pdf"]);
    useEditorStore.getState().setPdfResult(blob, 120);
    expect(useEditorStore.getState().pdfUrl).toBe("blob:first");
    expect(useEditorStore.getState().renderStatus).toBe("success");
    expect(useEditorStore.getState().renderDuration).toBe(120);

    useEditorStore.getState().setPdfResult(blob, 50);
    expect(revokeSpy).toHaveBeenCalledWith("blob:first");
    expect(useEditorStore.getState().pdfUrl).toBe("blob:second");
  });

  it("sets render error status and clears it", () => {
    const error = { message: "Fail", file: "main.typ", line: 1, column: 1 };
    useEditorStore.getState().setRenderError(error);
    expect(useEditorStore.getState().renderStatus).toBe("error");
    useEditorStore.getState().setRenderError(null);
    expect(useEditorStore.getState().renderStatus).toBe("idle");
  });

  it("marks clean and updates last saved source", () => {
    useEditorStore.getState().setSource("new source");
    useEditorStore.getState().markClean();
    expect(useEditorStore.getState().isDirty).toBe(false);
    expect(useEditorStore.getState().lastSavedSource).toBe("new source");
  });

  it("inserts snippets and reveals errors when editor present", () => {
    const executeEdits = vi.fn();
    const focus = vi.fn();
    const revealPositionInCenter = vi.fn();
    const setPosition = vi.fn();
    const getPosition = vi.fn(() => ({ lineNumber: 2, column: 4 }));

    const editorStub = {
      getPosition,
      executeEdits,
      focus,
      revealPositionInCenter,
      setPosition,
    };
    class Range {
      constructor(
        public startLineNumber: number,
        public startColumn: number,
        public endLineNumber: number,
        public endColumn: number
      ) {}
    }

    useEditorStore.getState().setEditorInstance(editorStub as any, { Range } as any);
    useEditorStore.getState().insertSnippet("snippet");
    expect(executeEdits).toHaveBeenCalled();
    expect(focus).toHaveBeenCalled();

    useEditorStore.getState().revealError(3, 9);
    expect(revealPositionInCenter).toHaveBeenCalledWith({ lineNumber: 3, column: 9 });
    expect(setPosition).toHaveBeenCalledWith({ lineNumber: 3, column: 9 });
  });

  it("handles missing editor for snippet and reveal calls", () => {
    useEditorStore.getState().setEditorInstance(null, null);
    useEditorStore.getState().insertSnippet("snippet");
    useEditorStore.getState().revealError(1, 1);
    expect(useEditorStore.getState().editorInstance).toBeNull();
  });

  it("skips insert when cursor position is missing", () => {
    const executeEdits = vi.fn();
    const editorStub = {
      getPosition: vi.fn(() => null),
      executeEdits,
      focus: vi.fn(),
    };
    class Range {
      constructor(
        public startLineNumber: number,
        public startColumn: number,
        public endLineNumber: number,
        public endColumn: number
      ) {}
    }
    useEditorStore.getState().setEditorInstance(editorStub as any, { Range } as any);
    useEditorStore.getState().insertSnippet("snippet");
    expect(executeEdits).not.toHaveBeenCalled();
  });

  it("resets state and revokes pdf url", () => {
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");
    useEditorStore.setState({ pdfUrl: "blob:reset" });
    useEditorStore.getState().reset();
    expect(revokeSpy).toHaveBeenCalledWith("blob:reset");
    expect(useEditorStore.getState().templateId).toBeNull();
    expect(useEditorStore.getState().pdfUrl).toBeNull();
  });

  it("loads templates with missing fields", () => {
    useEditorStore.getState().loadTemplate({
      id: "tpl_2",
      name: "Empty",
      description: null,
      is_official: false,
      live_version: null,
      versions: [],
      created_at: 0,
      updated_at: 0,
    } as any);
    const state = useEditorStore.getState();
    expect(state.templateDescription).toBe("");
    expect(state.source).toBe("");
    expect(state.files).toEqual({});
    expect(state.publishedVersion).toBeNull();
  });

  it("loads versions with missing defaults and files", () => {
    useEditorStore.getState().loadVersion({
      id: "ver_3",
      version_number: 3,
      source: "",
      files: undefined,
      defaults: undefined,
      commit_message: "Empty",
      created_at: 0,
    } as any);
    const state = useEditorStore.getState();
    expect(state.data).toEqual({});
    expect(state.files).toEqual({});
  });

  it("renames files without changing active file when different", () => {
    useEditorStore.getState().addFile("utils.typ");
    useEditorStore.getState().setActiveFile("main.typ");
    useEditorStore.getState().renameFile("utils.typ", "helpers.typ");
    expect(useEditorStore.getState().activeFile).toBe("main.typ");
  });

  it("skips snippet insertion when monaco is missing", () => {
    const executeEdits = vi.fn();
    useEditorStore.getState().setEditorInstance(
      { executeEdits, getPosition: vi.fn(() => ({ lineNumber: 1, column: 1 })) } as any,
      null
    );
    useEditorStore.getState().insertSnippet("snippet");
    expect(executeEdits).not.toHaveBeenCalled();
  });
});
