#set page(width: 80mm, height: auto, margin: (x: 5mm, y: 8mm))
#set text(font: "Inter", size: 9pt)

#let data = sys.inputs

// Store header
#align(center)[
  #text(size: 14pt, weight: "bold")[#data.at("store_name", default: "Store Name")]
  #linebreak()
  #text(size: 8pt, fill: rgb("#666"))[
    #data.at("store_address", default: "123 Main St")
    #linebreak()
    #data.at("store_phone", default: "(555) 123-4567")
  ]
]

#v(0.8em)
#line(length: 100%, stroke: (dash: "dotted", thickness: 0.5pt))
#v(0.5em)

// Receipt info
#grid(
  columns: (1fr, 1fr),
  text(size: 8pt, fill: rgb("#666"))[Receipt \##data.at("receipt_id", default: "001234")],
  align(right)[#text(size: 8pt, fill: rgb("#666"))[#data.at("date", default: "01/15/2024")]],
)
#text(size: 8pt, fill: rgb("#666"))[Cashier: #data.at("cashier", default: "Employee")]

#v(0.8em)
#line(length: 100%, stroke: (dash: "dotted", thickness: 0.5pt))
#v(0.5em)

// Items
#let items = data.at("items", default: ((name: "Item", qty: 1, price: 0.00),))

#for item in items [
  #grid(
    columns: (1fr, auto),
    [
      #text(size: 9pt)[#item.name]
      #if item.qty > 1 [
        #linebreak()
        #text(size: 8pt, fill: rgb("#666"))[#item.qty × \$#str(item.price)]
      ]
    ],
    align(right)[#text(size: 9pt)[\$#str(calc.round(item.qty * item.price, digits: 2))]],
  )
  #v(0.3em)
]

#v(0.3em)
#line(length: 100%, stroke: (dash: "dotted", thickness: 0.5pt))
#v(0.5em)

// Totals
#let subtotal = items.map(i => i.qty * i.price).sum()
#let tax_rate = data.at("tax_rate", default: 0)
#let tax = calc.round(subtotal * tax_rate / 100, digits: 2)
#let total = subtotal + tax

#grid(
  columns: (1fr, auto),
  row-gutter: 0.3em,
  text(size: 8pt, fill: rgb("#666"))[Subtotal], align(right)[#text(size: 8pt)[\$#str(calc.round(subtotal, digits: 2))]],
  text(size: 8pt, fill: rgb("#666"))[Tax (#tax_rate%)], align(right)[#text(size: 8pt)[\$#str(tax)]],
)

#v(0.3em)
#line(length: 100%, stroke: 0.5pt)
#v(0.3em)

#grid(
  columns: (1fr, auto),
  text(size: 11pt, weight: "bold")[TOTAL], align(right)[#text(size: 11pt, weight: "bold")[\$#str(calc.round(total, digits: 2))]],
)

#v(0.5em)
#line(length: 100%, stroke: (dash: "dotted", thickness: 0.5pt))
#v(0.5em)

// Payment method
#grid(
  columns: (1fr, auto),
  row-gutter: 0.3em,
  text(size: 8pt)[#data.at("payment_method", default: "Cash")], align(right)[#text(size: 8pt)[\$#str(calc.round(total, digits: 2))]],
)

#if data.at("payment_method", default: "Cash") == "Cash" [
  #let cash_tendered = data.at("cash_tendered", default: total)
  #let change = cash_tendered - total
  #grid(
    columns: (1fr, auto),
    row-gutter: 0.3em,
    text(size: 8pt, fill: rgb("#666"))[Cash Tendered], align(right)[#text(size: 8pt)[\$#str(calc.round(cash_tendered, digits: 2))]],
    text(size: 8pt, fill: rgb("#666"))[Change], align(right)[#text(size: 8pt)[\$#str(calc.round(change, digits: 2))]],
  )
]

#v(1em)

// Footer
#align(center)[
  #text(size: 8pt, fill: rgb("#666"))[
    Thank you for shopping with us!
    #linebreak()
    #v(0.3em)
    #data.at("footer_message", default: "Returns accepted within 30 days with receipt")
  ]
]

#v(0.8em)

// Barcode placeholder
#align(center)[
  #rect(width: 50mm, height: 8mm, stroke: 0.5pt + rgb("#ccc"))[
    #align(center + horizon)[#text(size: 7pt, fill: rgb("#999"))[#data.at("receipt_id", default: "001234")]]
  ]
]
