#import "design.typ": *

#let data = sys.inputs
#let brand = resolve-brand(data)

#set page(width: 85mm, height: 55mm, margin: 4mm)
#set text(font: "Inter Variable", size: 9pt, fill: white)

// Full bleed brand background
#place(top + left, dx: -4mm, dy: -4mm)[
  #rect(width: 85mm, height: 55mm, fill: brand)
]

// Accent strip — right edge
#place(top + right, dx: 0mm, dy: -4mm)[
  #rect(width: 6mm, height: 55mm, fill: white.transparentize(85%))
]

// Content
#v(2mm)

// Company / logo area
#text(size: 8pt, weight: 700, fill: white.transparentize(30%), tracking: 0.15em)[
  #upper(data.at("company_name", default: "Company Name"))
]

#v(1fr)

// Name + title
#text(size: 16pt, weight: 700, fill: white)[#data.at("name", default: "Your Name")]
#v(1mm)
#text(size: 8.5pt, weight: 500, fill: white.transparentize(20%))[#data.at("title", default: "Your Title")]

#v(4mm)

// Contact details
#grid(
  columns: (1fr, 1fr),
  row-gutter: 2.5pt,
  text(size: 7.5pt, fill: white.transparentize(20%))[#data.at("email", default: "you@company.com")],
  align(right)[#text(size: 7.5pt, fill: white.transparentize(20%))[#data.at("phone", default: "+1 555 000 0000")]],
  text(size: 7.5pt, fill: white.transparentize(30%))[#data.at("website", default: "www.company.com")],
  align(right)[#text(size: 7.5pt, fill: white.transparentize(30%))[#data.at("location", default: "City, State")]],
)
