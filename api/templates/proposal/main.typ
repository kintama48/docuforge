#import "design.typ": *

#let data = sys.inputs
#let brand = resolve-brand(data)
#let currency = data.at("currency", default: "USD")

#set page(
  paper: "a4",
  margin: (x: 24mm, top: 0mm, bottom: 24mm),
  footer: context {
    line(length: 100%, stroke: 0.5pt + HAIRLINE)
    v(4pt)
    grid(
      columns: (1fr, 1fr, 1fr),
      align: (left, center, right),
      text(size: 8pt, fill: MUTED)[#data.at("company_name", default: "Company")],
      text(size: 8pt, fill: MUTED)[Page #counter(page).display()],
      text(size: 8pt, fill: MUTED)[Confidential],
    )
  },
)
#set text(font: "Inter Variable", size: 10pt, fill: INK)
#set par(justify: true, leading: 0.72em)

// ── Cover Page ───────────────────────────────────────────────────────────────
#brand-strip(brand)
#v(26mm)

#text(size: 11pt, weight: 500, fill: brand)[Proposal for]
#v(4pt)
#text(size: 30pt, weight: 700, fill: INK, hyphenate: false)[#data.at("proposal_title", default: "Project Proposal")]
#v(10pt)
#text(size: 14pt, fill: MUTED)[#data.at("client_name", default: "Client Name")]
#v(16pt)
#line(length: 80pt, stroke: 3pt + brand)

#v(1fr)
#grid(
  columns: (1fr, auto),
  [
    #text(size: 11pt, weight: 600)[#data.at("company_name", default: "Your Company")]
    #v(3pt)
    #text(size: 9.5pt, fill: MUTED)[
      #data.at("company_address", default: "Address") \
      #data.at("company_email", default: "hello@company.com")
    ]
  ],
  align(right)[
    #text(size: 9.5pt, fill: MUTED)[
      Prepared: #date-pretty(data.at("date", default: "2026-06-16")) \
      Valid until: #date-pretty(data.at("valid_until", default: "2026-07-16"))
    ]
  ],
)
#v(20mm)
#pagebreak()

// ── Executive Summary ────────────────────────────────────────────────────────
#v(8pt)
#h2[Executive Summary]
#v(6pt)
#line(length: 100%, stroke: 0.5pt + HAIRLINE)
#v(8pt)

#if "executive_summary" in data [
  #text(size: 10pt)[#data.executive_summary]
  #v(16pt)
]

// ── Sections ─────────────────────────────────────────────────────────────────
#let sections = data.at("sections", default: ())
#for sec in sections [
  #h3[#sec.at("title", default: "Section")]
  #v(4pt)
  #line(length: 100%, stroke: 0.5pt + HAIRLINE)
  #v(6pt)
  #text(size: 10pt)[#sec.at("content", default: "")]
  #v(14pt)
]

// ── Pricing ──────────────────────────────────────────────────────────────────
#let items = data.at("pricing", default: ())
#if items.len() > 0 [
  #h3[Investment]
  #v(4pt)
  #line(length: 100%, stroke: 0.5pt + HAIRLINE)
  #v(8pt)

  #table(
    columns: (1fr, auto, auto),
    stroke: none,
    inset: (x: 8pt, y: 8pt),
    fill: (_, row) => if row == 0 { CANVAS },
    align: (left, right, right),
    text(size: 9pt, weight: 600, tracking: 0.06em, fill: MUTED)[#upper("Item")],
    text(size: 9pt, weight: 600, tracking: 0.06em, fill: MUTED)[#upper("Qty")],
    text(size: 9pt, weight: 600, tracking: 0.06em, fill: MUTED)[#upper("Amount")],
    ..items.map(it => (
      body-text(it.at("description", default: "—")),
      text(font: "JetBrains Mono", size: 9.5pt)[#it.at("qty", default: 1)],
      text(font: "JetBrains Mono", size: 9.5pt)[#money(it.at("amount", default: 0.0), currency: currency)],
    )).flatten(),
  )

  #line(length: 100%, stroke: 0.5pt + HAIRLINE)
  #v(6pt)

  #let total = items.fold(0.0, (acc, it) => acc + it.at("amount", default: 0.0))
  #align(right)[
    #block(
      inset: (x: 16pt, y: 12pt),
      radius: 6pt,
      fill: brand,
      grid(
        columns: (auto, 100pt),
        column-gutter: 16pt,
        align: (right, right),
        text(size: 10pt, weight: 600, fill: white, tracking: 0.06em)[#upper("Total investment")],
        text(font: "JetBrains Mono", size: 15pt, weight: 700, fill: white)[#money(total, currency: currency)],
      ),
    )
  ]
  #v(14pt)
]

// ── Next Steps ───────────────────────────────────────────────────────────────
#if "next_steps" in data [
  #h3[Next Steps]
  #v(4pt)
  #line(length: 100%, stroke: 0.5pt + HAIRLINE)
  #v(6pt)
  #for (i, step) in data.next_steps.enumerate() [
    #grid(
      columns: (18pt, 1fr),
      text(weight: 700, fill: brand)[#str(i + 1).],
      text(size: 10pt)[#step],
    )
    #v(4pt)
  ]
]
