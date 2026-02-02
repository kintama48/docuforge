#set page(paper: "a4", flipped: true, margin: 1.5cm)
#set text(font: "Inter")

#let data = sys.inputs

// Background border
#place(top + left, dx: 0cm, dy: 0cm)[
  #rect(
    width: 100%,
    height: 100%,
    stroke: none,
    fill: gradient.linear(rgb("#f8f9fa"), rgb("#ffffff"), angle: 45deg),
  )
]

// Decorative border
#place(top + left, dx: 0.5cm, dy: 0.5cm)[
  #rect(
    width: calc.min(100%, 27.7cm - 1cm),
    height: calc.min(100%, 19cm - 1cm),
    stroke: 3pt + rgb("#1a1a2e"),
    radius: 5pt,
  )
]

#place(top + left, dx: 0.8cm, dy: 0.8cm)[
  #rect(
    width: calc.min(100%, 27.7cm - 1.6cm),
    height: calc.min(100%, 19cm - 1.6cm),
    stroke: 1pt + rgb("#d4af37"),
    radius: 3pt,
  )
]

// Content
#align(center + horizon)[
  #v(-1cm)

  // Header ornament
  #text(size: 24pt, fill: rgb("#d4af37"))[✦ ✦ ✦]

  #v(0.5cm)

  // Certificate title
  #text(size: 16pt, fill: rgb("#666"), tracking: 0.3em, weight: "medium")[CERTIFICATE OF]

  #v(0.3cm)

  #text(size: 36pt, weight: "bold", fill: rgb("#1a1a2e"))[
    #data.at("certificate_type", default: "ACHIEVEMENT")
  ]

  #v(0.8cm)

  #text(size: 12pt, fill: rgb("#666"))[This is to certify that]

  #v(0.5cm)

  // Recipient name
  #text(size: 32pt, weight: "bold", fill: rgb("#1a1a2e"), style: "italic")[
    #data.at("recipient_name", default: "Recipient Name")
  ]

  #v(0.3cm)

  #line(length: 50%, stroke: 1pt + rgb("#d4af37"))

  #v(0.8cm)

  // Description
  #block(width: 70%)[
    #text(size: 13pt, fill: rgb("#444"))[
      #data.at("description", default: "has successfully completed the requirements and demonstrated excellence in the designated program.")
    ]
  ]

  #v(1cm)

  // Date and details
  #grid(
    columns: (1fr, 1fr, 1fr),
    column-gutter: 2cm,
    align: center,

    // Date
    [
      #text(size: 12pt, weight: "semibold")[#data.at("date", default: "January 15, 2024")]
      #v(0.2cm)
      #line(length: 80%, stroke: 0.5pt + rgb("#999"))
      #v(0.1cm)
      #text(size: 9pt, fill: rgb("#666"))[Date]
    ],

    // Certificate ID
    [
      #text(size: 12pt, weight: "semibold")[#data.at("certificate_id", default: "CERT-2024-001")]
      #v(0.2cm)
      #line(length: 80%, stroke: 0.5pt + rgb("#999"))
      #v(0.1cm)
      #text(size: 9pt, fill: rgb("#666"))[Certificate ID]
    ],

    // Issuer signature
    [
      #if data.at("issuer_name", default: none) != none [
        #text(size: 12pt, style: "italic")[#data.issuer_name]
      ] else [
        #v(0.5cm)
      ]
      #v(0.2cm)
      #line(length: 80%, stroke: 0.5pt + rgb("#999"))
      #v(0.1cm)
      #text(size: 9pt, fill: rgb("#666"))[#data.at("issuer_title", default: "Authorized Signature")]
    ],
  )

  #v(0.8cm)

  // Organization
  #text(size: 14pt, weight: "semibold", fill: rgb("#1a1a2e"))[
    #data.at("organization", default: "Organization Name")
  ]

  #v(0.3cm)

  // Footer ornament
  #text(size: 18pt, fill: rgb("#d4af37"))[❧]
]

// Seal placeholder (bottom right)
#place(bottom + right, dx: -2cm, dy: -2cm)[
  #circle(
    radius: 1.2cm,
    stroke: 2pt + rgb("#d4af37"),
    fill: rgb("#fffbeb"),
  )
  #place(center + horizon, dx: -1.2cm, dy: -1.2cm)[
    #align(center)[
      #text(size: 8pt, fill: rgb("#d4af37"), weight: "bold")[OFFICIAL]
      #linebreak()
      #text(size: 6pt, fill: rgb("#d4af37"))[SEAL]
    ]
  ]
]
