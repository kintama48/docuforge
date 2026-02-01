// Complex layout testing - columns, positioning, page breaks, headers, footers
#let page-count = state("page-count", 0)

#set page(
  paper: "a4",
  margin: (top: 3cm, bottom: 2.5cm, left: 2.5cm, right: 2.5cm),
  header: context {
    if counter(page).get().first() > 1 [
      #grid(
        columns: (1fr, auto, 1fr),
        align: (left, center, right),
        [#text(size: 9pt, fill: gray)[#sys.inputs.document.company]],
        [#text(size: 9pt, weight: "bold")[#sys.inputs.document.title]],
        [#text(size: 9pt, fill: gray)[#sys.inputs.document.date]],
      )
      #v(-0.5em)
      #line(length: 100%, stroke: 0.5pt + luma(200))
    ]
  },
  footer: context {
    let current = counter(page).get().first()
    let total = counter(page).final().first()
    [
      #line(length: 100%, stroke: 0.5pt + luma(200))
      #v(0.3em)
      #grid(
        columns: (1fr, auto, 1fr),
        align: (left, center, right),
        [
          #text(size: 8pt, fill: gray)[
            #if sys.inputs.document.confidential [CONFIDENTIAL] else [PUBLIC]
          ]
        ],
        [#text(size: 9pt)[Page #current of #total]],
        [#text(size: 8pt, fill: gray)[Document ID: #sys.inputs.document.id]],
      )
    ]
  },
  background: context {
    if sys.inputs.document.draft [
      place(
        center + horizon,
        rotate(45deg, text(size: 72pt, fill: luma(230), weight: "bold")[DRAFT])
      )
    ]
  },
)

#set text(font: "Inter", size: 10pt)
#set par(justify: true)

// =============================================================================
// TITLE PAGE (Special layout, no header)
// =============================================================================

#set page(header: none, footer: none)

#align(center + horizon)[
  #block(width: 80%)[
    #text(size: 14pt, fill: gray)[#sys.inputs.document.company]

    #v(2em)

    #rect(
      width: 100%,
      inset: 20pt,
      stroke: 2pt + rgb("#2563eb"),
      radius: 4pt,
    )[
      #text(size: 28pt, weight: "bold")[#sys.inputs.document.title]

      #v(1em)

      #text(size: 14pt, fill: gray)[#sys.inputs.document.subtitle]
    ]

    #v(3em)

    #grid(
      columns: (1fr, 1fr),
      gutter: 2em,

      align(right)[
        *Author:* \
        *Department:* \
        *Version:* \
        *Date:*
      ],
      align(left)[
        #sys.inputs.document.author \
        #sys.inputs.document.department \
        #sys.inputs.document.version \
        #sys.inputs.document.date
      ],
    )

    #v(2em)

    #if sys.inputs.document.confidential [
      #rect(
        inset: 10pt,
        stroke: 2pt + red,
        fill: red.lighten(90%),
      )[
        #text(fill: red, weight: "bold", size: 12pt)[CONFIDENTIAL]
      ]
    ]
  ]
]

#pagebreak()

// =============================================================================
// TWO-COLUMN LAYOUT SECTION
// =============================================================================

// Reset page settings with header/footer
#set page(
  header: context {
    if counter(page).get().first() > 1 [
      #grid(
        columns: (1fr, auto, 1fr),
        align: (left, center, right),
        [#text(size: 9pt, fill: gray)[#sys.inputs.document.company]],
        [#text(size: 9pt, weight: "bold")[#sys.inputs.document.title]],
        [#text(size: 9pt, fill: gray)[#sys.inputs.document.date]],
      )
      #v(-0.5em)
      #line(length: 100%, stroke: 0.5pt + luma(200))
    ]
  },
)

= Two-Column Layout

This section demonstrates a two-column layout often used in academic papers and newsletters.

#v(1em)

#columns(2, gutter: 1.5em)[
  == Left Column Content

  #sys.inputs.columns.left_content

  #for item in sys.inputs.columns.left_items [
    - #item
  ]

  == Right Column Content

  #colbreak()

  #sys.inputs.columns.right_content

  #for item in sys.inputs.columns.right_items [
    - #item
  ]
]

#v(1em)

// =============================================================================
// THREE-COLUMN LAYOUT
// =============================================================================

= Three-Column Layout

#columns(3, gutter: 1em)[
  === Column 1

  #text(size: 9pt)[
    #sys.inputs.three_columns.at(0)
  ]

  #colbreak()

  === Column 2

  #text(size: 9pt)[
    #sys.inputs.three_columns.at(1)
  ]

  #colbreak()

  === Column 3

  #text(size: 9pt)[
    #sys.inputs.three_columns.at(2)
  ]
]

#pagebreak()

// =============================================================================
// GRID LAYOUTS
// =============================================================================

= Grid Layouts

== Simple Grid

#grid(
  columns: (1fr, 1fr, 1fr),
  rows: (auto, auto),
  gutter: 1em,

  ..sys.inputs.grid_items.map(item => [
    #rect(
      width: 100%,
      inset: 10pt,
      stroke: 0.5pt + luma(180),
      fill: luma(250),
      radius: 4pt,
    )[
      #text(weight: "bold")[#item.title]
      #v(0.3em)
      #text(size: 9pt)[#item.description]
    ]
  ])
)

#v(1em)

== Asymmetric Grid

#grid(
  columns: (2fr, 1fr),
  gutter: 1.5em,

  [
    #rect(
      width: 100%,
      height: 150pt,
      inset: 12pt,
      stroke: 1pt + rgb("#2563eb"),
      fill: rgb("#2563eb").lighten(95%),
    )[
      *Main Content Area*

      #sys.inputs.asymmetric.main_content
    ]
  ],
  [
    #rect(
      width: 100%,
      height: 150pt,
      inset: 12pt,
      stroke: 1pt + luma(180),
      fill: luma(248),
    )[
      *Sidebar*

      #for item in sys.inputs.asymmetric.sidebar_items [
        - #item
      ]
    ]
  ],
)

#v(2em)

// =============================================================================
// FLOATING AND POSITIONING
// =============================================================================

= Positioned Elements

#rect(
  width: 100%,
  height: 200pt,
  stroke: 0.5pt + luma(180),
  inset: 0pt,
)[
  // Background content
  #align(center + horizon)[
    #text(fill: luma(220), size: 14pt)[Background Area]
  ]

  // Positioned elements using place
  #place(top + left, dx: 10pt, dy: 10pt)[
    #rect(
      width: 80pt,
      height: 40pt,
      fill: blue.lighten(80%),
      stroke: 1pt + blue,
      inset: 5pt,
    )[
      #text(size: 8pt)[Top-Left]
    ]
  ]

  #place(top + right, dx: -10pt, dy: 10pt)[
    #rect(
      width: 80pt,
      height: 40pt,
      fill: green.lighten(80%),
      stroke: 1pt + green,
      inset: 5pt,
    )[
      #text(size: 8pt)[Top-Right]
    ]
  ]

  #place(bottom + left, dx: 10pt, dy: -10pt)[
    #rect(
      width: 80pt,
      height: 40pt,
      fill: orange.lighten(80%),
      stroke: 1pt + orange,
      inset: 5pt,
    )[
      #text(size: 8pt)[Bottom-Left]
    ]
  ]

  #place(bottom + right, dx: -10pt, dy: -10pt)[
    #rect(
      width: 80pt,
      height: 40pt,
      fill: purple.lighten(80%),
      stroke: 1pt + purple,
      inset: 5pt,
    )[
      #text(size: 8pt)[Bottom-Right]
    ]
  ]

  #place(center + horizon)[
    #circle(
      radius: 30pt,
      fill: red.lighten(80%),
      stroke: 2pt + red,
    )[
      #align(center + horizon)[
        #text(size: 8pt)[Center]
      ]
    ]
  ]
]

#pagebreak()

// =============================================================================
// PAGE BREAK CONTROLS
// =============================================================================

= Page Break Examples

== Content Before Break

This content appears before a page break. The next section will start on a new page.

#pagebreak()

== Content After Break

This content appears after a page break. It should be at the top of a new page.

#v(1em)

=== Conditional Page Break

The following uses weak page break that only triggers if near the bottom of the page.

#lorem(50)

#pagebreak(weak: true)

=== After Weak Break

This content may or may not be on a new page depending on where the previous content ended.

// =============================================================================
// MARGINS AND PADDING DEMONSTRATION
// =============================================================================

#pagebreak()

= Margins and Padding

== Box with Various Insets

#grid(
  columns: (1fr, 1fr),
  gutter: 1em,

  [
    *Small Inset (5pt)*
    #rect(
      width: 100%,
      stroke: 1pt,
      inset: 5pt,
    )[Content with small inset]
  ],
  [
    *Large Inset (20pt)*
    #rect(
      width: 100%,
      stroke: 1pt,
      inset: 20pt,
    )[Content with large inset]
  ],
  [
    *Asymmetric Inset*
    #rect(
      width: 100%,
      stroke: 1pt,
      inset: (left: 20pt, right: 5pt, top: 10pt, bottom: 30pt),
    )[Content with asymmetric inset]
  ],
  [
    *Outset (Negative Margin)*
    #rect(
      width: 100%,
      stroke: 1pt,
      inset: 10pt,
      outset: 5pt,
    )[Content with outset]
  ],
)

#v(2em)

// =============================================================================
// FIGURES WITH CAPTIONS
// =============================================================================

= Figures and Captions

#figure(
  rect(
    width: 200pt,
    height: 100pt,
    stroke: 1pt + luma(180),
    fill: luma(245),
    align(center + horizon, text(fill: gray)[Image Placeholder])
  ),
  caption: [This is a figure caption that describes the image above.],
)

#v(1em)

#figure(
  table(
    columns: 3,
    stroke: 0.5pt,
    inset: 8pt,
    [Header 1], [Header 2], [Header 3],
    [Data 1], [Data 2], [Data 3],
    [Data 4], [Data 5], [Data 6],
  ),
  caption: [This is a table with a caption.],
)

// =============================================================================
// FOOTNOTES
// =============================================================================

#pagebreak()

= Footnotes and Endnotes

This paragraph contains a footnote#footnote[This is the footnote content that appears at the bottom of the page.] to demonstrate the footnote functionality.

Here is another paragraph with multiple footnotes#footnote[First footnote.] including references#footnote[Second footnote with more detailed explanation of the reference.] to external sources.

// =============================================================================
// FINAL PAGE - DIFFERENT LAYOUT
// =============================================================================

#pagebreak()

#set page(
  columns: 1,
  margin: 3cm,
)

#align(center + horizon)[
  #rect(
    width: 80%,
    inset: 30pt,
    stroke: 2pt + luma(180),
    radius: 8pt,
  )[
    #text(size: 18pt, weight: "bold")[End of Document]

    #v(1em)

    #text(size: 11pt)[
      This document was generated using DocuForge.

      #v(0.5em)

      For questions or feedback, contact:
      #sys.inputs.document.contact_email
    ]

    #v(1em)

    #text(size: 9pt, fill: gray)[
      Version #sys.inputs.document.version |
      #sys.inputs.document.date
    ]
  ]
]
