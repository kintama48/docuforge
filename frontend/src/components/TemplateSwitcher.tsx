"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  CaretLeft,
  CaretRight,
  FileText,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";
import { env } from "@/src/config/env";

const SIDEBAR_STORAGE_KEY = "docuforge_sidebar_expanded";
const UNSAVED_CONFIRM_MESSAGE = "You have unsaved changes. Switch template anyway?";

export type TemplateSwitcherTemplate = {
  id: string;
  name: string;
  description?: string | null;
  slug?: string;
  previewUrl?: string | null;
};

type OfficialTemplate = {
  id: string;
  name: string;
  description: string | null;
  preview_url: string | null;
  slug: string;
};

type TemplateSwitcherProps = {
  activeTemplateId: string;
  templates: TemplateSwitcherTemplate[];
  hasUnsavedChanges: boolean;
  onSelectTemplate: (template: TemplateSwitcherTemplate) => void;
  className?: string;
};

function normalizeKey(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildCatalogKeyMap(catalog: OfficialTemplate[]): Map<string, OfficialTemplate> {
  const map = new Map<string, OfficialTemplate>();
  for (const template of catalog) {
    const keys = [
      template.id,
      template.slug,
      template.name,
      slugify(template.name),
    ];
    for (const key of keys) {
      const normalized = normalizeKey(key);
      if (normalized) map.set(normalized, template);
    }
  }
  return map;
}

function TemplateThumb({
  name,
  previewUrl,
}: {
  name: string;
  previewUrl?: string | null;
}) {
  if (previewUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={previewUrl}
        alt=""
        className="h-9 w-7 rounded-sm border border-[var(--line)] bg-white object-cover"
        loading="lazy"
      />
    );
  }

  return (
    <span
      className="flex h-9 w-7 items-center justify-center rounded-sm border border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted-dim)]"
      aria-label={`${name} placeholder preview`}
    >
      <FileText className="h-4 w-4 phosphor-icon" aria-hidden="true" />
    </span>
  );
}

export function TemplateSwitcher({
  activeTemplateId,
  templates,
  hasUnsavedChanges,
  onSelectTemplate,
  className = "",
}: TemplateSwitcherProps) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [catalog, setCatalog] = useState<OfficialTemplate[]>([]);
  const paletteInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored !== "true" && stored !== "false") return;
    const frame = window.requestAnimationFrame(() => {
      setExpanded(stored === "true");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadCatalog() {
      try {
        const response = await fetch(`${env.apiUrl}/v1/templates/official`);
        if (!response.ok) return;
        const payload = (await response.json()) as { templates?: OfficialTemplate[] };
        if (isMounted && Array.isArray(payload.templates)) {
          setCatalog(payload.templates);
        }
      } catch {
        if (isMounted) setCatalog([]);
      }
    }

    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  const catalogByKey = useMemo(() => buildCatalogKeyMap(catalog), [catalog]);

  const templatesWithCatalog = useMemo(() => {
    return templates.map((template) => {
      const catalogTemplate =
        catalogByKey.get(normalizeKey(template.slug)) ??
        catalogByKey.get(normalizeKey(template.id)) ??
        catalogByKey.get(normalizeKey(template.name)) ??
        catalogByKey.get(slugify(template.name));

      return {
        ...template,
        previewUrl: template.previewUrl ?? catalogTemplate?.preview_url ?? null,
        description: template.description ?? catalogTemplate?.description ?? null,
      };
    });
  }, [catalogByKey, templates]);

  const filteredTemplates = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return templatesWithCatalog;
    return templatesWithCatalog.filter((template) =>
      template.name.toLowerCase().includes(term)
    );
  }, [search, templatesWithCatalog]);

  const paletteTemplates = useMemo(() => {
    const term = paletteSearch.trim().toLowerCase();
    if (!term) return templatesWithCatalog;
    return templatesWithCatalog.filter((template) =>
      template.name.toLowerCase().includes(term)
    );
  }, [paletteSearch, templatesWithCatalog]);

  const closePalette = useCallback(() => {
    setPaletteOpen(false);
    setPaletteSearch("");
    setHighlightedIndex(0);
  }, []);

  const selectTemplate = useCallback(
    (template: TemplateSwitcherTemplate) => {
      if (template.id === activeTemplateId) {
        closePalette();
        return;
      }

      if (hasUnsavedChanges && !window.confirm(UNSAVED_CONFIRM_MESSAGE)) {
        return;
      }

      onSelectTemplate(template);
      closePalette();
    },
    [activeTemplateId, closePalette, hasUnsavedChanges, onSelectTemplate]
  );

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setHighlightedIndex(0);
        setPaletteOpen(true);
        return;
      }

      if (event.key === "Escape") {
        closePalette();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closePalette]);

  useEffect(() => {
    if (!paletteOpen) return;
    paletteInputRef.current?.focus();
  }, [paletteOpen]);

  const toggleExpanded = () => {
    setExpanded((previous) => {
      const next = !previous;
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  };

  const handlePaletteKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closePalette();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((previous) =>
        paletteTemplates.length === 0 ? 0 : (previous + 1) % paletteTemplates.length
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((previous) =>
        paletteTemplates.length === 0
          ? 0
          : (previous - 1 + paletteTemplates.length) % paletteTemplates.length
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const highlightedTemplate = paletteTemplates[highlightedIndex];
      if (highlightedTemplate) selectTemplate(highlightedTemplate);
    }
  };

  return (
    <>
      <aside
        className={`relative flex h-full shrink-0 flex-col overflow-visible rounded-lg border border-[var(--line)] bg-[var(--surface)] transition-[width] duration-200 ${
          expanded ? "w-[280px]" : "w-12"
        } ${className}`}
        aria-label="Template switcher"
      >
        <button
          type="button"
          onClick={toggleExpanded}
          aria-label={expanded ? "Collapse template switcher" : "Expand template switcher"}
          className="absolute -right-3 top-4 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] shadow-sm hover:text-[var(--ink)]"
        >
          {expanded ? (
            <CaretLeft className="h-3.5 w-3.5 phosphor-icon" aria-hidden="true" />
          ) : (
            <CaretRight className="h-3.5 w-3.5 phosphor-icon" aria-hidden="true" />
          )}
        </button>

        <div className="flex min-h-12 items-center border-b border-[var(--line)] px-2">
          {expanded ? (
            <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Templates
            </p>
          ) : (
            <FileText className="mx-auto h-4 w-4 text-[var(--muted)] phosphor-icon" aria-hidden="true" />
          )}
        </div>

        {expanded ? (
          <div className="border-b border-[var(--line)] p-3">
            <label className="relative block">
              <MagnifyingGlass
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-dim)] phosphor-icon"
                aria-hidden="true"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search templates"
                className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] pl-9 pr-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              />
            </label>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {expanded ? (
            <div className="flex flex-col gap-1">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => selectTemplate(template)}
                  className={`flex min-h-12 items-center gap-3 rounded-md border px-2 py-2 text-left transition ${
                    template.id === activeTemplateId
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-transparent hover:border-[var(--line)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  <TemplateThumb name={template.name} previewUrl={template.previewUrl} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[var(--ink)]">
                      {template.name}
                    </span>
                    {template.description ? (
                      <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">
                        {template.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))}
              {filteredTemplates.length === 0 ? (
                <p className="px-2 py-3 text-xs text-[var(--muted)]">No templates found.</p>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              {templatesWithCatalog.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => selectTemplate(template)}
                  title={template.name}
                  aria-label={template.name}
                  className={`flex h-9 w-8 items-center justify-center rounded-md border ${
                    template.id === activeTemplateId
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-transparent hover:border-[var(--line)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  <TemplateThumb name={template.name} previewUrl={template.previewUrl} />
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {paletteOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 px-4 pt-[18vh]"
          onMouseDown={closePalette}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Template command palette"
            className="w-full max-w-xl rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-[var(--ink)] shadow-[var(--shadow)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <label className="relative block flex-1">
                <MagnifyingGlass
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-dim)] phosphor-icon"
                  aria-hidden="true"
                />
                <input
                  ref={paletteInputRef}
                  value={paletteSearch}
                  onChange={(event) => {
                    setPaletteSearch(event.target.value);
                    setHighlightedIndex(0);
                  }}
                  onKeyDown={handlePaletteKeyDown}
                  placeholder="Search templates"
                  className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] pl-9 pr-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                />
              </label>
              <button
                type="button"
                onClick={closePalette}
                aria-label="Close template search"
                className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--ink)]"
              >
                <X className="h-4 w-4 phosphor-icon" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-3 max-h-80 overflow-y-auto">
              {paletteTemplates.map((template, index) => (
                <button
                  key={template.id}
                  type="button"
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => selectTemplate(template)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left ${
                    index === highlightedIndex
                      ? "bg-[var(--surface-active)]"
                      : "hover:bg-[var(--surface-2)]"
                  }`}
                >
                  <TemplateThumb name={template.name} previewUrl={template.previewUrl} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[var(--ink)]">
                      {template.name}
                    </span>
                    {template.description ? (
                      <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">
                        {template.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))}
              {paletteTemplates.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-[var(--muted)]">
                  No templates found.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
