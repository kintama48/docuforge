// Table stress test - wide tables, long tables, nested tables
#set page(
  paper: "a4",
  margin: 1.5cm,
  flipped: true, // Landscape for wide tables
  footer: context [
    #set align(center)
    #set text(size: 8pt)
    Table Stress Test | Page #counter(page).display() of #counter(page).final().first()
  ],
)

#set text(font: "Inter", size: 9pt)

= Table Stress Test Document

This document tests various table scenarios to ensure robust rendering.

#v(1em)

== 1. Wide Table (10+ Columns)

#table(
  columns: (auto, ..range(10).map(_ => 1fr)),
  stroke: 0.5pt + luma(180),
  inset: 6pt,
  align: center,
  fill: (x, y) => if y == 0 { luma(230) } else if calc.odd(y) { white } else { luma(248) },

  // Header row
  [*Row*], [*Col 1*], [*Col 2*], [*Col 3*], [*Col 4*], [*Col 5*],
  [*Col 6*], [*Col 7*], [*Col 8*], [*Col 9*], [*Col 10*],

  // Data rows from input
  ..sys.inputs.wide_table_data.map(row => (
    str(row.id),
    str(row.col1),
    str(row.col2),
    str(row.col3),
    str(row.col4),
    str(row.col5),
    str(row.col6),
    str(row.col7),
    str(row.col8),
    str(row.col9),
    str(row.col10),
  )).flatten()
)

#pagebreak()

== 2. Long Table (20+ Rows)

This table spans multiple pages to test page break handling.

#table(
  columns: (auto, 2fr, 1fr, 1fr, 1fr),
  stroke: 0.5pt + luma(180),
  inset: 7pt,
  align: (center, left, right, right, center),
  fill: (x, y) => if y == 0 { rgb("#2563eb").lighten(80%) } else if calc.odd(y) { white } else { luma(250) },

  // Header
  [*\#*], [*Product Name*], [*Price*], [*Quantity*], [*Status*],

  // Data rows
  ..sys.inputs.long_table_data.enumerate().map(((i, row)) => (
    str(i + 1),
    row.name,
    [\$#calc.round(row.price, digits: 2)],
    str(row.quantity),
    [
      #let status-color = if row.status == "active" { green } else if row.status == "pending" { orange } else { red }
      #text(fill: status-color)[#row.status]
    ],
  )).flatten()
)

#pagebreak()

== 3. Varying Cell Widths

#table(
  columns: (50pt, 1fr, 2fr, 80pt),
  stroke: 0.5pt + luma(180),
  inset: 8pt,

  [*ID*], [*Short*], [*Long Description Column with More Text*], [*Amount*],

  ..sys.inputs.varying_width_data.map(row => (
    str(row.id),
    row.short,
    row.long_description,
    [\$#calc.round(row.amount, digits: 2)],
  )).flatten()
)

#v(2em)

== 4. Nested Tables

#table(
  columns: (1fr, 2fr),
  stroke: 1pt + luma(150),
  inset: 10pt,

  [*Category*], [*Details*],

  ..sys.inputs.nested_data.map(category => (
    [
      #text(weight: "bold")[#category.name]
      #v(0.3em)
      #text(size: 8pt, fill: gray)[#category.description]
    ],
    [
      // Nested table inside cell
      #table(
        columns: (1fr, auto),
        stroke: 0.5pt + luma(200),
        inset: 5pt,
        fill: luma(252),

        [*Item*], [*Value*],
        ..category.items.map(item => (
          item.label,
          str(item.value),
        )).flatten()
      )
    ],
  )).flatten()
)

#v(2em)

== 5. Table with Complex Cell Content

#table(
  columns: (1fr, 2fr, 1fr),
  stroke: 0.5pt + luma(180),
  inset: 10pt,
  align: (center, left, center),
  fill: (x, y) => if y == 0 { luma(235) } else { white },

  [*Type*], [*Content*], [*Rating*],

  ..sys.inputs.complex_cells.map(row => (
    [
      #text(weight: "bold", fill: rgb("#2563eb"))[#row.type]
    ],
    [
      #row.title
      #v(0.3em)
      #text(size: 8pt)[#row.description]
      #if row.tags != none [
        #v(0.3em)
        #for tag in row.tags [
          #box(
            fill: luma(230),
            inset: (x: 4pt, y: 2pt),
            radius: 2pt,
          )[#text(size: 7pt)[#tag]]
          #h(3pt)
        ]
      ]
    ],
    [
      #let stars = row.rating
      #for _ in range(stars) [#text(fill: orange)[#sym.star.filled]#h(1pt)]
      #for _ in range(5 - stars) [#text(fill: luma(200))[#sym.star]#h(1pt)]
      #v(0.2em)
      #text(size: 8pt, fill: gray)[(#stars/5)]
    ],
  )).flatten()
)

#pagebreak()

== 6. Table with Merged-Like Layout

This simulates complex layouts often needed in forms.

#table(
  columns: (1fr, 1fr, 1fr, 1fr),
  stroke: 0.5pt + luma(180),
  inset: 8pt,

  // Row 1: Full width header
  table.cell(colspan: 4, fill: luma(230))[
    #align(center)[*#sys.inputs.form_data.title*]
  ],

  // Row 2: Two columns spanning two each
  table.cell(colspan: 2)[
    *Name:* #sys.inputs.form_data.name
  ],
  table.cell(colspan: 2)[
    *Date:* #sys.inputs.form_data.date
  ],

  // Row 3: Four equal columns
  [*Field 1*], [#sys.inputs.form_data.field1],
  [*Field 2*], [#sys.inputs.form_data.field2],

  // Row 4: Label spanning 1, value spanning 3
  table.cell(fill: luma(245))[*Address:*],
  table.cell(colspan: 3)[#sys.inputs.form_data.address],

  // Row 5: Notes spanning all
  table.cell(colspan: 4, fill: luma(248))[
    *Notes:*
    #v(0.3em)
    #sys.inputs.form_data.notes
  ],
)

#v(2em)

== 7. Empty Table Edge Case

#let empty_data = sys.inputs.empty_table_data

#table(
  columns: (1fr, 1fr, 1fr),
  stroke: 0.5pt + luma(180),
  inset: 8pt,

  [*Column A*], [*Column B*], [*Column C*],

  ..if empty_data.len() == 0 {
    (table.cell(colspan: 3, fill: luma(248))[
      #align(center)[
        #text(fill: gray)[No data available]
      ]
    ],)
  } else {
    empty_data.map(row => (row.a, row.b, row.c)).flatten()
  }
)

#v(2em)

== 8. Table with Numeric Formatting

#table(
  columns: (auto, 1fr, auto, auto, auto),
  stroke: 0.5pt + luma(180),
  inset: 8pt,
  align: (center, left, right, right, right),
  fill: (x, y) => if y == 0 { luma(230) } else { white },

  [*\#*], [*Description*], [*Quantity*], [*Unit Price*], [*Total*],

  ..sys.inputs.numeric_data.enumerate().map(((i, row)) => (
    str(i + 1),
    row.description,
    [#row.quantity],
    [\$#calc.round(row.unit_price, digits: 2)],
    [*\$#calc.round(row.quantity * row.unit_price, digits: 2)*],
  )).flatten(),

  // Summary row
  table.cell(colspan: 4, fill: luma(240))[
    #align(right)[*Grand Total:*]
  ],
  table.cell(fill: luma(240))[
    *\$#calc.round(sys.inputs.numeric_data.map(r => r.quantity * r.unit_price).sum(), digits: 2)*
  ],
)
