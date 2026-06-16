#import "design.typ": *

#let data = sys.inputs
#let brand = resolve-brand(data)

#set page(paper: "a4", margin: (x: 20mm, top: 18mm, bottom: 18mm))
#set text(font: "Inter Variable", size: 9.5pt, fill: INK)
#set par(leading: 0.65em)

// ── Header ───────────────────────────────────────────────────────────────────
#grid(
  columns: (1fr, auto),
  align: (left + top, right + top),
  [
    #text(size: 26pt, weight: 700, fill: INK)[#data.at("name", default: "Your Name")]
    #v(2pt)
    #text(size: 11pt, weight: 400, fill: brand)[#data.at("title", default: "Your Title")]
  ],
  [
    #set align(right)
    #text(size: 8.5pt, fill: MUTED)[
      #data.at("email", default: "you@example.com") \
      #data.at("phone", default: "+1 555 000 0000") \
      #data.at("location", default: "City, State") \
      #if "linkedin" in data [#data.linkedin]
    ]
  ],
)

#v(8pt)
#line(length: 100%, stroke: 1.5pt + brand)
#v(10pt)

// ── Summary ──────────────────────────────────────────────────────────────────
#if "summary" in data and data.summary != none [
  #text(size: 10pt, fill: INK)[#data.summary]
  #v(10pt)
]

// ── Experience ───────────────────────────────────────────────────────────────
#caption[Experience]
#v(4pt)
#line(length: 100%, stroke: 0.5pt + HAIRLINE)
#v(6pt)

#let jobs = data.at("experience", default: ())
#for job in jobs [
  #grid(
    columns: (1fr, auto),
    align: (left, right),
    [
      #text(weight: 700, size: 10.5pt)[#job.at("title", default: "Role")]
      #h(8pt)
      #text(size: 10pt, fill: brand, weight: 600)[#job.at("company", default: "Company")]
    ],
    text(size: 9pt, fill: MUTED)[#job.at("period", default: "2024 – Present")],
  )
  #if "location" in job [
    #v(1pt)
    #text(size: 8.5pt, fill: MUTED)[#job.location]
  ]
  #v(3pt)
  #let bullets = job.at("bullets", default: ())
  #for b in bullets [
    #grid(
      columns: (8pt, 1fr),
      text(fill: brand)[·],
      text(size: 9.5pt)[#b],
    )
    #v(2pt)
  ]
  #v(7pt)
]

// ── Education ────────────────────────────────────────────────────────────────
#caption[Education]
#v(4pt)
#line(length: 100%, stroke: 0.5pt + HAIRLINE)
#v(6pt)

#let edu = data.at("education", default: ())
#for e in edu [
  #grid(
    columns: (1fr, auto),
    [
      #text(weight: 700, size: 10.5pt)[#e.at("degree", default: "Degree")]
      #h(6pt)
      #text(size: 10pt, fill: brand)[#e.at("school", default: "University")]
    ],
    text(size: 9pt, fill: MUTED)[#e.at("year", default: "2020")],
  )
  #if "details" in e [
    #v(1pt)
    #text(size: 8.5pt, fill: MUTED)[#e.details]
  ]
  #v(7pt)
]

// ── Skills ───────────────────────────────────────────────────────────────────
#caption[Skills]
#v(4pt)
#line(length: 100%, stroke: 0.5pt + HAIRLINE)
#v(6pt)

#let skill-groups = data.at("skills", default: ())
#for sg in skill-groups [
  #grid(
    columns: (80pt, 1fr),
    column-gutter: 8pt,
    text(size: 9pt, weight: 600, fill: INK)[#sg.at("category", default: "Category")],
    text(size: 9pt, fill: MUTED)[#sg.at("items", default: "").join(" · ")],
  )
  #v(3pt)
]
