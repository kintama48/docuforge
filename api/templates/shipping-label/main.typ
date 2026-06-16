#import "design.typ": *

#let data = sys.inputs
#let brand = resolve-brand(data)

#set page(width: 4in, height: 6in, margin: (x: 0.18in, y: 0.1in))
#set text(font: "Inter Variable", size: 9pt, fill: INK)
#set block(spacing: 0pt)

// Carrier banner
#block(
  width: 100%,
  inset: (x: 10pt, y: 7pt),
  fill: brand,
  radius: (top-left: 4pt, top-right: 4pt),
)[
  #grid(
    columns: (1fr, auto),
    align: (left + horizon, right + horizon),
    text(size: 12pt, weight: 700, fill: white)[#data.at("carrier", default: "PRIORITY MAIL")],
    text(size: 8pt, fill: white, tracking: 0.05em)[#upper(data.at("service_type", default: "Express"))],
  )
]

#v(2pt)

// FROM
#block(
  width: 100%, inset: (x: 8pt, y: 5pt),
  stroke: 0.5pt + HAIRLINE, radius: 3pt, fill: CANVAS,
)[
  #caption[From]
  #v(2pt)
  #text(size: 9pt, weight: 600, fill: INK)[#data.at("from_name", default: "Sender")]
  #linebreak()
  #text(size: 8pt, fill: MUTED)[#data.at("from_address", default: "123 Street") · #data.at("from_city", default: "City, ST 12345")]
]

#v(2pt)

// TO
#block(
  width: 100%, inset: (x: 10pt, y: 7pt),
  stroke: 2pt + brand, radius: 4pt,
)[
  #caption[Ship to]
  #v(2pt)
  #text(size: 13pt, weight: 700, fill: INK)[#data.at("to_name", default: "Recipient Name")]
  #v(2pt)
  #text(size: 10pt, fill: INK)[
    #data.at("to_address", default: "456 Destination Ave") \
    #data.at("to_city", default: "City, ST 67890") · #upper(data.at("to_country", default: "USA"))
  ]
]

#v(2pt)

// Package specs row
#grid(
  columns: (1fr, 1fr, 1fr),
  column-gutter: 4pt,
  block(width: 100%, inset: (x: 6pt, y: 5pt), stroke: 0.5pt + HAIRLINE, radius: 3pt)[
    #caption[Weight]
    #v(1pt)
    #text(size: 11pt, weight: 700, fill: INK)[#data.at("weight", default: "2.5 lbs")]
  ],
  block(width: 100%, inset: (x: 6pt, y: 5pt), stroke: 0.5pt + HAIRLINE, radius: 3pt)[
    #caption[Dims]
    #v(1pt)
    #text(size: 10pt, weight: 700, fill: INK)[#data.at("dimensions", default: "12×8×6")]
  ],
  block(width: 100%, inset: (x: 6pt, y: 5pt), fill: CANVAS, radius: 3pt)[
    #caption[Ship date]
    #v(1pt)
    #text(size: 9pt, weight: 600, fill: INK)[#data.at("ship_date", default: "Jun 16")]
  ],
)

#v(2pt)

// Tracking
#block(
  width: 100%, inset: (x: 8pt, y: 6pt),
  stroke: 0.5pt + HAIRLINE, radius: 3pt,
)[
  #grid(
    columns: (auto, 1fr),
    column-gutter: 8pt,
    align: (left + horizon, right + horizon),
    caption[Tracking],
    text(font: "JetBrains Mono", size: 11pt, weight: 700, fill: INK)[
      #data.at("tracking_number", default: "1Z999AA10123456784")
    ],
  )
]

#v(2pt)
#line(length: 100%, stroke: 0.5pt + HAIRLINE)
#v(2pt)
#grid(
  columns: (1fr, 1fr),
  caption[Order: #data.at("order_id", default: "ORD-001")],
  align(right)[#caption[Ref: #data.at("reference", default: "REF-001")]],
)
