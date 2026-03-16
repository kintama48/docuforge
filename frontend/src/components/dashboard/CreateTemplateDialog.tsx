"use client";

import { useState } from "react";
import { Modal } from "@/src/components/ui/Modal";
import {
  useAnalyzePdfImport,
  useCreateImportedTemplate,
  useCreateTemplate,
  useForkTemplate,
  useTemplates,
} from "@/src/hooks/use-templates";
import { DEFAULT_TEMPLATE_DEFAULTS, DEFAULT_TEMPLATE_SOURCE } from "@/src/lib/template-defaults";
import { getGuidedTemplatePreset, listGuidedTemplatePresets } from "@/src/lib/low-code";
import { useI18n } from "@/src/lib/i18n";

type CreateTemplateDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function CreateTemplateDialog({
  open,
  onClose,
}: CreateTemplateDialogProps) {
  const { messages } = useI18n();
  const [mode, setMode] = useState<"starter" | "import">("starter");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [starterId, setStarterId] = useState("blank");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [importPrompt, setImportPrompt] = useState("");
  const [importedSource, setImportedSource] = useState("");
  const [importPreview, setImportPreview] = useState("");
  const { data } = useTemplates(true);
  const createTemplate = useCreateTemplate();
  const forkTemplate = useForkTemplate();
  const analyzePdfImport = useAnalyzePdfImport();
  const createImportedTemplate = useCreateImportedTemplate();
  const guidedPresets = listGuidedTemplatePresets();

  const officialTemplates =
    data?.templates?.filter((template) => template.is_official) || [];

  const resetImportState = () => {
    setPdfFile(null);
    setImportPrompt("");
    setImportedSource("");
    setImportPreview("");
  };

  const resetAll = () => {
    setMode("starter");
    setName("");
    setDescription("");
    setStarterId("blank");
    resetImportState();
  };

  const closeAndReset = () => {
    resetAll();
    onClose();
  };

  const toBase64 = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (const value of bytes) {
      binary += String.fromCharCode(value);
    }
    return btoa(binary);
  };

  return (
    <Modal open={open} onClose={closeAndReset} title={messages.templateDialog.title}>
      <div className="inline-flex rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-1">
        <button
          type="button"
          onClick={() => setMode("starter")}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
            mode === "starter"
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--muted)]"
          }`}
        >
          Starter
        </button>
        <button
          type="button"
          onClick={() => setMode("import")}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
            mode === "import"
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--muted)]"
          }`}
        >
          Import PDF
        </button>
      </div>

      <label className="mt-4 text-xs text-[var(--muted)]">
        {messages.templateDialog.nameLabel}
      </label>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="mt-2 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--ink)]"
        placeholder={messages.templateDialog.namePlaceholder}
      />

      <label className="mt-4 text-xs text-[var(--muted)]">
        {messages.templateDialog.descriptionLabel}
      </label>
      <input
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        className="mt-2 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--ink)]"
        placeholder={messages.templateDialog.descriptionPlaceholder}
      />

      {mode === "starter" ? (
        <>
          <label className="mt-4 text-xs text-[var(--muted)]">
            {messages.templateDialog.startFromLabel}
          </label>
          <select
            value={starterId}
            onChange={(event) => setStarterId(event.target.value)}
            className="mt-2 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--ink)]"
          >
            <option value="blank">{messages.templateDialog.blankOption}</option>
            {guidedPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {`Guided: ${preset.name}`}
              </option>
            ))}
            {officialTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {`${messages.templateCard.officialBadge}: ${template.name}`}
              </option>
            ))}
          </select>
        </>
      ) : (
        <div className="mt-4 grid gap-3">
          <div className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3 text-xs text-[var(--muted)]">
            <p className="font-semibold text-[var(--ink)]">Import flow</p>
            <p className="mt-1">1. Upload PDF + optional guidance.</p>
            <p>2. Analyze with AI (consumes 1 AI credit).</p>
            <p>3. Review/edit generated Typst and create draft.</p>
          </div>

          <label className="text-xs text-[var(--muted)]">
            PDF file
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setPdfFile(file);
              }}
              className="mt-2 block w-full text-xs text-[var(--muted)]"
            />
          </label>

          <label className="text-xs text-[var(--muted)]">
            Optional guidance for AI
            <textarea
              value={importPrompt}
              onChange={(event) => setImportPrompt(event.target.value)}
              className="mt-2 h-20 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3 text-xs text-[var(--ink)]"
              placeholder="Example: Keep total section aligned right; preserve table-like line items."
            />
          </label>

          <button
            type="button"
            onClick={async () => {
              if (!pdfFile) return;
              const pdfBase64 = await toBase64(pdfFile);
              analyzePdfImport.mutate(
                {
                  file_name: pdfFile.name,
                  pdf_base64: pdfBase64,
                  user_prompt: importPrompt.trim(),
                },
                {
                  onSuccess: (result) => {
                    setImportedSource(result.analysis.source);
                    setImportPreview(result.analysis.extracted_text_preview);
                  },
                }
              );
            }}
            disabled={!pdfFile || analyzePdfImport.isPending}
            className="justify-self-start rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--ink)] disabled:opacity-60"
          >
            {analyzePdfImport.isPending ? "Analyzing..." : "Analyze PDF (1 AI credit)"}
          </button>

          {importPreview ? (
            <div className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3">
              <p className="text-xs font-semibold text-[var(--ink)]">Converter preview</p>
              <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-[11px] text-[var(--muted)]">
                {importPreview}
              </pre>
            </div>
          ) : null}

          {importedSource ? (
            <label className="text-xs text-[var(--muted)]">
              Generated Typst draft (editable before create)
              <textarea
                value={importedSource}
                onChange={(event) => setImportedSource(event.target.value)}
                className="mt-2 h-56 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono text-xs text-[var(--ink)]"
              />
            </label>
          ) : null}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={closeAndReset}
          className="rounded-md border border-[var(--line)] px-3 py-2 text-xs text-[var(--ink)]"
        >
          {messages.templateDialog.cancel}
        </button>
        <button
          onClick={() => {
            const trimmedName = name.trim();
            const trimmedDescription = description.trim();
            if (!trimmedName) return;

            if (mode === "import") {
              if (!importedSource.trim()) return;
              createImportedTemplate.mutate(
                {
                  name: trimmedName,
                  description: trimmedDescription || undefined,
                  source: importedSource,
                  commit_message: "Imported from PDF",
                },
                { onSuccess: closeAndReset }
              );
              return;
            }

            const normalizedDescription = trimmedDescription || null;
            if (starterId === "blank") {
              createTemplate.mutate(
                {
                  name: trimmedName,
                  description: normalizedDescription,
                  source: DEFAULT_TEMPLATE_SOURCE,
                  defaults: DEFAULT_TEMPLATE_DEFAULTS,
                  files: {},
                },
                { onSuccess: closeAndReset }
              );
            } else if (starterId.startsWith("guided-")) {
              const preset = getGuidedTemplatePreset(starterId);
              if (!preset) return;
              createTemplate.mutate(
                {
                  name: trimmedName,
                  description: normalizedDescription,
                  low_code_spec: preset.spec,
                },
                { onSuccess: closeAndReset }
              );
            } else {
              forkTemplate.mutate(
                { id: starterId, name: trimmedName },
                { onSuccess: closeAndReset }
              );
            }
          }}
          disabled={
            !name.trim() ||
            createTemplate.isPending ||
            forkTemplate.isPending ||
            createImportedTemplate.isPending ||
            (mode === "import" && !importedSource.trim())
          }
          className="rounded-md bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
        >
          {createTemplate.isPending || forkTemplate.isPending || createImportedTemplate.isPending
            ? messages.templateDialog.creating
            : mode === "import"
              ? "Create imported draft"
              : messages.templateDialog.create}
        </button>
      </div>
    </Modal>
  );
}
