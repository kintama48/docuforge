#import "design.typ": *

#let data = sys.inputs
#let brand = resolve-brand(data)
#let currency = data.at("currency", default: "USD")

#set page(
  paper: "a4",
  margin: (x: 28mm, top: 22mm, bottom: 28mm),
  footer: context {
    line(length: 100%, stroke: 0.5pt + HAIRLINE)
    v(4pt)
    grid(
      columns: (1fr, 1fr, 1fr),
      align: (left, center, right),
      text(size: 8pt, fill: MUTED)[#data.at("contract_id", default: "CONTRACT-001")],
      text(size: 8pt, fill: MUTED)[Page #counter(page).display() of #counter(page).final().at(0)],
      text(size: 8pt, fill: MUTED)[Confidential],
    )
  },
)
#set text(font: "Inter Variable", size: 10pt, fill: INK)
#set par(justify: true, leading: 0.72em)

// ── Cover ────────────────────────────────────────────────────────────────────
#brand-strip(brand)
#v(16mm)

#h1[#data.at("contract_title", default: "Services Agreement")]
#v(4pt)
#caption[Contract #data.at("contract_id", default: "CONTRACT-001") · Effective #date-pretty(data.at("effective_date", default: "2026-06-16"))]

#v(16pt)
#line(length: 100%, stroke: 0.5pt + HAIRLINE)
#v(12pt)

#grid(
  columns: (1fr, 1fr),
  column-gutter: 20pt,
  [
    #caption[Service provider]
    #v(4pt)
    #text(weight: 600, size: 11pt)[#data.at("provider_name", default: "Provider LLC")]
    #v(2pt)
    #text(size: 9pt, fill: MUTED)[
      #data.at("provider_address", default: "123 Main Street") \
      #data.at("provider_city", default: "City, State ZIP") \
      #data.at("provider_email", default: "hello@provider.com")
    ]
  ],
  [
    #caption[Client]
    #v(4pt)
    #text(weight: 600, size: 11pt)[#data.at("client_name", default: "Client Corp.")]
    #v(2pt)
    #text(size: 9pt, fill: MUTED)[
      #data.at("client_address", default: "456 Client Ave") \
      #data.at("client_city", default: "City, State ZIP") \
      #data.at("client_email", default: "legal@client.com")
    ]
  ],
)

#v(14pt)
#line(length: 100%, stroke: 0.5pt + HAIRLINE)
#v(8pt)

// Key deal terms summary box
#block(
  width: 100%, inset: 14pt,
  stroke: 0.5pt + HAIRLINE, radius: 4pt,
  fill: CANVAS,
)[
  #caption[Deal summary]
  #v(6pt)
  #grid(
    columns: (1fr, 1fr, 1fr),
    column-gutter: 12pt,
    [
      #caption[Total value]
      #v(2pt)
      #text(size: 13pt, weight: 700, fill: brand)[
        #money(data.at("total_value", default: 0.0), currency: currency)
      ]
    ],
    [
      #caption[Payment terms]
      #v(2pt)
      #text(size: 11pt, weight: 600)[#data.at("payment_terms", default: "Net 30")]
    ],
    [
      #caption[Contract term]
      #v(2pt)
      #text(size: 11pt, weight: 600)[#data.at("contract_term", default: "12 months")]
    ],
  )
]

#pagebreak()

// ── Sections ─────────────────────────────────────────────────────────────────
#let sections = data.at("sections", default: ())
#let sec-count = 0

#for sec in sections [
  #v(6pt)
  #block[
    #text(size: 13pt, weight: 700, fill: INK)[#sec.at("title", default: "Section")]
    #v(2pt)
    #line(length: 40pt, stroke: 2pt + brand)
    #v(6pt)
  ]
  #text(size: 10pt, fill: INK)[#sec.at("content", default: "")]
  #v(14pt)
]

// ── Signatures ───────────────────────────────────────────────────────────────
#v(8pt)
#line(length: 100%, stroke: 0.5pt + HAIRLINE)
#v(12pt)
#caption[Signatures]
#v(10pt)

#grid(
  columns: (1fr, 1fr),
  column-gutter: 20pt,
  [
    #line(length: 100%, stroke: 0.5pt + INK)
    #v(4pt)
    #text(weight: 600)[#data.at("provider_signatory", default: "Authorized Signatory")]
    #linebreak()
    #text(size: 9pt, fill: MUTED)[#data.at("provider_name", default: "Provider LLC")]
    #linebreak()
    #text(size: 9pt, fill: MUTED)[Date: #line(length: 60pt, stroke: 0.5pt + MUTED)]
  ],
  [
    #line(length: 100%, stroke: 0.5pt + INK)
    #v(4pt)
    #text(weight: 600)[#data.at("client_signatory", default: "Authorized Signatory")]
    #linebreak()
    #text(size: 9pt, fill: MUTED)[#data.at("client_name", default: "Client Corp.")]
    #linebreak()
    #text(size: 9pt, fill: MUTED)[Date: #line(length: 60pt, stroke: 0.5pt + MUTED)]
  ],
)
