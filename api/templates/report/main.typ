#import "design.typ": *

#let data = sys.inputs
#let brand = resolve-brand(data)

// Page with running footer
#set page(
  paper: "a4",
  margin: (x: 25mm, top: 20mm, bottom: 28mm),
  footer: context {
    line(length: 100%, stroke: 0.5pt + HAIRLINE)
    v(4pt)
    grid(
      columns: (1fr, 1fr, 1fr),
      align: (left, center, right),
      text(size: 8pt, fill: MUTED)[#data.at("title", default: "Report")],
      text(size: 8pt, fill: MUTED)[Page #counter(page).display()],
      text(size: 8pt, fill: MUTED)[#data.at("date", default: "")],
    )
  },
)
#set text(font: "Inter Variable", size: 10.5pt, fill: INK)
#set par(justify: true, leading: 0.75em)
#set heading(numbering: "1.1")
#show heading.where(level: 1): it => {
  v(0.8em)
  block[
    #text(font: "Inter Variable", size: 16pt, weight: 700, fill: INK)[#it.body]
    #v(4pt)
    #line(length: 100%, stroke: 1.5pt + brand)
    #v(4pt)
  ]
}
#show heading.where(level: 2): it => {
  v(0.6em)
  text(font: "Inter Variable", size: 12pt, weight: 600, fill: INK)[#it.body]
  v(0.3em)
}

// ── Cover Page ───────────────────────────────────────────────────────────────
#block(width: 100%, height: 6pt, fill: brand)
#v(4cm)
#align(left)[
  #text(size: 28pt, weight: 700, fill: INK, hyphenate: false)[#data.at("title", default: "Report Title")]
  #v(8pt)
  #if "subtitle" in data and data.subtitle != none [
    #text(size: 14pt, weight: 400, fill: MUTED)[#data.subtitle]
    #v(12pt)
  ]
  #v(8pt)
  #line(length: 60pt, stroke: 3pt + brand)
  #v(3cm)
  #text(size: 11pt, weight: 600, fill: INK)[#data.at("author", default: "Author Name")]
  #v(4pt)
  #text(size: 10pt, fill: MUTED)[#data.at("organization", default: "Organization")]
  #v(4pt)
  #text(size: 10pt, fill: MUTED)[#data.at("date", default: "June 2026")]
]
#v(1fr)
#align(right)[
  #text(size: 8pt, fill: SUBTLE)[CONFIDENTIAL]
]
#pagebreak()

// ── Table of Contents ────────────────────────────────────────────────────────
#counter(page).update(1)
#outline(
  title: text(size: 18pt, weight: 700, fill: INK)[Contents],
  indent: 1.5em,
)
#pagebreak()

// ── Executive Summary ────────────────────────────────────────────────────────
#if "executive_summary" in data and data.executive_summary != none [
  #heading(level: 1, numbering: none)[Executive Summary]
  #data.executive_summary
  #pagebreak()
]

// ── Sections ─────────────────────────────────────────────────────────────────
#let sections = data.at("sections", default: ())
#for section in sections [
  #heading(level: 1)[#section.title]

  #if section.at("content", default: none) != none [
    #section.content
  ]

  #if section.at("subsections", default: none) != none [
    #for sub in section.subsections [
      #heading(level: 2)[#sub.title]
      #sub.content
    ]
  ]

  #if section.at("bullet_points", default: none) != none [
    #for pt in section.bullet_points [
      - #pt
    ]
  ]

  #if section.at("numbered_list", default: none) != none [
    #enum(..section.numbered_list.map(item => [#item]))
  ]
]

// ── Conclusion ───────────────────────────────────────────────────────────────
#if "conclusion" in data and data.conclusion != none [
  #heading(level: 1)[Conclusion]
  #data.conclusion
]
