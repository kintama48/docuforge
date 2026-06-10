"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { env } from "@/src/config/env";

// ---------------------------------------------------------------------------
// Invoice template source — BYOT approach (approach a).
// The Typst source is inlined here so no new backend endpoint is required.
// This file is the single source of truth; the matching file lives at
// api/templates/invoice/main.typ.
// ---------------------------------------------------------------------------

const INVOICE_TYPST_SOURCE = `#set page(paper: "a4", margin: (x: 2cm, y: 2cm))
#set text(font: "Inter", size: 10pt)

#let data = sys.inputs

// Header
#grid(
  columns: (1fr, 1fr),
  align: (left, right),
  [
    #text(size: 24pt, weight: "bold", fill: rgb("#1a1a2e"))[INVOICE]
    #v(0.5em)
    #text(size: 11pt, fill: rgb("#666"))[\\##data.at("invoice_id", default: "INV-001")]
  ],
  [
    #align(right)[
      #text(weight: "semibold")[#data.at("company_name", default: "Your Company")]
      #linebreak()
      #text(size: 9pt, fill: rgb("#666"))[
        #data.at("company_address", default: "123 Business St")
        #linebreak()
        #data.at("company_city", default: "City, State 12345")
        #linebreak()
        #data.at("company_email", default: "hello@company.com")
      ]
    ]
  ]
)

#v(1.5em)
#line(length: 100%, stroke: 0.5pt + rgb("#e0e0e0"))
#v(1em)

// Bill To
#grid(
  columns: (1fr, 1fr),
  [
    #text(size: 9pt, fill: rgb("#666"), weight: "semibold")[BILL TO]
    #v(0.3em)
    #text(weight: "semibold")[#data.at("customer_name", default: "Customer Name")]
    #linebreak()
    #text(size: 9pt, fill: rgb("#666"))[
      #data.at("customer_address", default: "456 Client Ave")
      #linebreak()
      #data.at("customer_city", default: "City, State 67890")
    ]
  ],
  [
    #align(right)[
      #grid(
        columns: (auto, auto),
        column-gutter: 1em,
        row-gutter: 0.3em,
        align: (right, left),
        text(size: 9pt, fill: rgb("#666"))[Invoice Date:], text(size: 9pt)[#data.at("invoice_date", default: "2024-01-15")],
        text(size: 9pt, fill: rgb("#666"))[Due Date:], text(size: 9pt)[#data.at("due_date", default: "2024-02-15")],
        text(size: 9pt, fill: rgb("#666"))[Payment Terms:], text(size: 9pt)[#data.at("payment_terms", default: "Net 30")],
      )
    ]
  ]
)

#v(2em)

// Items table
#let items = data.at("items", default: ((description: "Service", qty: 1, price: 100.00),))

#table(
  columns: (1fr, auto, auto, auto),
  stroke: none,
  inset: (x: 0.5em, y: 0.7em),

  // Header
  table.cell(fill: rgb("#f5f5f5"))[#text(size: 9pt, weight: "semibold")[Description]],
  table.cell(fill: rgb("#f5f5f5"), align: center)[#text(size: 9pt, weight: "semibold")[Qty]],
  table.cell(fill: rgb("#f5f5f5"), align: right)[#text(size: 9pt, weight: "semibold")[Price]],
  table.cell(fill: rgb("#f5f5f5"), align: right)[#text(size: 9pt, weight: "semibold")[Amount]],

  table.hline(stroke: 0.5pt + rgb("#e0e0e0")),

  // Items
  ..items.map(item => (
    [#item.description],
    align(center)[#item.qty],
    align(right)[\\$#str(item.price)],
    align(right)[\\$#str(item.qty * item.price)],
  )).flatten(),
)

#v(1em)
#line(length: 100%, stroke: 0.5pt + rgb("#e0e0e0"))

// Totals
#let subtotal = items.map(i => i.qty * i.price).sum()
#let tax_rate = data.at("tax_rate", default: 0)
#let tax = subtotal * tax_rate / 100
#let total = subtotal + tax

#align(right)[
  #grid(
    columns: (auto, 6em),
    column-gutter: 2em,
    row-gutter: 0.5em,
    align: (right, right),
    text(size: 9pt, fill: rgb("#666"))[Subtotal:], text(size: 9pt)[\\$#str(subtotal)],
    text(size: 9pt, fill: rgb("#666"))[Tax (#tax_rate%):], text(size: 9pt)[\\$#str(tax)],
  )
  #v(0.5em)
  #line(length: 10em, stroke: 0.5pt + rgb("#e0e0e0"))
  #v(0.3em)
  #grid(
    columns: (auto, 6em),
    column-gutter: 2em,
    align: (right, right),
    text(size: 12pt, weight: "bold")[Total Due:], text(size: 12pt, weight: "bold", fill: rgb("#1a1a2e"))[\\$#str(total)],
  )
]

#v(2em)

// Notes
#if data.at("notes", default: none) != none [
  #text(size: 9pt, fill: rgb("#666"), weight: "semibold")[NOTES]
  #v(0.3em)
  #text(size: 9pt, fill: rgb("#666"))[#data.notes]
]

// Footer
#place(bottom + center)[
  #text(size: 8pt, fill: rgb("#999"))[Thank you for your business!]
]`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LineItem = {
  description: string;
  qty: number;
  price: number;
};

type InvoiceFormData = {
  invoice_id: string;
  company_name: string;
  company_address: string;
  company_city: string;
  company_email: string;
  customer_name: string;
  customer_address: string;
  customer_city: string;
  invoice_date: string;
  due_date: string;
  payment_terms: string;
  items: LineItem[];
  tax_rate: number;
  notes: string;
};

type PublicPreviewSessionResponse = {
  session_id: string;
  expires_at: string;
  remaining_renders: number;
};

// ---------------------------------------------------------------------------
// Defaults — produce a realistic first render without typing anything
// ---------------------------------------------------------------------------

const today = new Date();
const dueDate = new Date(today);
dueDate.setDate(today.getDate() + 30);

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const DEFAULT_FORM: InvoiceFormData = {
  invoice_id: "INV-2024-001",
  company_name: "Acme Corporation",
  company_address: "123 Business Boulevard",
  company_city: "San Francisco, CA 94102",
  company_email: "billing@acme.com",
  customer_name: "John Smith",
  customer_address: "456 Client Street",
  customer_city: "Los Angeles, CA 90001",
  invoice_date: fmt(today),
  due_date: fmt(dueDate),
  payment_terms: "Net 30",
  items: [
    { description: "Web Development Services", qty: 40, price: 150 },
    { description: "UI/UX Design", qty: 20, price: 125 },
    { description: "Project Management", qty: 10, price: 100 },
  ],
  tax_rate: 8.5,
  notes: "Payment is due within 30 days. Please include invoice number on your check.",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InvoiceDemo() {
  const [form, setForm] = useState<InvoiceFormData>(DEFAULT_FORM);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null);
  const [sessionRemaining, setSessionRemaining] = useState<number | null>(null);

  const activeAbortRef = useRef<AbortController | null>(null);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  // Abort any in-flight request on unmount
  useEffect(() => {
    return () => {
      activeAbortRef.current?.abort();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Session management (mirrors playground-client.tsx)
  // ---------------------------------------------------------------------------

  const startSession = useCallback(async (): Promise<string> => {
    const res = await fetch(`${env.apiUrl}/v1/render/public/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Unable to start preview session (${res.status}): ${text.slice(0, 180)}`);
    }
    const payload = (await res.json()) as PublicPreviewSessionResponse;
    setSessionId(payload.session_id);
    setSessionExpiresAt(payload.expires_at);
    setSessionRemaining(payload.remaining_renders);
    return payload.session_id;
  }, []);

  useEffect(() => {
    startSession().catch((err) => {
      setError(err instanceof Error ? err.message : "Unable to create preview session");
    });
  }, [startSession]);

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionId && sessionExpiresAt) {
      const expiresAtMs = Date.parse(sessionExpiresAt);
      if (Number.isFinite(expiresAtMs) && Date.now() < expiresAtMs - 5000) {
        return sessionId;
      }
    }
    return startSession();
  }, [sessionId, sessionExpiresAt, startSession]);

  // ---------------------------------------------------------------------------
  // Generate PDF
  // ---------------------------------------------------------------------------

  const handleGenerate = useCallback(async () => {
    activeAbortRef.current?.abort();
    const abort = new AbortController();
    activeAbortRef.current = abort;

    setIsRunning(true);
    setError(null);

    try {
      let sid = await ensureSession();

      const executeRender = async (activeSid: string) =>
        fetch(`${env.apiUrl}/v1/render/public/preview`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Preview-Session": activeSid,
          },
          body: JSON.stringify({
            source: INVOICE_TYPST_SOURCE,
            data: {
              ...form,
              tax_rate: Number(form.tax_rate),
              items: form.items.map((item) => ({
                ...item,
                qty: Number(item.qty),
                price: Number(item.price),
              })),
            },
          }),
          signal: abort.signal,
        });

      let res = await executeRender(sid);
      if (res.status === 401 || res.status === 403) {
        sid = await startSession();
        res = await executeRender(sid);
      }

      if (abort.signal.aborted) return;

      if (!res.ok) {
        let reason = `Generation failed (${res.status})`;
        try {
          const payload = (await res.json()) as { message?: string };
          if (payload.message) reason = payload.message;
        } catch {
          // keep generic message
        }
        throw new Error(reason);
      }

      const blob = await res.blob();
      if (abort.signal.aborted) return;

      const nextUrl = URL.createObjectURL(blob);
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return nextUrl;
      });

      const remaining = res.headers.get("X-Preview-Session-Remaining-Renders");
      if (remaining !== null && Number.isFinite(Number(remaining))) {
        setSessionRemaining(Number(remaining));
      }
      const nextExpiry = res.headers.get("X-Preview-Session-Expires-At");
      if (nextExpiry) setSessionExpiresAt(nextExpiry);
    } catch (err) {
      if (abort.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      if (!abort.signal.aborted) setIsRunning(false);
    }
  }, [form, ensureSession, startSession]);

  // ---------------------------------------------------------------------------
  // Line item helpers
  // ---------------------------------------------------------------------------

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    setForm((prev) => {
      const items = prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      );
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { description: "", qty: 1, price: 0 }],
    }));
  };

  const removeItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleField = (field: keyof Omit<InvoiceFormData, "items">) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = field === "tax_rate" ? e.target.value : e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  // ---------------------------------------------------------------------------
  // Subtotal preview
  // ---------------------------------------------------------------------------

  const subtotal = form.items.reduce((sum, item) => sum + Number(item.qty) * Number(item.price), 0);
  const tax = subtotal * (Number(form.tax_rate) / 100);
  const total = subtotal + tax;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const inputClass =
    "w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--muted-dim)]";

  const labelClass = "block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)] mb-1";

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 pb-20 pt-10 lg:pt-14">
      {/* Hero */}
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          Free demo — no signup required
        </p>
        <h1 className="mt-3 font-display text-4xl text-[var(--ink)] sm:text-5xl">
          Invoice generator
        </h1>
        <p className="mt-4 text-base text-[var(--muted)] leading-relaxed">
          Fill in your details, click <strong className="text-[var(--ink)]">Generate Invoice</strong>, and download a
          PDF. No account needed.
        </p>
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-[520px_minmax(0,1fr)]">
        {/* ---------------------------------------------------------------- */}
        {/* Form */}
        {/* ---------------------------------------------------------------- */}
        <div className="space-y-6">
          {/* Business info */}
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Your business
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Company name</label>
                <input className={inputClass} value={form.company_name} onChange={handleField("company_name")} placeholder="Acme Corporation" />
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <input className={inputClass} value={form.company_address} onChange={handleField("company_address")} placeholder="123 Business St" />
              </div>
              <div>
                <label className={labelClass}>City / State / ZIP</label>
                <input className={inputClass} value={form.company_city} onChange={handleField("company_city")} placeholder="San Francisco, CA 94102" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Email</label>
                <input type="email" className={inputClass} value={form.company_email} onChange={handleField("company_email")} placeholder="billing@acme.com" />
              </div>
            </div>
          </section>

          {/* Invoice details */}
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Invoice details
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Invoice #</label>
                <input className={inputClass} value={form.invoice_id} onChange={handleField("invoice_id")} placeholder="INV-001" />
              </div>
              <div>
                <label className={labelClass}>Payment terms</label>
                <input className={inputClass} value={form.payment_terms} onChange={handleField("payment_terms")} placeholder="Net 30" />
              </div>
              <div>
                <label className={labelClass}>Issue date</label>
                <input type="date" className={inputClass} value={form.invoice_date} onChange={handleField("invoice_date")} />
              </div>
              <div>
                <label className={labelClass}>Due date</label>
                <input type="date" className={inputClass} value={form.due_date} onChange={handleField("due_date")} />
              </div>
            </div>
          </section>

          {/* Bill to */}
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Bill to
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Customer name</label>
                <input className={inputClass} value={form.customer_name} onChange={handleField("customer_name")} placeholder="Jane Doe" />
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <input className={inputClass} value={form.customer_address} onChange={handleField("customer_address")} placeholder="456 Client Ave" />
              </div>
              <div>
                <label className={labelClass}>City / State / ZIP</label>
                <input className={inputClass} value={form.customer_city} onChange={handleField("customer_city")} placeholder="Los Angeles, CA 90001" />
              </div>
            </div>
          </section>

          {/* Line items */}
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Line items
              </h2>
              <button
                type="button"
                onClick={addItem}
                className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:border-[var(--line-hover)]"
              >
                + Add row
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {/* Header labels (hidden on mobile) */}
              <div className="hidden grid-cols-[1fr_60px_80px_32px] gap-2 sm:grid">
                <span className={labelClass}>Description</span>
                <span className={labelClass}>Qty</span>
                <span className={labelClass}>Price ($)</span>
                <span />
              </div>

              {form.items.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_60px_80px_32px] items-center gap-2">
                  <input
                    className={inputClass}
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateItem(i, "description", e.target.value)}
                  />
                  <input
                    type="number"
                    min={1}
                    className={inputClass}
                    value={item.qty}
                    onChange={(e) => updateItem(i, "qty", e.target.value)}
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={inputClass}
                    value={item.price}
                    onChange={(e) => updateItem(i, "price", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    disabled={form.items.length <= 1}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--bad)] hover:text-[var(--bad)] disabled:opacity-30"
                    aria-label="Remove row"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Tax + running total */}
            <div className="mt-5 flex flex-col items-end gap-3">
              <div className="flex items-center gap-3">
                <label className={labelClass + " whitespace-nowrap"}>Tax rate (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  className={inputClass + " w-24"}
                  value={form.tax_rate}
                  onChange={handleField("tax_rate")}
                />
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--ink)] space-y-1 min-w-[200px]">
                <div className="flex justify-between gap-6">
                  <span className="text-[var(--muted)]">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-[var(--muted)]">Tax ({form.tax_rate}%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-6 border-t border-[var(--line)] pt-1 font-semibold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Notes */}
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
            <label className={labelClass}>Notes (optional)</label>
            <textarea
              rows={3}
              className={inputClass + " resize-y"}
              value={form.notes}
              onChange={handleField("notes")}
              placeholder="Payment instructions, terms, thank-you message…"
            />
          </section>

          {/* Generate button */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isRunning}
              className="inline-flex items-center justify-center rounded-md bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isRunning ? "Generating…" : "Generate Invoice"}
            </button>
            {sessionRemaining !== null && (
              <span className="rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--muted)]">
                {sessionRemaining} render{sessionRemaining === 1 ? "" : "s"} remaining
              </span>
            )}
          </div>

          {error && (
            <p className="rounded-md border border-[color-mix(in_oklab,var(--bad),white_45%)] bg-[color-mix(in_oklab,var(--bad),transparent_90%)] px-3 py-2 text-sm text-[var(--bad)]">
              {error}
            </p>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* PDF preview */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-col gap-4">
          {pdfUrl ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Invoice preview
                </p>
                <a
                  href={pdfUrl}
                  download="invoice.pdf"
                  className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
                >
                  Download PDF
                </a>
              </div>
              <div className="h-[860px] overflow-hidden rounded-2xl border border-[var(--line)] bg-white isolate [contain:paint]">
                <iframe
                  src={pdfUrl}
                  title="Generated invoice PDF preview"
                  className="block h-full w-full border-0"
                />
              </div>
            </>
          ) : (
            <div className="flex h-[860px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] px-8 text-center">
              {isRunning ? (
                <p className="text-sm text-[var(--muted)]">Generating your invoice…</p>
              ) : (
                <>
                  <p className="text-4xl">📄</p>
                  <p className="mt-3 text-sm font-semibold text-[var(--ink)]">Your invoice will appear here</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">Fill in the form and click Generate Invoice.</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CTA Banner */}
      <div className="mt-14 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-8 py-8 sm:flex sm:items-center sm:justify-between sm:gap-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Like this?
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--ink)]">
            Sign up to save templates and use the API
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Generate invoices programmatically, create custom templates, and integrate PDF generation into your
            product — in minutes.
          </p>
        </div>
        <div className="mt-5 flex flex-shrink-0 flex-col gap-3 sm:mt-0 sm:flex-row">
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-md bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
          >
            Sign up free
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-6 py-3 text-sm font-semibold text-[var(--ink)] hover:border-[var(--line-hover)]"
          >
            View API docs
          </Link>
        </div>
      </div>
    </div>
  );
}
