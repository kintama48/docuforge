# Typst Layout — Page and Positioning

## `#page()` — Page Configuration

```typst
#page(
  body,                    // content (positional)
  paper: str,              // paper size — "a4", "us-letter", "a5", "a3", etc.
  width: auto | length,    // custom page width
  height: auto | length,   // custom page height (auto = continuous/infinite)
  flipped: bool,           // swap width/height — default false
  margin: auto | relative | dictionary, // page margins
  columns: int,            // number of text columns — default 1
  fill: none | color | gradient | pattern, // page background
  numbering: none | str | function, // page number format — e.g. "1", "1/1", "i"
  number-align: alignment, // page number alignment — default center + bottom
  header: none | content | auto, // page header
  header-ascent: relative, // header distance from text — default 30%
  footer: none | content | auto, // page footer
  footer-descent: relative, // footer distance from text — default 30%
  background: none | content, // background layer (behind text)
  foreground: none | content, // foreground layer (above text)
  binding: auto | str,     // binding side — "left" or "right"
)
```

### Margin Dictionary

```typst
// Uniform margin
#set page(margin: 2cm)

// Per-side margins
#set page(margin: (top: 2.5cm, bottom: 2cm, left: 3cm, right: 2cm))

// Shorthand x/y
#set page(margin: (x: 2cm, y: 2.5cm))

// Inside/outside for binding
#set page(margin: (inside: 3cm, outside: 2cm, y: 2.5cm))
```

### Header/Footer Examples

```typst
#set page(
  header: [
    #set text(8pt)
    #h(1fr) My Document #h(1fr)
    #line(length: 100%, stroke: 0.5pt)
  ],
  footer: context [
    #set text(8pt)
    #h(1fr)
    #counter(page).display("1 / 1", both: true)
    #h(1fr)
  ],
)

// Different first page header
#set page(header: context {
  if counter(page).get().first() > 1 [
    Chapter Header
  ]
})
```

## `#pagebreak()` — Page Break

```typst
#pagebreak(
  weak: bool,     // only break if not already at page start — default false
  to: none | str, // "odd" or "even" — jump to next odd/even page
)
#pagebreak()
#pagebreak(weak: true)
#pagebreak(to: "odd")
```

## `#grid()` — Grid Layout

```typst
#grid(
  ..children,              // content (variadic positional)
  columns: int | auto | array, // column sizes — e.g. 3, (1fr, 2fr), (100pt, 1fr, auto)
  rows: auto | int | array, // row sizes — e.g. auto, (40pt, 1fr)
  gutter: auto | length | fraction | array, // both gutters
  column-gutter: auto | length | fraction | array,
  row-gutter: auto | length | fraction | array,
  fill: none | color | function, // cell fill
  align: auto | alignment | function, // cell alignment
  stroke: none | stroke | dictionary | function, // cell borders
  inset: relative | dictionary, // cell inset/padding
)
```

### Grid Examples

```typst
// Simple 3-column grid
#grid(
  columns: 3,
  gutter: 10pt,
  [Cell 1], [Cell 2], [Cell 3],
  [Cell 4], [Cell 5], [Cell 6],
)

// Mixed column widths
#grid(
  columns: (1fr, 2fr, auto),
  gutter: 8pt,
  [Narrow], [Wide column], [Auto],
)

// Grid with cell spanning
#grid(
  columns: (1fr, 1fr, 1fr),
  rows: (auto, auto),
  grid.cell(colspan: 3, align: center)[Header spanning all columns],
  [A], [B], [C],
)

// Grid with stroke
#grid(
  columns: 2,
  stroke: 0.5pt + luma(180),
  inset: 8pt,
  [A], [B],
  [C], [D],
)
```

### `grid.cell()` — Grid Cell

```typst
#grid.cell(
  body,              // content
  colspan: int,      // column span — default 1
  rowspan: int,      // row span — default 1
  fill: auto | none | color,
  align: auto | alignment,
  inset: auto | relative | dictionary,
  stroke: auto | none | stroke | dictionary,
  x: auto | int,     // explicit column position
  y: auto | int,     // explicit row position
  breakable: auto | bool,
)
```

### `grid.header()`, `grid.footer()` — Repeating Headers/Footers

```typst
#grid(
  columns: 3,
  grid.header(
    [*Col A*], [*Col B*], [*Col C*],
  ),
  ..data.map(row => (row.a, row.b, row.c)).flatten(),
)
```

## `#stack()` — Stack Layout

```typst
#stack(
  dir: direction,    // stacking direction — ltr, rtl, ttb (default), btt
  spacing: none | length | fraction, // space between children
  ..children,        // content (variadic positional)
)
```

```typst
// Vertical stack (default)
#stack(
  spacing: 12pt,
  [First item],
  [Second item],
  [Third item],
)

// Horizontal stack
#stack(
  dir: ltr,
  spacing: 1fr,
  [Left],
  [Center],
  [Right],
)
```

## `#columns()` — Multi-Column Layout

```typst
#columns(
  count,             // int (positional) — number of columns
  gutter: length,    // space between columns — default 4%
  body,              // content (positional)
)
```

```typst
#columns(2, gutter: 12pt)[
  First column content that flows naturally into the second column
  when it runs out of space.
]

// Apply columns to entire document
#show: columns.with(2)
```

## `#place()` — Absolute/Relative Positioning

```typst
#place(
  alignment,         // alignment (positional) — where to anchor
  body,              // content (positional)
  dx: relative,      // horizontal offset — default 0pt
  dy: relative,      // vertical offset — default 0pt
  float: bool,       // float to top/bottom of page — default false
  scope: str,        // "column" or "parent" — default "column"
  clearance: length, // clearance around floated element — default 1.5em
)
```

```typst
// Place at top-right of page
#place(top + right, dx: -10pt, dy: 10pt)[Logo]

// Floating placement (like CSS float)
#place(auto, float: true, scope: "parent")[
  #block(width: 50%)[Floating content]
]

// Watermark
#place(center + horizon)[
  #rotate(45deg, text(60pt, fill: luma(230))[DRAFT])
]
```

## `#align()` — Content Alignment

```typst
#align(
  alignment,         // alignment (positional) — e.g. center, left + top
  body,              // content (positional)
)
```

### Alignment Values

```
left       right      center
top        bottom     horizon (vertical center)
start      end        (direction-aware)
left + top            (2D alignment)
center + horizon      (centered both axes)
```

```typst
#align(center)[Centered text]
#align(right)[Right-aligned]
#align(center + horizon)[Vertically and horizontally centered]
```

## `#pad()` — Padding

```typst
#pad(
  body,              // content (positional)
  left: relative,    // left padding — default 0pt
  right: relative,   // right padding — default 0pt
  top: relative,     // top padding — default 0pt
  bottom: relative,  // bottom padding — default 0pt
  x: relative,       // horizontal padding (left + right)
  y: relative,       // vertical padding (top + bottom)
  rest: relative,    // padding for unset sides
)
```

```typst
#pad(x: 20pt, y: 10pt)[Padded content]
#pad(left: 2em)[Indented content]
```

## `#block()` — Block-Level Container

```typst
#block(
  body,              // content (positional)
  width: auto | relative, // width
  height: auto | relative | fraction, // height
  fill: none | color | gradient | pattern, // background
  stroke: none | stroke | dictionary, // border
  radius: relative | dictionary, // corner radius
  inset: relative | dictionary, // inner padding
  outset: relative | dictionary, // outer expansion
  spacing: fraction | relative, // space above/below — default 1.2em
  above: auto | fraction | relative, // space above
  below: auto | fraction | relative, // space below
  breakable: bool,   // allow page break inside — default true
  clip: bool,        // clip overflow — default false
  sticky: bool,      // stick to next block — default false
)
```

```typst
// Colored box
#block(fill: luma(240), inset: 12pt, radius: 4pt, width: 100%)[
  Content in a styled block.
]

// Block with border
#block(
  stroke: (left: 3pt + blue),
  inset: (left: 12pt, y: 8pt),
)[Callout content]

// Per-side radius
#block(
  radius: (top: 6pt),
  fill: blue,
  inset: 8pt,
)[Rounded top only]
```

### Stroke Dictionary

```typst
// Uniform stroke
stroke: 1pt + black

// Per-side stroke
stroke: (
  left: 2pt + blue,
  right: none,
  top: 1pt + luma(200),
  bottom: 1pt + luma(200),
)
```

### Radius Dictionary

```typst
radius: 4pt                                    // uniform
radius: (top-left: 4pt, bottom-right: 4pt)    // per-corner
radius: (left: 4pt, right: 0pt)               // per-side shorthand
```

## `#box()` — Inline Container

Same parameters as `block()` plus:

```typst
#box(
  body,
  width: auto | relative,
  height: auto | relative,
  fill: none | color | gradient | pattern,
  stroke: none | stroke | dictionary,
  radius: relative | dictionary,
  inset: relative | dictionary,
  outset: relative | dictionary,
  baseline: relative,  // baseline offset — default 0pt
  clip: bool,          // default false
)
```

```typst
// Inline colored tag
#box(fill: eastern, inset: (x: 6pt, y: 3pt), radius: 3pt)[
  #text(white)[Tag]
]

// Icon-sized box
#box(width: 1em, height: 1em, fill: red, radius: 50%)
```

**Key difference**: `box` is inline (flows with text), `block` is block-level (creates a new paragraph).

## `#h()` / `#v()` — Spacing

```typst
#h(amount)   // horizontal space — length or fraction
#v(amount)   // vertical space — length or fraction

// Weak spacing (collapses if adjacent)
#h(1em, weak: true)
#v(12pt, weak: true)
```

```typst
Left #h(1fr) Right          // push apart with fractional space
A #h(2em) B                 // fixed horizontal space
#v(20pt)                    // vertical gap
Left #h(1fr) Center #h(1fr) Right  // evenly distributed
```

## `#move()` — Offset Content

```typst
#move(
  body,        // content
  dx: relative, // horizontal offset — default 0pt
  dy: relative, // vertical offset — default 0pt
)
#move(dx: 5pt, dy: -3pt)[Shifted content]
```

**Note**: `move` does not affect layout — surrounding content is not displaced.

## `#rotate()` — Rotate Content

```typst
#rotate(
  angle,       // angle (positional) — e.g. 45deg, -90deg
  body,        // content (positional)
  origin: alignment, // rotation origin — default center + horizon
  reflow: bool,      // reflow layout around rotated — default false
)
#rotate(45deg)[Tilted]
#rotate(-90deg, origin: left + top)[Rotated from top-left]
```

## `#scale()` — Scale Content

```typst
#scale(
  body,        // content
  x: auto | relative, // horizontal scale — e.g. 150%
  y: auto | relative, // vertical scale
  factor: auto | relative, // uniform scale for both x and y
  origin: alignment,  // scale origin — default center + horizon
  reflow: bool,       // reflow layout — default false
)
#scale(x: 150%, y: 150%)[Scaled up]
#scale(factor: 50%)[Half size]
```

## `#hide()` — Invisible Content

```typst
#hide(body)  // renders content invisibly (still takes up space)
#hide[This takes space but is invisible]
```

## `#measure()` — Measure Content Dimensions

```typst
// Must be used inside a context expression
context {
  let size = measure([Hello World])
  // size.width and size.height are lengths
  [Width: #size.width, Height: #size.height]
}
```

## `#layout()` — Access Container Size

```typst
// Access the available width/height of the container
#layout(size => [
  Available width: #size.width \
  Available height: #size.height
])
```

## Common Layout Patterns

### Centered Page Content
```typst
#set page(width: 210mm, height: 297mm, margin: 2cm)
#align(center + horizon)[
  #text(24pt, weight: "bold")[Title]
]
```

### Two-Column with Header
```typst
#grid(
  columns: 1,
  rows: (auto, 1fr),
  grid.cell(colspan: 1)[#align(center)[= Document Title]],
  columns(2, gutter: 20pt)[#lorem(200)],
)
```

### Sidebar Layout
```typst
#grid(
  columns: (200pt, 1fr),
  gutter: 20pt,
  block(fill: luma(245), height: 100%, inset: 12pt)[Sidebar],
  [Main content area],
)
```
