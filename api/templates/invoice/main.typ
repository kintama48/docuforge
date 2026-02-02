#set page(paper: "a4", margin: (x: 2cm, y: 2cm))
#set text(font: "Inter", size: 10pt)

#let data = sys.inputs

// Header
#grid(
  columns: (1fr, 1fr),
  align: (left, right),
  [
    #text(size: 24pt, weight: "bold", fill: rgb("#1a1a2e"))[INVOICE]
    #v(0.5em)
    #text(size: 11pt, fill: rgb("#666"))[\##data.at("invoice_id", default: "INV-001")]
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
    align(right)[\$#str(item.price)],
    align(right)[\$#str(item.qty * item.price)],
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
    text(size: 9pt, fill: rgb("#666"))[Subtotal:], text(size: 9pt)[\$#str(subtotal)],
    text(size: 9pt, fill: rgb("#666"))[Tax (#tax_rate%):], text(size: 9pt)[\$#str(tax)],
  )
  #v(0.5em)
  #line(length: 10em, stroke: 0.5pt + rgb("#e0e0e0"))
  #v(0.3em)
  #grid(
    columns: (auto, 6em),
    column-gutter: 2em,
    align: (right, right),
    text(size: 12pt, weight: "bold")[Total Due:], text(size: 12pt, weight: "bold", fill: rgb("#1a1a2e"))[\$#str(total)],
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
]
