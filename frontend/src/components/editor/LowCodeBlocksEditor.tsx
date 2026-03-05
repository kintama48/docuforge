"use client";

import { useMemo, useState } from "react";
import {
  cloneLowCodeSpec,
  createLowCodeBlock,
  LOW_CODE_BLOCK_TYPE_OPTIONS,
  type LowCodeSpec,
  type LowCodeTableColumn,
} from "@/src/lib/low-code";

const TABLE_COLUMNS: LowCodeTableColumn[] = ["name", "description", "qty", "price", "total"];

function updateSpec(spec: LowCodeSpec, updater: (draft: LowCodeSpec) => void): LowCodeSpec {
  const draft = cloneLowCodeSpec(spec);
  updater(draft);
  return draft;
}

type LowCodeBlocksEditorProps = {
  lowCodeSpec: LowCodeSpec | null;
  onChange: (spec: LowCodeSpec) => void;
  className?: string;
  title?: string;
  unavailableMessage?: string;
};

export function LowCodeBlocksEditor({
  lowCodeSpec,
  onChange,
  className,
  title = "Blocks",
  unavailableMessage = "Blocks are not available for this template.",
}: LowCodeBlocksEditorProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const safeSelectedIndex = useMemo(() => {
    if (!lowCodeSpec) return 0;
    return Math.max(0, Math.min(selectedIndex, lowCodeSpec.blocks.length - 1));
  }, [lowCodeSpec, selectedIndex]);

  const selectedBlock = useMemo(() => {
    if (!lowCodeSpec) return null;
    return lowCodeSpec.blocks[safeSelectedIndex] ?? null;
  }, [lowCodeSpec, safeSelectedIndex]);

  if (!lowCodeSpec) {
    return (
      <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 text-xs text-[var(--muted)]">
        {unavailableMessage}
      </div>
    );
  }

  const apply = (updater: (draft: LowCodeSpec) => void) => {
    onChange(updateSpec(lowCodeSpec, updater));
  };

  const addBlock = (type: (typeof LOW_CODE_BLOCK_TYPE_OPTIONS)[number]["type"]) => {
    apply((draft) => {
      draft.blocks.push(createLowCodeBlock(type));
    });
    setSelectedIndex(lowCodeSpec.blocks.length);
  };

  const removeSelected = () => {
    if (lowCodeSpec.blocks.length <= 1) return;
    apply((draft) => {
      draft.blocks.splice(safeSelectedIndex, 1);
    });
    setSelectedIndex((current) => Math.max(0, Math.min(current - 1, lowCodeSpec.blocks.length - 2)));
  };

  const moveSelected = (direction: -1 | 1) => {
    const targetIndex = safeSelectedIndex + direction;
    if (targetIndex < 0 || targetIndex >= lowCodeSpec.blocks.length) return;
    apply((draft) => {
      const current = draft.blocks[safeSelectedIndex];
      const target = draft.blocks[targetIndex];
      if (!current || !target) return;
      draft.blocks[safeSelectedIndex] = target;
      draft.blocks[targetIndex] = current;
    });
    setSelectedIndex(targetIndex);
  };

  const updateSelected = (updater: (draft: LowCodeSpec["blocks"][number]) => void) => {
    apply((draft) => {
      const block = draft.blocks[safeSelectedIndex];
      if (!block) return;
      updater(block);
    });
  };

  return (
    <div
      className={[
        "flex h-full flex-col gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-dim)]">{title}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {LOW_CODE_BLOCK_TYPE_OPTIONS.map((option) => (
          <button
            key={option.type}
            type="button"
            onClick={() => addBlock(option.type)}
            className="rounded-md border border-[var(--line)] px-2 py-1 text-xs text-[var(--ink)] hover:border-[var(--line-hover)]"
          >
            + {option.label}
          </button>
        ))}
      </div>

      <div className="grid max-h-40 gap-2 overflow-y-auto pr-1">
        {lowCodeSpec.blocks.map((block, index) => (
          <button
            key={`${block.type}-${index}`}
            type="button"
            onClick={() => setSelectedIndex(index)}
            className={`rounded-md border px-2 py-2 text-left text-xs ${
              safeSelectedIndex === index
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]"
                : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-hover)] hover:text-[var(--ink)]"
            }`}
          >
            {index + 1}. {block.type.replaceAll("_", " ")}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => moveSelected(-1)}
          disabled={safeSelectedIndex === 0}
          className="rounded-md border border-[var(--line)] px-2 py-1 text-xs text-[var(--ink)] disabled:opacity-50"
        >
          Move up
        </button>
        <button
          type="button"
          onClick={() => moveSelected(1)}
          disabled={safeSelectedIndex === lowCodeSpec.blocks.length - 1}
          className="rounded-md border border-[var(--line)] px-2 py-1 text-xs text-[var(--ink)] disabled:opacity-50"
        >
          Move down
        </button>
        <button
          type="button"
          onClick={removeSelected}
          disabled={lowCodeSpec.blocks.length <= 1}
          className="rounded-md border border-[var(--line)] px-2 py-1 text-xs text-[var(--bad)] disabled:opacity-50"
        >
          Remove block
        </button>
      </div>

      {selectedBlock ? (
        <div className="space-y-3 rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3">
          <p className="text-xs font-semibold text-[var(--ink)]">
            Edit {selectedBlock.type.replaceAll("_", " ")}
          </p>

          {selectedBlock.type === "header" ? (
            <>
              <label className="block text-xs text-[var(--muted)]">
                Title
                <input
                  value={selectedBlock.props.title}
                  onChange={(event) =>
                    updateSelected((block) => {
                      if (block.type !== "header") return;
                      block.props.title = event.target.value;
                    })
                  }
                  className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-2 text-xs text-[var(--ink)]"
                />
              </label>
              <label className="block text-xs text-[var(--muted)]">
                Subtitle
                <input
                  value={selectedBlock.props.subtitle ?? ""}
                  onChange={(event) =>
                    updateSelected((block) => {
                      if (block.type !== "header") return;
                      block.props.subtitle = event.target.value || undefined;
                    })
                  }
                  className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-2 text-xs text-[var(--ink)]"
                />
              </label>
              <label className="block text-xs text-[var(--muted)]">
                Align
                <select
                  value={selectedBlock.props.align ?? "left"}
                  onChange={(event) =>
                    updateSelected((block) => {
                      if (block.type !== "header") return;
                      block.props.align = event.target.value as "left" | "center" | "right";
                    })
                  }
                  className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-2 text-xs text-[var(--ink)]"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </label>
            </>
          ) : null}

          {selectedBlock.type === "paragraph" ? (
            <label className="block text-xs text-[var(--muted)]">
              Text
              <textarea
                value={selectedBlock.props.text}
                onChange={(event) =>
                  updateSelected((block) => {
                    if (block.type !== "paragraph") return;
                    block.props.text = event.target.value;
                  })
                }
                rows={5}
                className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-2 text-xs text-[var(--ink)]"
              />
            </label>
          ) : null}

          {selectedBlock.type === "divider" ? (
            <p className="text-xs text-[var(--muted)]">Divider has no configurable properties.</p>
          ) : null}

          {selectedBlock.type === "line_items_table" ? (
            <>
              <label className="block text-xs text-[var(--muted)]">
                Title
                <input
                  value={selectedBlock.props.title ?? ""}
                  onChange={(event) =>
                    updateSelected((block) => {
                      if (block.type !== "line_items_table") return;
                      block.props.title = event.target.value || undefined;
                    })
                  }
                  className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-2 text-xs text-[var(--ink)]"
                />
              </label>
              <label className="block text-xs text-[var(--muted)]">
                Items path
                <input
                  value={selectedBlock.props.items_path ?? "items"}
                  onChange={(event) =>
                    updateSelected((block) => {
                      if (block.type !== "line_items_table") return;
                      block.props.items_path = event.target.value;
                    })
                  }
                  className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-2 text-xs text-[var(--ink)]"
                />
              </label>
              <div>
                <p className="text-xs text-[var(--muted)]">Columns</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {TABLE_COLUMNS.map((column) => {
                    const currentColumns =
                      selectedBlock.props.columns ?? ["name", "qty", "price", "total"];
                    const checked = currentColumns.includes(column);
                    const disableToggleOff = checked && currentColumns.length <= 1;
                    return (
                      <label key={column} className="flex items-center gap-2 text-xs text-[var(--ink)]">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disableToggleOff}
                          onChange={(event) =>
                            updateSelected((block) => {
                              if (block.type !== "line_items_table") return;
                              const existing = block.props.columns ?? ["name", "qty", "price", "total"];
                              const next = new Set(existing);
                              if (event.target.checked) {
                                next.add(column);
                              } else {
                                next.delete(column);
                              }
                              block.props.columns = Array.from(next) as LowCodeTableColumn[];
                            })
                          }
                        />
                        <span className="capitalize">{column}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
