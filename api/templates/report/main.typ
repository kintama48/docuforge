#set page(paper: "a4", margin: (x: 2.5cm, y: 2cm))
#set text(font: "Inter", size: 11pt)
#set par(justify: true, leading: 0.8em)
#set heading(numbering: "1.1")

#let data = sys.inputs

// Title page
#align(center)[
  #v(3cm)
  #text(size: 28pt, weight: "bold", fill: rgb("#1a1a2e"))[
    #data.at("title", default: "Report Title")
  ]
  #v(0.5cm)
  #if data.at("subtitle", default: none) != none [
    #text(size: 16pt, fill: rgb("#666"))[#data.subtitle]
    #v(0.5cm)
  ]
  #line(length: 40%, stroke: 2pt + rgb("#1a1a2e"))
  #v(2cm)
  #text(size: 12pt)[
    #data.at("author", default: "Author Name")
    #linebreak()
    #v(0.3cm)
    #text(fill: rgb("#666"))[#data.at("organization", default: "Organization")]
  ]
  #v(1cm)
  #text(size: 11pt, fill: rgb("#666"))[#data.at("date", default: "January 2024")]
]

#pagebreak()

// Table of contents
#outline(
  title: [Table of Contents],
  indent: 1.5em,
)

#pagebreak()

// Executive summary
#if data.at("executive_summary", default: none) != none [
  #heading(level: 1, numbering: none)[Executive Summary]
  #data.executive_summary
  #pagebreak()
]

// Sections
#let sections = data.at("sections", default: ())

#for section in sections [
  #heading(level: 1)[#section.title]

  #if section.at("content", default: none) != none [
    #section.content
  ]

  #if section.at("subsections", default: none) != none [
    #for subsection in section.subsections [
      #heading(level: 2)[#subsection.title]
      #subsection.content
    ]
  ]

  #if section.at("bullet_points", default: none) != none [
    #for point in section.bullet_points [
      - #point
    ]
  ]

  #if section.at("numbered_list", default: none) != none [
    #enum(..section.numbered_list.map(item => [#item]))
  ]
]

// Conclusion
#if data.at("conclusion", default: none) != none [
  #heading(level: 1)[Conclusion]
  #data.conclusion
]

// Footer with page numbers
#set page(footer: context [
  #line(length: 100%, stroke: 0.5pt + rgb("#ccc"))
  #v(0.3em)
  #grid(
    columns: (1fr, 1fr, 1fr),
    text(size: 9pt, fill: rgb("#666"))[#data.at("title", default: "Report")],
    align(center)[#text(size: 9pt, fill: rgb("#666"))[Page #counter(page).display()]],
    align(right)[#text(size: 9pt, fill: rgb("#666"))[#data.at("date", default: "")]],
  )
])
