#import "design.typ": *

#let data = sys.inputs
#let brand = resolve-brand(data)
#let gold = rgb("#b8860b")
#let gold-light = rgb("#fef9e7")

#set page(paper: "a4", flipped: true, margin: (x: 2cm, y: 1.5cm))
#set text(font: "Inter Variable", size: 11pt, fill: INK)

// Outer decorative border
#place(top + left, dx: 0pt, dy: 0pt)[
  #rect(
    width: 100%,
    height: 100%,
    stroke: none,
    fill: gradient.linear(rgb("#f8fafc"), white, angle: 135deg),
  )
]

#place(top + left, dx: 10pt, dy: 10pt)[
  #block(
    width: 100% - 20pt,
    height: 100% - 20pt,
    stroke: 3pt + brand,
    radius: 4pt,
  )[]
]

#place(top + left, dx: 18pt, dy: 18pt)[
  #block(
    width: 100% - 36pt,
    height: 100% - 36pt,
    stroke: 1pt + gold,
    radius: 2pt,
  )[]
]

// Content centered on page
#align(center + horizon)[
  #v(-0.5cm)

  // Decorative top mark
  #text(size: 20pt, fill: gold)[— ✦ —]

  #v(0.4cm)

  // Preamble
  #text(size: 10pt, fill: MUTED, tracking: 0.25em, weight: 500)[#upper("Certificate of")]

  #v(0.3cm)

  // Main title
  #text(size: 34pt, weight: 700, fill: brand)[
    #data.at("certificate_type", default: "Achievement")
  ]

  #v(0.5cm)

  // Presentation line
  #text(size: 11pt, fill: MUTED)[This certificate is proudly presented to]

  #v(0.4cm)

  // Recipient
  #block(
    width: 70%,
    inset: (x: 0pt, y: 8pt),
    below: 0pt,
    stroke: (bottom: 1.5pt + gold),
  )[
    #align(center)[
      #text(size: 28pt, weight: 700, fill: INK, style: "italic")[
        #data.at("recipient_name", default: "Recipient Name")
      ]
    ]
  ]

  #v(0.6cm)

  // Description
  #block(width: 65%)[
    #align(center)[
      #set par(leading: 0.9em)
      #text(size: 11pt, fill: INK)[
        #data.at("description", default: "for successfully completing the requirements and demonstrating excellence in the designated program.")
      ]
    ]
  ]

  #v(0.7cm)

  // Bottom row: date | cert ID | signature
  #block(width: 80%)[
    #grid(
      columns: (1fr, 1fr, 1fr),
      column-gutter: 1cm,
      align: center,
      [
        #text(size: 12pt, weight: 600, fill: INK)[#data.at("date", default: "June 16, 2026")]
        #v(4pt)
        #line(length: 70%, stroke: 0.5pt + MUTED)
        #v(4pt)
        #caption[Date]
      ],
      [
        #text(size: 11pt, font: "JetBrains Mono", fill: INK)[#data.at("certificate_id", default: "CERT-2026-001")]
        #v(4pt)
        #line(length: 70%, stroke: 0.5pt + MUTED)
        #v(4pt)
        #caption[Certificate ID]
      ],
      [
        #if "issuer_name" in data and data.issuer_name != none [
          #text(size: 12pt, weight: 600, style: "italic", fill: INK)[#data.issuer_name]
        ] else [
          #v(1.5em)
        ]
        #v(4pt)
        #line(length: 70%, stroke: 0.5pt + MUTED)
        #v(4pt)
        #caption[#data.at("issuer_title", default: "Authorized Signature")]
      ],
    )
  ]

  #v(0.5cm)

  // Issuing organization
  #text(size: 13pt, weight: 700, fill: brand)[
    #data.at("organization", default: "Organization Name")
  ]

  #v(0.3cm)
  #text(size: 18pt, fill: gold)[— ✦ —]
]

// Seal (bottom-right)
#place(bottom + right, dx: -2.2cm, dy: -2.2cm)[
  #circle(radius: 1.1cm, stroke: 2pt + gold, fill: gold-light)
  #place(center + horizon, dx: -1.1cm, dy: -1.1cm)[
    #align(center)[
      #text(size: 7pt, fill: gold, weight: 700, tracking: 0.08em)[#upper("Official")]
      #linebreak()
      #text(size: 6pt, fill: gold)[Seal]
    ]
  ]
]
