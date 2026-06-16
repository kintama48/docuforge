#import "design.typ": *

#let data = sys.inputs
#let brand = resolve-brand(data)

#set page(paper: "a4", margin: (x: 18mm, top: 18mm, bottom: 18mm))
#set text(font: "Inter Variable", size: 9.5pt, fill: INK)

// ── Header ───────────────────────────────────────────────────────────────────
#grid(
  columns: (1fr, auto),
  align: (left + top, right + top),
  [
    #brand-strip(brand)
    #v(10pt)
    #text(size: 20pt, weight: 700, fill: INK)[Packing Slip]
    #v(2pt)
    #text(font: "JetBrains Mono", size: 10pt, fill: MUTED)[#data.at("order_id", default: "ORD-0001")]
  ],
  [
    #set align(right)
    #text(size: 11pt, weight: 700)[#data.at("warehouse_name", default: "Warehouse")]
    #v(2pt)
    #text(size: 8.5pt, fill: MUTED)[
      Packed: #data.at("pack_date", default: "Jun 16, 2026") \
      Picker: #data.at("picker_id", default: "W-001")
    ]
  ],
)

#v(10pt)
#line(length: 100%, stroke: 0.5pt + HAIRLINE)
#v(10pt)

// ── From / Ship To ───────────────────────────────────────────────────────────
#grid(
  columns: (1fr, 1fr),
  column-gutter: 16pt,
  block(
    width: 100%, inset: 10pt,
    stroke: 0.5pt + HAIRLINE, radius: 3pt, fill: CANVAS,
  )[
    #caption[Ship from]
    #v(4pt)
    #text(weight: 600)[#data.at("from_name", default: "Sender LLC")]
    #v(2pt)
    #text(size: 8.5pt, fill: MUTED)[
      #data.at("from_address", default: "123 Warehouse Way") \
      #data.at("from_city", default: "City, ST 12345")
    ]
  ],
  block(
    width: 100%, inset: 10pt,
    stroke: 1.5pt + brand, radius: 3pt,
  )[
    #caption[Ship to]
    #v(4pt)
    #text(weight: 600)[#data.at("to_name", default: "Customer")]
    #v(2pt)
    #text(size: 8.5pt, fill: MUTED)[
      #data.at("to_address", default: "456 Customer Ave") \
      #data.at("to_city", default: "City, ST 67890")
    ]
  ],
)

#v(12pt)

// ── Items Table ──────────────────────────────────────────────────────────────
#let items = data.at("items", default: ())

#table(
  columns: (auto, 1fr, auto, auto, auto),
  stroke: none,
  inset: (x: 8pt, y: 8pt),
  fill: (_, row) => if row == 0 { CANVAS } else if calc.odd(row) { white } else { rgb("#f8fafc") },
  align: (center, left, center, center, center),
  // Header
  text(size: 8.5pt, weight: 600, fill: MUTED)[#upper("SKU")],
  text(size: 8.5pt, weight: 600, fill: MUTED)[#upper("Description")],
  text(size: 8.5pt, weight: 600, fill: MUTED)[#upper("Ordered")],
  text(size: 8.5pt, weight: 600, fill: MUTED)[#upper("Picked")],
  text(size: 8.5pt, weight: 600, fill: MUTED)[#upper("✓")],
  ..items.map(it => {
    let ordered = it.at("qty_ordered", default: 1)
    let picked = it.at("qty_picked", default: ordered)
    let ok = ordered == picked
    (
      text(font: "JetBrains Mono", size: 8.5pt, fill: MUTED)[#it.at("sku", default: "—")],
      body-text(it.at("description", default: "Item")),
      text(font: "JetBrains Mono", size: 9.5pt)[#ordered],
      text(font: "JetBrains Mono", size: 9.5pt, fill: if ok { SUCCESS } else { DANGER })[#picked],
      text(size: 10pt)[#if ok [✓] else [✗]],
    )
  }).flatten(),
)

#line(length: 100%, stroke: 0.5pt + HAIRLINE)
#v(8pt)

// ── Summary + Notes ──────────────────────────────────────────────────────────
#grid(
  columns: (1fr, auto),
  align: (left, right),
  [
    #if "notes" in data and data.notes != none [
      #caption[Notes]
      #v(4pt)
      #text(size: 9pt, fill: MUTED)[#data.notes]
    ]
  ],
  [
    #table(
      columns: (auto, auto),
      stroke: none,
      inset: (x: 6pt, y: 3pt),
      align: (right, right),
      caption[Total items], text(font: "JetBrains Mono", size: 10pt, weight: 600)[#str(items.len())],
      caption[Total units], text(font: "JetBrains Mono", size: 10pt, weight: 600)[#str(items.fold(0, (acc, it) => acc + it.at("qty_picked", default: it.at("qty_ordered", default: 1))))],
    )
  ],
)

#v(16pt)
#line(length: 100%, stroke: (dash: "dotted", thickness: 0.5pt, paint: HAIRLINE))
#v(8pt)

// ── Picker sign-off ──────────────────────────────────────────────────────────
#grid(
  columns: (1fr, 1fr, 1fr),
  column-gutter: 12pt,
  [
    #line(length: 100%, stroke: 0.5pt + INK)
    #v(3pt)
    #caption[Picked by]
  ],
  [
    #line(length: 100%, stroke: 0.5pt + INK)
    #v(3pt)
    #caption[Verified by]
  ],
  [
    #line(length: 100%, stroke: 0.5pt + INK)
    #v(3pt)
    #caption[Date shipped]
  ],
)
