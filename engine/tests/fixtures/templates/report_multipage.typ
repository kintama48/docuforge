// Multi-page report template with table of contents, multiple sections
#set document(
  title: sys.inputs.title,
  author: sys.inputs.author,
)

#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2.5cm, left: 2.5cm, right: 2.5cm),
  header: context {
    if counter(page).get().first() > 1 [
      #set text(size: 9pt, fill: gray)
      #sys.inputs.title
      #h(1fr)
      #sys.inputs.company
    ]
  },
  footer: context {
    if counter(page).get().first() > 1 [
      #set align(center)
      #set text(size: 9pt, fill: gray)
      #line(length: 100%, stroke: 0.5pt + luma(200))
      #v(0.3em)
      Page #counter(page).display() of #counter(page).final().first()
    ]
  },
)

#set text(font: "Inter", size: 11pt, hyphenate: true)
#set par(justify: true, leading: 0.65em)
#set heading(numbering: "1.1")

// =============================================================================
// TITLE PAGE
// =============================================================================

#align(center + horizon)[
  #block(width: 100%)[
    #v(2em)

    #text(size: 14pt, fill: gray, weight: "medium")[
      #sys.inputs.company
    ]

    #v(2em)

    #text(size: 32pt, weight: "bold")[
      #sys.inputs.title
    ]

    #v(1em)

    #text(size: 16pt, fill: gray)[
      #sys.inputs.subtitle
    ]

    #v(4em)

    #line(length: 50%, stroke: 2pt + rgb("#2563eb"))

    #v(2em)

    #text(size: 12pt)[
      Prepared by: *#sys.inputs.author* \
      Department: #sys.inputs.department \
      Date: #sys.inputs.date \
      Version: #sys.inputs.version
    ]

    #v(2em)

    #if sys.inputs.confidential [
      #rect(
        stroke: 2pt + red,
        inset: 10pt,
        fill: rgb("#fef2f2"),
      )[
        #text(fill: red, weight: "bold")[CONFIDENTIAL]
      ]
    ]
  ]
]

#pagebreak()

// =============================================================================
// TABLE OF CONTENTS
// =============================================================================

#align(center)[
  #text(size: 20pt, weight: "bold")[Table of Contents]
]

#v(2em)

#outline(
  title: none,
  indent: 1.5em,
  depth: 3,
)

#pagebreak()

// =============================================================================
// EXECUTIVE SUMMARY
// =============================================================================

= Executive Summary

#sys.inputs.executive_summary

#if sys.inputs.key_findings != none [
  #v(1em)

  == Key Findings

  #for finding in sys.inputs.key_findings [
    - *#finding.title:* #finding.description
  ]
]

#pagebreak()

// =============================================================================
// INTRODUCTION
// =============================================================================

= Introduction

== Background

#sys.inputs.introduction.background

== Purpose

#sys.inputs.introduction.purpose

== Scope

#sys.inputs.introduction.scope

#if sys.inputs.introduction.methodology != none [
  == Methodology

  #sys.inputs.introduction.methodology
]

#pagebreak()

// =============================================================================
// MAIN CONTENT SECTIONS
// =============================================================================

#for section in sys.inputs.sections [
  = #section.title

  #section.content

  #if section.subsections != none [
    #for subsec in section.subsections [
      == #subsec.title

      #subsec.content

      #if subsec.bullet_points != none [
        #for point in subsec.bullet_points [
          - #point
        ]
      ]

      #if subsec.numbered_list != none [
        #for (i, item) in subsec.numbered_list.enumerate() [
          + #item
        ]
      ]

      #if subsec.code_block != none [
        #v(0.5em)
        #block(
          fill: luma(245),
          inset: 10pt,
          radius: 4pt,
          width: 100%,
        )[
          #text(font: "JetBrains Mono", size: 9pt)[
            #raw(subsec.code_block.code, lang: subsec.code_block.language)
          ]
        ]
        #v(0.5em)
      ]
    ]
  ]

  #if section.table != none [
    #v(1em)

    #figure(
      caption: section.table.caption,
      table(
        columns: section.table.columns,
        stroke: 0.5pt + luma(200),
        inset: 8pt,
        align: (x, y) => if y == 0 { center } else { left },
        fill: (x, y) => if y == 0 { luma(240) } else { white },
        ..section.table.headers.map(h => [*#h*]),
        ..section.table.rows.flatten(),
      )
    )

    #v(1em)
  ]

  #if section.pagebreak [
    #pagebreak()
  ]
]

// =============================================================================
// DATA ANALYSIS SECTION
// =============================================================================

#if sys.inputs.data_analysis != none [
  = Data Analysis

  #sys.inputs.data_analysis.overview

  == Statistical Summary

  #table(
    columns: (1fr, auto, auto, auto, auto),
    stroke: 0.5pt + luma(200),
    inset: 8pt,
    fill: (x, y) => if y == 0 { luma(240) } else if calc.odd(y) { white } else { luma(252) },

    [*Metric*], [*Min*], [*Max*], [*Average*], [*Median*],
    ..sys.inputs.data_analysis.metrics.map(m => (
      m.name,
      str(m.min),
      str(m.max),
      str(m.average),
      str(m.median)
    )).flatten(),
  )

  #pagebreak()
]

// =============================================================================
// CONCLUSIONS
// =============================================================================

= Conclusions

#sys.inputs.conclusions

#v(1em)

= Recommendations

#for (i, rec) in sys.inputs.recommendations.enumerate() [
  #block(
    inset: (left: 1em),
    above: 0.8em,
  )[
    *Recommendation #(i + 1):* #rec.title

    #text(size: 10pt)[
      #rec.description

      #if rec.priority != none [
        _Priority: #rec.priority _
      ]
    ]
  ]
]

#pagebreak()

// =============================================================================
// APPENDICES
// =============================================================================

#if sys.inputs.appendices != none [
  = Appendices

  #for (i, appendix) in sys.inputs.appendices.enumerate() [
    == Appendix #numbering("A", i + 1): #appendix.title

    #appendix.content

    #v(1em)
  ]
]

// =============================================================================
// REFERENCES
// =============================================================================

#if sys.inputs.references != none [
  = References

  #for (i, ref) in sys.inputs.references.enumerate() [
    #block(
      inset: (left: 2em),
      above: 0.5em,
    )[
      \[#(i + 1)\] #ref.author (#ref.year). _#ref.title _. #ref.source.
    ]
  ]
]
