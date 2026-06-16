#import "design.typ": *

#let data = sys.inputs
#let brand = resolve-brand(data)
#let currency = data.at("currency", default: "USD")

#set page(width: 80mm, height: auto, margin: (x: 5mm, y: 6mm))
#set text(font: "Inter Variable", size: 9pt, fill: INK)

// Header
#align(center)[
  #block(width: 100%, height: 4pt, fill: brand)
  #v(8pt)
  #text(size: 13pt, weight: 700, fill: INK)[#data.at("store_name", default: "Store Name")]
  #v(2pt)
  #text(size: 8pt, fill: MUTED)[
    #data.at("store_address", default: "123 Main St") \
    #data.at("store_phone", default: "(555) 123-4567")
  ]
]

#v(8pt)
#line(length: 100%, stroke: (dash: "dotted", thickness: 0.5pt, paint: HAIRLINE))
#v(5pt)

// Receipt meta
#grid(
  columns: (1fr, auto),
  caption[Receipt #sym.hash #data.at("receipt_id", default: "001234")],
  align(right)[#caption[#data.at("date", default: "Jun 15, 2026")]],
)
#v(2pt)
#caption[Cashier: #data.at("cashier", default: "Employee")]

#v(8pt)
#line(length: 100%, stroke: (dash: "dotted", thickness: 0.5pt, paint: HAIRLINE))
#v(5pt)

// Items
#let items = data.at("items", default: ())
#for item in items {
  grid(
    columns: (1fr, auto),
    [
      #body-text(item.at("name", default: "Item"))
      #let qty = item.at("qty", default: 1)
      #if qty > 1 [
        #v(1pt)
        #text(size: 8pt, fill: MUTED)[#qty × #money(item.at("price", default: 0.0), currency: currency)]
      ]
    ],
    align(right)[
      #let amt = item.at("qty", default: 1) * item.at("price", default: 0.0)
      #text(font: "JetBrains Mono", size: 9pt)[#money(amt, currency: currency)]
    ],
  )
  v(4pt)
}

#v(2pt)
#line(length: 100%, stroke: (dash: "dotted", thickness: 0.5pt, paint: HAIRLINE))
#v(5pt)

// Totals
#let subtotal = items.fold(0.0, (acc, it) => acc + it.at("qty", default: 1) * it.at("price", default: 0.0))
#let tax-rate = data.at("tax_rate", default: 0.0)
#let tax = subtotal * tax-rate / 100.0
#let total = subtotal + tax

#grid(
  columns: (1fr, auto),
  row-gutter: 3pt,
  caption[Subtotal], align(right)[#text(font: "JetBrains Mono", size: 9pt)[#money(subtotal, currency: currency)]],
  caption[Tax (#str(tax-rate)%)], align(right)[#text(font: "JetBrains Mono", size: 9pt)[#money(tax, currency: currency)]],
)

#v(4pt)
#line(length: 100%, stroke: 0.75pt + brand)
#v(4pt)

#grid(
  columns: (1fr, auto),
  text(size: 11pt, weight: 700, fill: INK)[TOTAL],
  align(right)[#text(font: "JetBrains Mono", size: 11pt, weight: 700, fill: brand)[#money(total, currency: currency)]],
)

#v(6pt)
#line(length: 100%, stroke: (dash: "dotted", thickness: 0.5pt, paint: HAIRLINE))
#v(5pt)

// Payment
#let method = data.at("payment_method", default: "Cash")
#grid(
  columns: (1fr, auto),
  caption[Paid by #method],
  align(right)[#text(font: "JetBrains Mono", size: 9pt)[#money(total, currency: currency)]],
)

#if method == "Cash" {
  let tendered = data.at("cash_tendered", default: total)
  let change = tendered - total
  v(3pt)
  grid(
    columns: (1fr, auto),
    row-gutter: 3pt,
    caption[Cash tendered], align(right)[#text(font: "JetBrains Mono", size: 9pt)[#money(tendered, currency: currency)]],
    caption[Change], align(right)[#text(font: "JetBrains Mono", size: 9pt, fill: SUCCESS)[#money(change, currency: currency)]],
  )
}

#v(10pt)
#align(center)[
  #text(size: 8pt, fill: MUTED)[
    Thank you for your business! \
    #v(2pt)
    #data.at("footer_message", default: "Returns accepted within 30 days with receipt")
  ]
]

#v(8pt)
#align(center)[
  #rect(
    width: 52mm, height: 9mm,
    stroke: 0.5pt + HAIRLINE,
    fill: white,
    radius: 2pt,
  )[
    #align(center + horizon)[
      #text(font: "JetBrains Mono", size: 7pt, fill: MUTED)[#data.at("receipt_id", default: "001234")]
    ]
  ]
]

#v(5pt)
#block(width: 100%, height: 3pt, fill: brand)
