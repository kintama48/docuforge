#import "design.typ": *

#let data = sys.inputs
#let brand = resolve-brand(data)
#let currency = data.at("currency", default: "USD")

#set page(paper: "a4", margin: (x: 22mm, top: 0mm, bottom: 22mm))
#set text(font: "Inter Variable", size: 10pt, fill: INK)

// Draft watermark strip (visual cue: amber/yellow top bar instead of brand)
#let DRAFT_COLOR = rgb("#d97706")
#block(width: 100%, height: 6pt, fill: DRAFT_COLOR)
#v(18mm)

// ── Header ───────────────────────────────────────────────────────────────────
#grid(
  columns: (1fr, auto),
  align: (left + top, right + top),
  column-gutter: 24pt,
  [
    #h1[Quote]
    #v(2pt)
    #text(font: "JetBrains Mono", size: 11pt, fill: MUTED)[
      #data.at("quote_id", default: "QT-0001")
    ]
    #v(8pt)
    #badge("Draft", fill: DRAFT_COLOR)
    #h(4pt)
    #text(size: 8pt, fill: MUTED)[(Prices subject to change — not a final invoice)]
  ],
  [
    #set align(right)
    #text(size: 13pt, weight: 700, fill: INK)[#data.at("company_name", default: "Your Company")]
    #v(4pt)
    #text(size: 9pt, fill: MUTED)[
      #data.at("company_address", default: "Street, City") \
      #data.at("company_city", default: "City, State ZIP") \
      #data.at("company_email", default: "hello@yourcompany.com")
    ]
  ],
)

#v(12pt)
#line(length: 100%, stroke: 0.5pt + HAIRLINE)
#v(12pt)

// ── Quote to + Dates ─────────────────────────────────────────────────────────
#grid(
  columns: (1fr, auto),
  column-gutter: 24pt,
  align: (left, right),
  [
    #caption[Quote for]
    #v(4pt)
    #text(weight: 600, size: 11pt)[#data.at("customer_name", default: "Customer")]
    #v(2pt)
    #text(size: 9.5pt, fill: MUTED)[
      #data.at("customer_address", default: "—") \
      #data.at("customer_city", default: "—")
    ]
  ],
  [
    #set align(right)
    #table(
      columns: (auto, auto),
      stroke: none,
      inset: (x: 4pt, y: 2pt),
      column-gutter: 10pt,
      align: (right, right),
      caption[Quote date], body-text(date-pretty(data.at("quote_date", default: "2026-06-16"))),
      caption[Valid until], body-text(date-pretty(data.at("valid_until", default: "2026-07-16"))),
      caption[Prepared by], body-text(str(data.at("prepared_by", default: "Sales Team"))),
    )
  ],
)

#v(18pt)

// ── Line items ───────────────────────────────────────────────────────────────
#let items = data.at("items", default: ())

#table(
  columns: (1fr, auto, auto, auto),
  align: (left, right, right, right),
  stroke: none,
  inset: (x: 8pt, y: 9pt),
  fill: (_, row) => if row == 0 { rgb("#fffbeb") },
  text(size: 9pt, weight: 600, tracking: 0.06em, fill: MUTED)[#upper("Description")],
  text(size: 9pt, weight: 600, tracking: 0.06em, fill: MUTED)[#upper("Qty")],
  text(size: 9pt, weight: 600, tracking: 0.06em, fill: MUTED)[#upper("Unit price")],
  text(size: 9pt, weight: 600, tracking: 0.06em, fill: MUTED)[#upper("Amount")],
  ..items.map(it => {
    let desc = it.at("description", default: "—")
    let qty = it.at("qty", default: 1)
    let price = it.at("price", default: 0.0)
    let amount = qty * price
    (
      body-text(desc),
      text(font: "JetBrains Mono", size: 10pt)[#qty],
      text(font: "JetBrains Mono", size: 10pt)[#money(price, currency: currency)],
      text(font: "JetBrains Mono", size: 10pt, weight: 500)[#money(amount, currency: currency)],
    )
  }).flatten(),
)

#line(length: 100%, stroke: 0.5pt + HAIRLINE)

// ── Totals ───────────────────────────────────────────────────────────────────
#let subtotal = items.fold(0.0, (acc, it) => acc + it.at("qty", default: 1) * it.at("price", default: 0.0))
#let tax-rate = data.at("tax_rate", default: 0.0)
#let tax = subtotal * tax-rate / 100.0
#let total = subtotal + tax

#v(8pt)
#align(right)[
  #table(
    columns: (auto, 80pt),
    stroke: none,
    inset: (x: 6pt, y: 4pt),
    align: (right, right),
    caption[Subtotal], text(font: "JetBrains Mono", size: 10pt)[#money(subtotal, currency: currency)],
    ..(if tax-rate > 0 {
      (caption[Tax (#str(tax-rate)%)], text(font: "JetBrains Mono", size: 10pt)[#money(tax, currency: currency)])
    } else { () }),
  )
]

#v(4pt)
#align(right)[
  #block(
    inset: (x: 16pt, y: 14pt),
    radius: 6pt,
    fill: DRAFT_COLOR,
    grid(
      columns: (auto, 90pt),
      column-gutter: 16pt,
      align: (right, right),
      text(size: 10pt, weight: 600, fill: white, tracking: 0.06em)[#upper("Estimated total")],
      text(font: "JetBrains Mono", size: 16pt, weight: 700, fill: white)[#money(total, currency: currency)],
    ),
  )
]

#v(20pt)

#if "notes" in data and data.notes != none and data.notes != "" [
  #caption[Notes]
  #v(4pt)
  #text(size: 9.5pt, fill: MUTED)[#data.notes]
  #v(12pt)
]

#v(1fr)
#align(center)[
  #text(size: 8pt, fill: SUBTLE)[
    This is a preliminary quote only. Final pricing confirmed upon signed agreement. Questions? #data.at("company_email", default: "hello@yourcompany.com")
  ]
]
