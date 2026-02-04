import { describe, expect, it, beforeEach } from "vitest";
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
});
