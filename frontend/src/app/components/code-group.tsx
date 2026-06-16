"use client";

import { Check, ClipboardText } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import type { ContentCodeSnippet } from "@/src/lib/content-hub";

export function ContentCodeGroup({
  title,
  description,
  snippets,
}: {
  title: string;
  description?: string;
  snippets: ContentCodeSnippet[];
}) {
  const [activeLabel, setActiveLabel] = useState(snippets[0]?.label ?? "");
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const activeSnippet = useMemo(
    () => snippets.find((snippet) => snippet.label === activeLabel) ?? snippets[0],
    [activeLabel, snippets]
  );

  if (!activeSnippet) return null;

  const copyCode = async () => {
    await navigator.clipboard?.writeText(activeSnippet.code);
    setCopiedLabel(activeSnippet.label);
    window.setTimeout(() => setCopiedLabel(null), 1500);
  };

  return (
    <section>
      <div className="mb-4">
        <h2 className="font-display text-2xl text-[var(--ink)]">{title}</h2>
        {description ? <p className="mt-2 text-sm text-[var(--muted)]">{description}</p> : null}
      </div>
      <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface-2)] px-3 py-2">
          <div
            role="tablist"
            aria-label={title}
            className="flex min-w-0 flex-1 gap-1 overflow-x-auto"
          >
            {snippets.map((snippet) => {
              const active = snippet.label === activeSnippet.label;
              return (
                <button
                  key={snippet.label}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`relative shrink-0 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-[var(--surface)] text-[var(--ink)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                  }`}
                  onClick={() => setActiveLabel(snippet.label)}
                >
                  {snippet.label}
                  {active ? (
                    <span className="absolute inset-x-2 -bottom-2 h-0.5 rounded-full bg-[var(--accent)]" />
                  ) : null}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={copyCode}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] transition hover:text-[var(--ink)]"
            aria-label={`Copy ${activeSnippet.label} code`}
          >
            {copiedLabel === activeSnippet.label ? (
              <Check className="phosphor-icon h-4 w-4 text-[var(--good)]" aria-hidden="true" />
            ) : (
              <ClipboardText className="phosphor-icon h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        <pre className="max-h-[26rem] min-h-[18rem] overflow-auto bg-[var(--surface)] p-4 text-xs leading-5 text-[var(--ink)]">
          <code className={`language-${activeSnippet.language}`}>{activeSnippet.code}</code>
        </pre>
      </div>
    </section>
  );
}
