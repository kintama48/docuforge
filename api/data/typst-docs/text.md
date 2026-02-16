# Typst Text and Typography

## `#text()` — Text Styling

```typst
#text(
  body,                    // content (positional) — the text content
  font: str | array,       // font family or fallback list — e.g. "Inter" or ("Inter", "Arial")
  size: length,            // font size — e.g. 12pt, 1em
  weight: int | str,       // font weight — "regular", "bold", 100-900
  style: str,              // "normal", "italic", "oblique"
  fill: color | gradient | pattern, // text color — e.g. red, rgb("#333")
  tracking: length,        // letter spacing — e.g. 0.5pt
  spacing: relative,       // word spacing — default 100% + 0pt
  baseline: length,        // vertical baseline shift
  overhang: bool,          // whether to overhang into margin — default true
  top-edge: str | length,  // "ascender", "cap-height", "x-height", "baseline", or length
  bottom-edge: str | length, // "baseline", "descender", or length
  lang: str,               // language — e.g. "en", "de"
  region: str,             // region — e.g. "US", "GB"
  dir: direction,          // text direction — ltr, rtl
  hyphenate: bool | auto,  // enable hyphenation
  kerning: bool,           // enable kerning — default true
  ligatures: bool,         // enable ligatures — default true
  number-type: str | auto, // "lining" or "old-style"
  number-width: str | auto,// "proportional" or "tabular"
  features: array | dictionary, // OpenType features
)
```

### Examples

```typst
#text(size: 14pt, weight: "bold", fill: blue)[Important text]

#set text(font: "New Computer Modern", size: 11pt)

// Font fallback list
#set text(font: ("Helvetica Neue", "Arial", "sans-serif"))

// Tabular numbers for aligned columns
#set text(number-width: "tabular")
```

## Inline Formatting

### `#emph(body)` — Italic/Emphasis
```typst
#emph[emphasized text]
// Shorthand in markup:
_emphasized text_
```

### `#strong(body)` — Bold
```typst
#strong(delta: 300)[bold text]  // delta: int — weight increase, default 300
// Shorthand:
*bold text*
```

### `#strike(body)` — Strikethrough
```typst
#strike(
  body,              // content
  stroke: auto | stroke, // line stroke
  offset: auto | length, // vertical offset
  extent: length,    // horizontal extension — default 0pt
)
#strike[deleted text]
```

### `#underline(body)` — Underline
```typst
#underline(
  body,              // content
  stroke: auto | stroke, // line stroke
  offset: auto | length, // vertical offset from baseline
  extent: length,    // horizontal extension — default 0pt
  evade: bool,       // evade descenders — default true
  background: bool,  // render behind text — default false
)
#underline(stroke: 2pt + red, offset: 2pt)[underlined]
```

### `#overline(body)` — Overline
```typst
#overline(
  body,
  stroke: auto | stroke,
  offset: auto | length,
  extent: length,
  evade: bool,
  background: bool,
)
```

### `#highlight(body)` — Text Highlighting
```typst
#highlight(
  body,              // content
  fill: color,       // highlight color — default yellow
  stroke: none | stroke, // border stroke
  top-edge: str | length,
  bottom-edge: str | length,
  extent: length,    // horizontal extension — default 0pt
  radius: relative | dictionary, // corner radius
)
#highlight(fill: yellow)[highlighted text]
#highlight(fill: rgb("#e0f0ff"), radius: 2pt)[info]
```

### `#smallcaps(body)` — Small Capitals
```typst
#smallcaps[Small Caps Text]
```

### `#sub(body)` — Subscript
```typst
#sub(
  body,
  typographic: bool, // use font's subscript — default true
  baseline: length,  // manual baseline shift
  size: length,      // manual size
)
H#sub[2]O
```

### `#super(body)` — Superscript
```typst
#super(
  body,
  typographic: bool,
  baseline: length,
  size: length,
)
E = mc#super[2]
```

## `#heading()` — Headings

```typst
#heading(
  body,              // content (positional)
  level: int | auto, // heading level 1-6 — default auto (inferred from nesting or = syntax)
  depth: int,        // nesting depth (auto-managed by Typst)
  numbering: none | str | function, // numbering pattern — e.g. "1.1", "I.a"
  supplement: auto | content | function, // supplement for references — e.g. "Section"
  outlined: bool,    // include in outline — default true
  bookmarked: auto | bool, // include in PDF bookmarks — default auto
  hanging-indent: auto | length, // hanging indent for wrapped headings
)
```

### Examples

```typst
// Markup shorthand (= for level 1, == for level 2, etc.)
= Level 1 Heading
== Level 2 Heading
=== Level 3 Heading

// Function syntax
#heading(level: 2)[My Heading]

// Configure numbering
#set heading(numbering: "1.1")

// Custom heading style
#show heading.where(level: 1): it => {
  set text(size: 20pt, weight: "bold")
  block(below: 12pt, above: 20pt, it.body)
}
```

## `#par()` — Paragraphs

```typst
#par(
  body,                    // content
  leading: length,         // line spacing — default 0.65em
  spacing: length,         // paragraph spacing — default 1.2em
  justify: bool,           // justify text — default false
  linebreaks: auto | str,  // "simple" or "optimized" — default auto
  first-line-indent: length | dict, // first line indent — e.g. 1em, (amount: 1em, all: true)
  hanging-indent: length,  // hanging indent for subsequent lines — default 0pt
)
```

### Examples

```typst
#set par(justify: true, leading: 0.8em, first-line-indent: 1.5em)

// Paragraph spacing
#set par(spacing: 1.5em)
```

## Line and Paragraph Breaks

```typst
// Line break
#linebreak()
// Markup shorthand:
First line \
Second line

// Paragraph break
#parbreak()
// Markup shorthand: empty line between paragraphs
```

## `#raw()` — Code / Raw Text

```typst
#raw(
  text,              // str (positional) — the raw text
  block: bool,       // block display — default false (inline)
  lang: none | str,  // syntax highlighting language
  align: alignment,  // alignment — default start
  tab-size: int,     // tab width in spaces — default 2
  theme: auto | str | none, // syntax theme path or none
  syntaxes: str | array, // additional syntax definition paths
)
```

### Examples

```typst
// Inline code (markup shorthand)
`inline code`

// Block code (markup shorthand)
```python
def hello():
    print("world")
```

// Function syntax
#raw("let x = 1;", lang: "rust", block: true)

// Style code blocks
#show raw.where(block: true): it => {
  block(fill: luma(245), inset: 10pt, radius: 4pt, width: 100%, it)
}
```

## `#lorem()` — Placeholder Text

```typst
#lorem(words)  // int (positional) — number of words to generate
#lorem(50)     // generates ~50 words of placeholder text
```

## `#link()` — Hyperlinks

```typst
#link(
  dest,         // str | label | location | dictionary (positional) — URL or label
  body,         // content (positional, optional) — display text
)
```

### Examples

```typst
#link("https://typst.app")[Typst Website]
#link("mailto:hello@example.com")

// Link to label
#link(<my-section>)[Go to section]

// Style all links
#show link: set text(fill: blue)
#show link: underline
```

## `#quote()` — Block Quotes

```typst
#quote(
  body,              // content
  block: bool,       // display as block — default false (inline)
  quotes: auto | bool, // show quotation marks — default auto
  attribution: none | content | label, // attribution/source
)
```

### Example

```typst
#quote(block: true, attribution: [Typst Docs])[
  Content is king.
]

// Style block quotes
#show quote.where(block: true): it => {
  block(
    inset: (left: 12pt, y: 4pt),
    stroke: (left: 3pt + luma(180)),
    it.body,
  )
}
```

## Lists

### `#list()` — Bullet List

```typst
#list(
  ..items,           // content (variadic positional)
  tight: bool,       // tight spacing — default true
  marker: content | array | function, // bullet marker — default [--]
  indent: length,    // indent — default 0pt
  body-indent: length, // body indent after marker — default 0.5em
  spacing: auto | length, // space between items
)
```

```typst
// Markup shorthand
- Item one
- Item two
  - Nested item

// Function syntax
#list(
  [First item],
  [Second item],
  [Third item],
)

// Custom markers
#set list(marker: ([--], [---], [----]))
```

### `#enum()` — Numbered List

```typst
#enum(
  ..items,           // content (variadic positional)
  tight: bool,       // default true
  numbering: str | function, // pattern — default "1."
  start: int,        // starting number — default 1
  full: bool,        // show full numbering — default false
  indent: length,    // default 0pt
  body-indent: length, // default 0.5em
  spacing: auto | length,
  number-align: alignment, // default end + top
)
```

```typst
// Markup shorthand
+ First
+ Second
+ Third

// Custom numbering
#set enum(numbering: "a)")
#set enum(numbering: "(i)")

// Start from specific number
#enum(start: 3)[Third][Fourth][Fifth]
```

### `#terms()` — Definition/Term List

```typst
#terms(
  ..items,           // (term, description) pairs
  tight: bool,
  separator: content, // between term and description — default ": "
  indent: length,
  hanging-indent: length,
  spacing: auto | length,
)
```

```typst
// Markup shorthand
/ Term: Description of the term.
/ Another: Its description.

// Function syntax
#terms(
  ([API], [Application Programming Interface]),
  ([CLI], [Command Line Interface]),
)
```
