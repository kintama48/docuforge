# Typst References, Bibliography, and Document Structure

## `#bibliography()` — Bibliography

```typst
#bibliography(
  path,              // str or array (positional) — path(s) to .bib, .yml, or .yaml files
  title: auto | none | content, // bibliography heading — default auto
  style: str,        // citation style — default "ieee"
  full: bool,        // show all entries even if not cited — default false
)
```

### Supported Styles

```
"ieee", "apa", "mla", "chicago-author-date", "chicago-notes",
"harvard-cite-them-right", "alphanumeric", "vancouver",
"american-chemical-society", "american-institute-of-physics",
"american-meteorological-society", "american-physics-society",
"american-sociological-association", "annual-reviews",
"springer-basic", "elsevier-harvard", and many more CSL styles.
```

```typst
// At the end of the document
#bibliography("refs.bib", style: "apa")

// Multiple bibliography files
#bibliography(("refs.bib", "extra.bib"))

// With custom title
#bibliography("refs.bib", title: [References])

// No title
#bibliography("refs.bib", title: none)
```

## `#cite()` — Citations

```typst
#cite(
  key,               // label (positional) — the bibliography key as a label
  supplement: none | content, // additional text — e.g. page numbers
  form: none | str,  // "normal" (default), "prose", "full", "author", "year"
  style: auto | str, // override citation style
)
```

```typst
// Basic citation
As shown in @einstein1905.

// With page number
@einstein1905[p. 42]

// Function syntax
#cite(<einstein1905>)
#cite(<einstein1905>, supplement: [pp. 1--10])

// Prose form (author names in text)
#cite(<einstein1905>, form: "prose") showed that...

// Author only
#cite(<einstein1905>, form: "author")

// Year only
#cite(<einstein1905>, form: "year")
```

## Labels and References

### `<label>` — Creating Labels

```typst
// Attach label to any element
= Introduction <intro>

$ E = m c^2 $ <energy-eq>

#figure(
  image("chart.png"),
  caption: [Sales data],
) <sales-fig>

#table(...) <my-table>
```

### `#label()` — Programmatic Label

```typst
#label(name)         // str (positional) — the label name

// Attach label programmatically
#heading(level: 2)[Methods] #label("methods")
```

### `#ref()` — Reference a Label

```typst
#ref(
  target,            // label (positional) — the label to reference
  supplement: auto | none | content | function, // override supplement text
)
```

```typst
// @ syntax (preferred)
See @intro for the introduction.
As shown in @energy-eq.
@sales-fig shows the trend.

// Function syntax
#ref(<intro>)
#ref(<energy-eq>, supplement: [Eq.])

// Customize reference supplements globally
#set heading(supplement: [Section])
#set math.equation(supplement: [Eq.])
#set figure(supplement: [Fig.])
```

## `#footnote()` — Footnotes

```typst
#footnote(
  body,              // content (positional) — footnote content
  numbering: str | function, // numbering pattern — default "1"
)
```

```typst
This is a claim.#footnote[Source: Research Paper, 2024.]

Another point#footnote(numbering: "*")[Important note.]

// Style footnotes
#show footnote.entry: set text(size: 8pt)
#set footnote.entry(
  separator: line(length: 30%, stroke: 0.5pt),
  clearance: 0.5em,
  gap: 0.4em,
  indent: 1em,
)
```

## `#figure()` — Figures

```typst
#figure(
  body,              // content (positional) — the figure content
  caption: none | content, // figure caption
  supplement: auto | none | content | function, // reference supplement — default auto ("Figure" / "Table")
  numbering: none | str | function, // numbering — default "1"
  gap: length,       // gap between body and caption — default 0.65em
  placement: none | auto | alignment, // float placement — none, auto, top, bottom
  kind: auto | str | function, // figure kind — auto-detected or manual: "image", "table", "raw"
  outlined: bool,    // include in list of figures — default true
  scope: str,        // numbering scope — "column" or "parent" — default "column"
)
```

```typst
// Image figure
#figure(
  image("photo.png", width: 80%),
  caption: [Photograph of the experiment setup.],
) <fig-setup>

// Table figure (auto-detected kind)
#figure(
  table(columns: 2, [A], [B], [1], [2]),
  caption: [Summary of results.],
) <tbl-results>

// Code figure
#figure(
  raw("fn main() {}", lang: "rust", block: true),
  caption: [Main function.],
  supplement: [Listing],
  kind: "code",
)

// Floating figure
#figure(
  image("chart.svg", width: 100%),
  caption: [Revenue over time.],
  placement: top,
)

// Customize figure caption
#show figure.caption: it => [
  #text(weight: "bold")[#it.supplement #context it.counter.display()]: #it.body
]
```

## `#outline()` — Table of Contents / List of Figures

```typst
#outline(
  title: auto | none | content, // outline title — default auto
  target: selector | function, // what to include — default heading.where(outlined: true)
  depth: none | int, // maximum depth — default none (all levels)
  indent: none | auto | bool | relative | function, // indentation — default none
  fill: none | content, // fill between title and page — default repeat[.]
)
```

```typst
// Table of contents
#outline()

// With depth limit and indentation
#outline(depth: 3, indent: auto)

// Custom indent
#outline(indent: 1.5em)

// List of figures
#outline(
  title: [List of Figures],
  target: figure.where(kind: image),
)

// List of tables
#outline(
  title: [List of Tables],
  target: figure.where(kind: table),
)

// Custom fill
#outline(fill: repeat[~.])
#outline(fill: line(length: 100%, stroke: 0.5pt + luma(200)))

// No fill
#outline(fill: none)

// Style outline entries
#show outline.entry.where(level: 1): it => {
  strong(it)
}
```

## `#numbering()` — Number Formatting

```typst
#numbering(
  pattern,           // str or function (positional) — numbering pattern
  ..numbers,         // int (variadic positional) — numbers to format
)
```

### Patterns

```
"1"          → 1, 2, 3, ...
"1."         → 1., 2., 3., ...
"(1)"        → (1), (2), (3), ...
"a"          → a, b, c, ...
"A"          → A, B, C, ...
"i"          → i, ii, iii, iv, ...
"I"          → I, II, III, IV, ...
"*"          → *, †, ‡, §, ...
"1.1"        → 1.1, 1.2, 2.1, ... (hierarchical)
"1.a"        → 1.a, 1.b, 2.a, ...
"I.1"        → I.1, I.2, II.1, ...
```

```typst
#numbering("1.1", 1, 2)       // "1.2"
#numbering("(a)", 3)           // "(c)"
#numbering("I", 4)             // "IV"

// Custom numbering function
#set heading(numbering: (..nums) => {
  let vals = nums.pos()
  if vals.len() == 1 {
    [Chapter #numbering("I", vals.first()): ]
  } else {
    numbering("1.1", ..vals) + [ ]
  }
})
```

## Common Reference Patterns

### Cross-References Setup

```typst
// Configure supplements for clean references
#set heading(numbering: "1.1", supplement: [Section])
#set math.equation(numbering: "(1)", supplement: [Eq.])
#set figure(supplement: [Fig.])

= Introduction <intro>

In @intro, we discuss...

$ x^2 + y^2 = r^2 $ <circle-eq>

See @circle-eq for the equation.

#figure(
  table(columns: 2, [A], [B]),
  caption: [Data summary.],
) <summary>

@summary shows the data.
```

### Academic Paper Structure

```typst
#set document(title: "Paper Title", author: "Author Name")
#set page(numbering: "1", number-align: center)
#set heading(numbering: "1.1")
#set par(justify: true, first-line-indent: 1em)
#set math.equation(numbering: "(1)")

#align(center)[
  #text(17pt, weight: "bold")[Paper Title]
  #v(8pt)
  Author Name \
  Institution
]

#outline(indent: auto)

= Introduction <intro>
#lorem(100)

= Methods <methods>
#lorem(100)

= Results <results>
#lorem(100)

#bibliography("refs.bib")
```

## Gotchas

- Labels must be attached directly after an element. A blank line between the element and the label breaks the connection.
- `@key` is shorthand for `#ref(<key>)`. Use function syntax when you need to customize supplement.
- `cite()` takes a label, not a string: `#cite(<key>)` not `#cite("key")`.
- The `kind` of a figure is auto-detected from its body (image, table, raw). Set `kind` manually for custom figure types.
- `outline()` only shows elements that have `outlined: true` (default for headings).
- `placement: auto` lets Typst choose top or bottom. Use `placement: top` or `placement: bottom` for explicit float control.
- Bibliography keys in `.bib` files become labels: `@einstein2024` references the BibTeX entry with key `einstein2024`.
