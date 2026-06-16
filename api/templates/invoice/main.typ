#import "design.typ": *

#let data = sys.inputs
#let brand = resolve-brand(data)
#let currency = data.at("currency", default: "USD")

#set page(paper: "a4", margin: (x: 22mm, top: 0mm, bottom: 22mm))
#set text(font: "Inter Variable", size: 10pt, fill: INK)

// Brand strip at top of page
#brand-strip(brand)

#v(18mm)

// ── Header: title + meta block on the right ─────────────────────────────────

#grid(
  columns: (1fr, auto),
  align: (left + top, right + top),
  column-gutter: 24pt,
  [
    #h1[Invoice]
    #v(2pt)
    #text(font: "JetBrains Mono", size: 11pt, fill: MUTED)[
      #data.at("invoice_id", default: "INV-0001")
    ]
    #v(8pt)
    #status-badge(data.at("status", default: "unpaid"))
  ],
  [
    #set align(right)
    #text(font: "Inter Variable", size: 13pt, weight: 700, fill: INK)[
      #data.at("company_name", default: "Your Company")
    ]
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

// ── Bill-To + Dates block ───────────────────────────────────────────────────

#grid(
  columns: (1fr, auto),
  column-gutter: 24pt,
  align: (left, right),
  [
    #caption[Bill to]
    #v(4pt)
    #text(weight: 600, size: 11pt, fill: INK)[
      #data.at("customer_name", default: "Customer")
    ]
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
      caption[Issue date], body-text(date-pretty(data.at("invoice_date", default: "2026-06-15"))),
      caption[Due date],   body-text(date-pretty(data.at("due_date", default: "2026-07-15"))),
      caption[Terms],      body-text(str(data.at("payment_terms", default: "Net 30"))),
    )
  ],
)

#v(18pt)

// ── Line items table ────────────────────────────────────────────────────────

#let items = data.at("items", default: ())

#table(
  columns: (1fr, auto, auto, auto),
  align: (left, right, right, right),
  stroke: none,
  inset: (x: 8pt, y: 9pt),
  fill: (_, row) => if row == 0 { CANVAS },
  // header
  text(font: "Inter Variable", size: 9pt, weight: 600, tracking: 0.06em, fill: MUTED)[#upper("Description")],
  text(font: "Inter Variable", size: 9pt, weight: 600, tracking: 0.06em, fill: MUTED)[#upper("Qty")],
  text(font: "Inter Variable", size: 9pt, weight: 600, tracking: 0.06em, fill: MUTED)[#upper("Unit price")],
  text(font: "Inter Variable", size: 9pt, weight: 600, tracking: 0.06em, fill: MUTED)[#upper("Amount")],
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

// ── Totals block ────────────────────────────────────────────────────────────

#let subtotal = items.fold(0.0, (acc, it) => acc + it.at("qty", default: 1) * it.at("price", default: 0.0))
#let tax-rate = data.at("tax_rate", default: 0.0)
#let tax = subtotal * tax-rate / 100.0
#let discount = data.at("discount", default: 0.0)
#let total = subtotal + tax - discount

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
    ..(if discount > 0 {
      (caption[Discount], text(font: "JetBrains Mono", size: 10pt, fill: SUCCESS)[−#money(discount, currency: currency)])
    } else { () }),
  )
]

#v(4pt)
#align(right)[
  #block(
    inset: (x: 16pt, y: 14pt),
    radius: 6pt,
    fill: brand,
    grid(
      columns: (auto, 90pt),
      column-gutter: 16pt,
      align: (right, right),
      text(font: "Inter Variable", size: 10pt, weight: 600, fill: white, tracking: 0.06em)[#upper("Total due")],
      text(font: "JetBrains Mono", size: 16pt, weight: 700, fill: white)[#money(total, currency: currency)],
    ),
  )
]

#v(20pt)

// ── Notes / payment instructions ────────────────────────────────────────────

#if "notes" in data and data.notes != none and data.notes != "" [
  #caption[Notes]
  #v(4pt)
  #text(size: 9.5pt, fill: MUTED)[#data.notes]
  #v(12pt)
]

#if "payment_instructions" in data and data.payment_instructions != none [
  #block(
    inset: 12pt,
    radius: 4pt,
    fill: CANVAS,
    stroke: 0.5pt + HAIRLINE,
    [
      #caption[Payment instructions]
      #v(4pt)
      #text(size: 9.5pt, fill: INK)[#data.payment_instructions]
    ],
  )
]

#v(1fr)
#align(center)[
  #text(size: 8pt, fill: SUBTLE)[
    Thank you for your business. Questions? #data.at("company_email", default: "hello@yourcompany.com")
  ]
]
