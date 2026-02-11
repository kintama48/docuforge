import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { useEffect } from "react";
import { render, act, waitFor } from "@testing-library/react";
import { useMonacoFormatting } from "@/src/hooks/use-monaco-formatting";

type SelectionRange = {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  getStartPosition: () => { lineNumber: number; column: number };
  getEndPosition: () => { lineNumber: number; column: number };
  isEmpty: () => boolean;
};

let currentEditor: any;
let currentMonaco: any;

vi.mock("@/src/stores/editor", () => ({
  useEditorStore: (selector: any) =>
    selector({ editorInstance: currentEditor, monacoInstance: currentMonaco }),
}));

function createSelection(startColumn: number, endColumn: number): SelectionRange {
  return {
    startLineNumber: 1,
    endLineNumber: 1,
    startColumn,
    endColumn,
    getStartPosition: () => ({ lineNumber: 1, column: startColumn }),
    getEndPosition: () => ({ lineNumber: 1, column: endColumn }),
    isEmpty: () => startColumn === endColumn,
  };
}

function createModel(text: string) {
  return {
    getValueInRange: (range: SelectionRange) => {
      const startIndex = range.startColumn - 1;
      const endIndex = range.endColumn - 1;
      return text.slice(startIndex, endIndex);
    },
    getLineContent: () => text,
  };
}

function createLineModel(lineContent: string, text = lineContent) {
  return {
    getValueInRange: (range: SelectionRange) => {
      const startIndex = range.startColumn - 1;
      const endIndex = range.endColumn - 1;
      return text.slice(startIndex, endIndex);
    },
    getLineContent: () => lineContent,
  };
}

function createMonacoStub() {
  class Range {
    constructor(
      public startLineNumber: number,
      public startColumn: number,
      public endLineNumber: number,
      public endColumn: number
    ) {}
  }
  class Selection {
    constructor(
      public startLineNumber: number,
      public startColumn: number,
      public endLineNumber: number,
      public endColumn: number
    ) {}
  }
  return {
    Range,
    Selection,
    KeyMod: { CtrlCmd: 1 },
    KeyCode: { KeyB: 2, KeyI: 3, KeyK: 4 },
  };
}

function renderHook() {
  let hookApi: ReturnType<typeof useMonacoFormatting> | null = null;
  const Harness = ({ onReady }: { onReady: (api: any) => void }) => {
    const api = useMonacoFormatting();
    useEffect(() => {
      onReady(api);
    }, [api, onReady]);
    return null;
  };
  render(<Harness onReady={(api) => (hookApi = api)} />);
  if (!hookApi) {
    throw new Error("Hook not initialized");
  }
  return hookApi;
}

function renderHookWithRerender() {
  const Harness = () => {
    useMonacoFormatting();
    return null;
  };
  return { Harness, ...render(<Harness />) };
}

describe("useMonacoFormatting", () => {
  let edits: any[];

  beforeEach(() => {
    edits = [];
    const model = createModel("Hello");
    const selection = createSelection(1, 6);

    currentMonaco = createMonacoStub();
    currentEditor = {
      getModel: () => model,
      getSelection: () => selection,
      pushUndoStop: vi.fn(),
      executeEdits: vi.fn((_source: string, nextEdits: any[]) => {
        edits.push(...nextEdits);
      }),
      setSelection: vi.fn(),
      focus: vi.fn(),
      addCommand: vi.fn(),
    };
  });

  it("wraps selection with bold markers", () => {
    const api = renderHook();
    act(() => {
      api.applyAction("bold");
    });

    expect(edits[0].text).toBe("*Hello*");
    expect(currentEditor.addCommand).toHaveBeenCalledTimes(3);
  });

  it("toggles heading prefix", () => {
    const api = renderHook();
    act(() => {
      api.applyAction("h1");
    });
    expect(edits[0].text).toBe("= ");
  });

  it("unwraps already wrapped text", () => {
    const model = createModel("*Hello*");
    const selection = createSelection(1, 8);
    currentEditor.getModel = () => model;
    currentEditor.getSelection = () => selection;

    const api = renderHook();
    act(() => {
      api.applyAction("bold");
    });

    expect(edits[0].text).toBe("Hello");
  });

  it("removes prefix and suffix when selection is inside wrapper", () => {
    const model = createModel("*Hello*");
    const selection = createSelection(2, 7);
    currentEditor.getModel = () => model;
    currentEditor.getSelection = () => selection;

    const api = renderHook();
    act(() => {
      api.applyAction("bold");
    });

    expect(edits[0].text).toBe("Hello");
  });

  it("inserts a link snippet and selects url", () => {
    const api = renderHook();
    act(() => {
      api.applyAction("link");
    });
    expect(edits[0].text).toContain("#link(\"url\")");
    expect(currentEditor.setSelection).toHaveBeenCalled();
  });

  it("toggles alternate line prefixes", () => {
    const model = createLineModel("== Heading");
    const selection = createSelection(1, 12);
    currentEditor.getModel = () => model;
    currentEditor.getSelection = () => selection;

    const api = renderHook();
    act(() => {
      api.applyAction("h1");
    });

    expect(edits[0].text).toBe("= ");
  });

  it("removes existing bullet prefix", () => {
    const model = createLineModel("- Item");
    const selection = createSelection(1, 7);
    currentEditor.getModel = () => model;
    currentEditor.getSelection = () => selection;

    const api = renderHook();
    act(() => {
      api.applyAction("bullet");
    });

    expect(edits[0].text).toBe("");
  });

  it("inserts image and table snippets", () => {
    const api = renderHook();
    act(() => {
      api.applyAction("image");
    });
    expect(edits[0].text).toContain('#image("file")');

    edits.length = 0;
    act(() => {
      api.applyAction("table");
    });
    expect(edits[0].text).toContain("#table(");
  });

  it("handles remaining actions", () => {
    const api = renderHook();
    act(() => {
      api.applyAction("italic");
      api.applyAction("underline");
      api.applyAction("strike");
      api.applyAction("h2");
      api.applyAction("number");
    });
    expect(edits.length).toBeGreaterThan(0);
  });

  it("wraps non-empty selection as code block", () => {
    const model = createModel("Hello");
    const selection = createSelection(1, 6);
    currentEditor.getModel = () => model;
    currentEditor.getSelection = () => selection;

    const api = renderHook();
    act(() => {
      api.applyAction("code");
    });

    expect(edits[0].text).toContain("```\nHello\n```");
  });

  it("handles unsupported action without edits", () => {
    const api = renderHook();
    const initialEdits = edits.length;
    act(() => {
      api.applyAction("unknown" as any);
    });
    expect(edits.length).toBe(initialEdits);
  });

  it("returns not ready when editor missing", () => {
    currentEditor = null;
    const api = renderHook();
    expect(api.ready).toBe(false);
  });

  it("inserts a code block when selection is empty", () => {
    const model = createModel("");
    const selection = createSelection(1, 1);
    currentEditor.getModel = () => model;
    currentEditor.getSelection = () => selection;

    const api = renderHook();
    act(() => {
      api.applyAction("code");
    });

    expect(edits[0].text).toBe("```\n\n```");
  });

  it("wraps an empty selection with inline markers", () => {
    const selection = createSelection(3, 3);
    currentEditor.getSelection = () => selection;

    const api = renderHook();
    act(() => {
      api.applyAction("bold");
    });

    expect(edits[0].text).toBe("**");
  });

  it("uses fallback empty check when selection lacks isEmpty", () => {
    const selection = {
      startLineNumber: 1,
      startColumn: 2,
      endLineNumber: 1,
      endColumn: 2,
      getStartPosition: () => ({ lineNumber: 1, column: 2 }),
      getEndPosition: () => ({ lineNumber: 1, column: 2 }),
    };
    currentEditor.getSelection = () => selection as any;
    currentEditor.getModel = () => createModel("Hello");

    const api = renderHook();
    act(() => {
      api.applyAction("bold");
    });

    expect(edits[0].text).toBe("**");
  });

  it("falls back to selection coordinates when helpers are missing", () => {
    const selection = {
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 1,
    };
    currentEditor.getSelection = () => selection as any;

    const api = renderHook();
    act(() => {
      api.applyAction("image");
    });

    expect(currentEditor.setSelection).toHaveBeenCalled();
  });

  it("skips actions when model or selection is missing", () => {
    currentEditor.getSelection = () => null;
    const api = renderHook();
    act(() => {
      api.applyAction("link");
    });
    expect(edits.length).toBe(0);

    currentEditor.getSelection = () => createSelection(1, 2);
    currentEditor.getModel = () => null;
    act(() => {
      api.applyAction("bold");
    });
    expect(edits.length).toBe(0);
  });

  it("skips snippet insertion when selection is missing", () => {
    currentEditor.getSelection = () => null;
    const api = renderHook();
    act(() => {
      api.applyAction("image");
    });
    expect(edits.length).toBe(0);
  });

  it("executes registered command callbacks", async () => {
    const callbacks: Array<() => void> = [];
    currentEditor.addCommand = vi.fn((_key: number, cb: () => void) => {
      callbacks.push(cb);
      return { dispose: vi.fn() };
    });

    renderHook();
    await waitFor(() => expect(callbacks.length).toBe(3));
    callbacks.forEach((cb) => cb());
    expect(edits.length).toBeGreaterThan(0);
  });

  it("does not register commands when editor instance is unchanged", async () => {
    const addCommand = vi.fn(() => ({ dispose: vi.fn() }));
    currentEditor.addCommand = addCommand;
    const { rerender, Harness } = renderHookWithRerender();

    currentMonaco = createMonacoStub();
    rerender(<Harness />);

    await waitFor(() => expect(addCommand).toHaveBeenCalledTimes(3));
  });

  it("disposes commands when editor changes", () => {
    const disposers = [vi.fn(), vi.fn(), vi.fn()];
    const initialDisposers = [...disposers];
    currentEditor.addCommand = vi.fn(() => ({
      dispose: disposers.shift() ?? vi.fn(),
    }));

    const { rerender, unmount, Harness } = renderHookWithRerender();
    expect(currentEditor.addCommand).toHaveBeenCalledTimes(3);

    const nextDisposers = [vi.fn(), vi.fn(), vi.fn()];
    currentEditor = {
      ...currentEditor,
      addCommand: vi.fn(() => ({
        dispose: nextDisposers.shift() ?? vi.fn(),
      })),
    };

    rerender(<Harness />);
    unmount();

    initialDisposers.forEach((fn) => {
      expect(fn).toHaveBeenCalled();
    });
  });
});
