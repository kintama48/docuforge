#set page(width: 4in, height: 6in, margin: 0.25in)
#set text(font: "Inter", size: 10pt)

#let data = sys.inputs

// Top section with carrier info
#rect(width: 100%, fill: rgb("#1a1a2e"), inset: 8pt)[
  #text(fill: white, weight: "bold", size: 14pt)[#data.at("carrier", default: "PRIORITY MAIL")]
]

#v(0.5em)

// From address
#rect(width: 100%, stroke: 1pt + rgb("#ccc"), inset: 10pt)[
  #text(size: 8pt, fill: rgb("#666"), weight: "semibold")[FROM:]
  #v(0.2em)
  #text(size: 9pt)[
    #data.at("from_name", default: "Sender Name")
    #linebreak()
    #data.at("from_address", default: "123 Origin Street")
    #linebreak()
    #data.at("from_city", default: "Origin City, ST 12345")
    #linebreak()
    #data.at("from_country", default: "USA")
  ]
]

#v(0.5em)

// To address (larger)
#rect(width: 100%, stroke: 2pt + rgb("#1a1a2e"), inset: 12pt)[
  #text(size: 8pt, fill: rgb("#666"), weight: "semibold")[TO:]
  #v(0.3em)
  #text(size: 12pt, weight: "bold")[
    #data.at("to_name", default: "Recipient Name")
  ]
  #v(0.2em)
  #text(size: 11pt)[
    #data.at("to_address", default: "456 Destination Ave")
    #linebreak()
    #data.at("to_city", default: "Destination City, ST 67890")
    #linebreak()
    #text(weight: "semibold")[#data.at("to_country", default: "USA")]
  ]
]

#v(0.8em)

// Package info
#grid(
  columns: (1fr, 1fr),
  gutter: 0.5em,
  rect(width: 100%, stroke: 0.5pt + rgb("#ccc"), inset: 8pt)[
    #text(size: 7pt, fill: rgb("#666"))[WEIGHT]
    #linebreak()
    #text(size: 12pt, weight: "bold")[#data.at("weight", default: "2.5 lbs")]
  ],
  rect(width: 100%, stroke: 0.5pt + rgb("#ccc"), inset: 8pt)[
    #text(size: 7pt, fill: rgb("#666"))[DIMENSIONS]
    #linebreak()
    #text(size: 12pt, weight: "bold")[#data.at("dimensions", default: "12×8×6 in")]
  ],
)

#v(0.5em)

// Service type
#rect(width: 100%, fill: rgb("#f0f0f0"), inset: 8pt)[
  #grid(
    columns: (1fr, auto),
    text(size: 9pt, weight: "semibold")[#data.at("service_type", default: "2-Day Express")],
    text(size: 9pt, fill: rgb("#666"))[#data.at("ship_date", default: "01/15/2024")],
  )
]

#v(0.8em)

// Tracking barcode area
#align(center)[
  #rect(width: 90%, height: 0.8in, stroke: 0.5pt + rgb("#999"))[
    #align(center + horizon)[
      #text(size: 8pt, fill: rgb("#666"))[TRACKING BARCODE]
    ]
  ]
  #v(0.2em)
  #text(size: 11pt, weight: "bold", font: "JetBrains Mono")[#data.at("tracking_number", default: "1Z999AA10123456784")]
]

#v(0.5em)

// Special instructions
#if data.at("instructions", default: none) != none [
  #rect(width: 100%, stroke: 1pt + rgb("#ff6b6b"), inset: 6pt)[
    #text(size: 8pt, fill: rgb("#ff6b6b"), weight: "bold")[⚠ SPECIAL INSTRUCTIONS]
    #linebreak()
    #text(size: 8pt)[#data.instructions]
  ]
]

// Bottom section
#place(bottom)[
  #line(length: 100%, stroke: 0.5pt + rgb("#ccc"))
  #v(0.3em)
  #grid(
    columns: (1fr, 1fr),
    text(size: 7pt, fill: rgb("#999"))[Order: #data.at("order_id", default: "ORD-12345")],
    align(right)[#text(size: 7pt, fill: rgb("#999"))[#data.at("reference", default: "REF-001")]],
  )
]
