"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/src/components/ui/Modal";

type ImageExportDialogProps = {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onExport: (payload: {
    format: "png" | "jpeg";
    dpi: number;
    quality?: number;
    page_numbers?: number[];
  }) => void;
};

function parsePageNumbers(raw: string): number[] | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const values = trimmed
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((num) => Number.isInteger(num) && num > 0);

  if (values.length === 0) return undefined;
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

export function ImageExportDialog({
  open,
  pending,
  onClose,
  onExport,
}: ImageExportDialogProps) {
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [dpi, setDpi] = useState(150);
  const [quality, setQuality] = useState(90);
  const [pagesInput, setPagesInput] = useState("");

  const parsedPages = useMemo(() => parsePageNumbers(pagesInput), [pagesInput]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export template as images"
    >
      <div className="grid gap-4 text-sm text-[var(--ink)]">
        <div className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3 text-xs text-[var(--muted)]">
          <p className="font-semibold text-[var(--ink)]">Flow</p>
          <p className="mt-1">1. Pick output settings.</p>
          <p>2. Export selected pages.</p>
          <p>3. Download image file(s) instantly.</p>
        </div>

        <label className="text-xs text-[var(--muted)]">
          Format
          <select
            value={format}
            onChange={(event) => setFormat(event.target.value as "png" | "jpeg")}
            className="mt-2 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--ink)]"
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
          </select>
        </label>

        <label className="text-xs text-[var(--muted)]">
          DPI
          <select
            value={String(dpi)}
            onChange={(event) => setDpi(Number(event.target.value))}
            className="mt-2 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--ink)]"
          >
            <option value="72">72</option>
            <option value="150">150</option>
            <option value="300">300</option>
          </select>
        </label>

        {format === "jpeg" ? (
          <label className="text-xs text-[var(--muted)]">
            JPEG quality
            <input
              type="number"
              min={1}
              max={100}
              value={quality}
              onChange={(event) => setQuality(Number(event.target.value))}
              className="mt-2 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--ink)]"
            />
          </label>
        ) : null}

        <label className="text-xs text-[var(--muted)]">
          Pages (optional, comma-separated)
          <input
            value={pagesInput}
            onChange={(event) => setPagesInput(event.target.value)}
            placeholder="Example: 1,2,3"
            className="mt-2 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--ink)]"
          />
          <span className="mt-1 block text-[11px] text-[var(--muted-dim)]">
            Leave empty to export every page.
          </span>
        </label>

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--line)] px-3 py-2 text-xs text-[var(--ink)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              onExport({
                format,
                dpi,
                quality: format === "jpeg" ? quality : undefined,
                page_numbers: parsedPages,
              })
            }
            disabled={pending}
            className="rounded-md bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
          >
            {pending ? "Exporting..." : "Export images"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

