"use client";

import { useMemo, useState } from "react";

const defaultTemplate = `#let payload = json.decode(sys.inputs.at("data", default: "{}"))

#set page(width: 210mm, height: 297mm, margin: 16mm)
#set text(font: "Inter", size: 10pt)

#text(size: 20pt, weight: "bold")[Invoice #payload.invoice_id]
#v(6pt)

Customer: #payload.customer\\
Amount: #payload.amount\\
Due date: #payload.due_date\\
Status: #payload.status`;

const defaultData = `{
  "invoice_id": "INV-2026-0142",
  "customer": "Aurora Labs",
  "amount": "$1,240.00",
  "due_date": "2026-03-01",
  "status": "Pending"
}`;

function extractFields(template: string) {
  const matches = template.match(/payload\.([a-zA-Z0-9_]+)/g) || [];
  return Array.from(new Set(matches.map((item) => item.replace("payload.", ""))));
}

export function PlaygroundClient() {
  const [template, setTemplate] = useState(defaultTemplate);
  const [jsonText, setJsonText] = useState(defaultData);

  const { parsedData, error } = useMemo(() => {
    try {
      return {
        parsedData: JSON.parse(jsonText) as Record<string, string>,
        error: "",
      };
    } catch {
      return {
        parsedData: {},
        error: "JSON is invalid. Fix syntax to see a reliable preview mapping.",
      };
    }
  }, [jsonText]);

  const mappedLines = useMemo(() => {
    const fields = extractFields(template);
    return fields.map((field) => ({
      field,
      value: parsedData[field] ?? "(missing)",
    }));
  }, [template, parsedData]);

  const curlSnippet = useMemo(() => {
    return `curl -X POST "$DOCUFORGE_API_URL/v1/render" \\
  -H "X-API-Key: $DOCUFORGE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "template_id": "tmpl_invoice",
    "data": ${jsonText.replace(/\n/g, "\n    ")}
  }' \\
  --output invoice.pdf`;
  }, [jsonText]);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
        <h2 className="font-display text-2xl text-[var(--ink)]">Template editor</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Draft Typst template code and validate your dynamic fields before sending production API requests.
        </p>
        <textarea
          value={template}
          onChange={(event) => setTemplate(event.target.value)}
          className="mt-4 h-80 w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono text-xs text-[var(--ink)]"
        />
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
        <h2 className="font-display text-2xl text-[var(--ink)]">Data payload</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Paste JSON payload data. This preview panel maps every <code>payload.field</code> reference in your template.
        </p>
        <textarea
          value={jsonText}
          onChange={(event) => setJsonText(event.target.value)}
          className="mt-4 h-80 w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono text-xs text-[var(--ink)]"
        />
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
        <h2 className="font-display text-2xl text-[var(--ink)]">Live field preview</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Quick sanity check before real rendering. Missing fields are highlighted.
        </p>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {mappedLines.map((entry) => (
              <li
                key={entry.field}
                className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
              >
                <span className="font-mono text-[var(--ink)]">payload.{entry.field}</span>
                <span className={entry.value === "(missing)" ? "text-red-600" : "text-[var(--muted)]"}>
                  {entry.value}
                </span>
              </li>
            ))}
            {mappedLines.length === 0 && (
              <li className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-[var(--muted)]">
                No payload fields detected yet.
              </li>
            )}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
        <h2 className="font-display text-2xl text-[var(--ink)]">Ready-to-run API call</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Use this in your backend worker. For full rendering, create an account and use a real template ID.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4 text-xs text-[var(--ink)]">
          <code>{curlSnippet}</code>
        </pre>
      </section>
    </div>
  );
}
