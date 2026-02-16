# Typst Tables

## `#table()` — Table Element

```typst
#table(
  ..children,              // content (variadic positional) — cells, headers, footers, hlines, vlines
  columns: int | auto | array, // column sizes — e.g. 3, (1fr, 2fr), (100pt, auto, 1fr)
  rows: auto | int | relative | fraction | array, // row sizes
  gutter: auto | int | relative | fraction | array, // both gutters
  column-gutter: auto | int | relative | fraction | array,
  row-gutter: auto | int | relative | fraction | array,
  fill: none | color | gradient | pattern | function, // cell background
  align: auto | alignment | function, // cell alignment
  stroke: none | stroke | dictionary | function, // cell borders — default 1pt + black
  inset: relative | dictionary,     // cell padding — default 5pt
)
```

### Column Size Patterns

```typst
columns: 3                           // 3 equal-width auto columns
columns: (1fr, 2fr, 1fr)            // fractional widths
columns: (auto, 1fr)                 // auto + fill remaining
columns: (80pt, 1fr, auto)          // fixed + fill + auto
columns: (25%, 25%, 50%)            // percentage widths
```

## Simple Table

```typst
#table(
  columns: 3,
  [*Name*], [*Age*], [*Role*],
  [Alice], [30], [Engineer],
  [Bob], [25], [Designer],
  [Carol], [35], [Manager],
)
```

## `table.cell()` — Cell with Properties

```typst
#table.cell(
  body,              // content (positional)
  colspan: int,      // column span — default 1
  rowspan: int,      // row span — default 1
  fill: auto | none | color | gradient | pattern,
  align: auto | alignment,
  inset: auto | relative | dictionary,
  stroke: auto | none | stroke | dictionary,
  x: auto | int,     // explicit column position (0-indexed)
  y: auto | int,     // explicit row position (0-indexed)
  breakable: auto | bool,
)
```

### Cell Spanning

```typst
#table(
  columns: 4,
  // Header spanning all columns
  table.cell(colspan: 4, align: center)[*Quarterly Report*],
  [*Q1*], [*Q2*], [*Q3*], [*Q4*],
  [$1000$], [$1200$], [$1100$], [$1400$],
  // Row span
  table.cell(rowspan: 2)[Multi-row], [A], [B], [C],
  [D], [E], [F],
)
```

## `table.header()` — Repeating Header

```typst
#table.header(
  ..children,        // content — header row cells
  repeat: bool,      // repeat on every page — default true
)
```

```typst
#table(
  columns: 3,
  table.header(
    [*Name*], [*Date*], [*Amount*],
  ),
  [Alice], [2024-01-15], [$500],
  [Bob], [2024-01-16], [$750],
  // ... many more rows
)
```

## `table.footer()` — Repeating Footer

```typst
#table.footer(
  ..children,        // content — footer row cells
  repeat: bool,      // repeat on every page — default true
)
```

```typst
#table(
  columns: 3,
  table.header([*Item*], [*Qty*], [*Price*]),
  [Widget], [10], [$5.00],
  [Gadget], [5], [$12.00],
  table.footer(
    table.cell(colspan: 2, align: right)[*Total:*],
    [*$110.00*],
  ),
)
```

## `table.hline()` / `table.vline()` — Rules

```typst
table.hline(
  y: auto | int,     // row position (before this row, 0-indexed)
  start: int,        // starting column — default 0
  end: none | int,   // ending column (exclusive)
  stroke: auto | none | stroke,
  position: str,     // "start" or "end" — default "start"
)

table.vline(
  x: auto | int,     // column position (before this column, 0-indexed)
  start: int,        // starting row — default 0
  end: none | int,   // ending row (exclusive)
  stroke: auto | none | stroke,
  position: str,     // "start" or "end" — default "start"
)
```

```typst
#table(
  columns: 3,
  stroke: none,  // remove default strokes
  table.hline(stroke: 2pt),
  [*A*], [*B*], [*C*],
  table.hline(stroke: 0.5pt),
  [1], [2], [3],
  [4], [5], [6],
  table.hline(stroke: 2pt),
)
```

## Styled Table — Alternating Row Colors

```typst
#table(
  columns: (1fr, 1fr, 1fr),
  fill: (x, y) => if y == 0 { luma(230) } else if calc.rem(y, 2) == 0 { luma(245) } else { white },
  align: (x, y) => if y == 0 { center } else { left },
  inset: 8pt,
  stroke: 0.5pt + luma(200),
  [*Name*], [*Department*], [*Status*],
  [Alice], [Engineering], [Active],
  [Bob], [Design], [Active],
  [Carol], [Marketing], [On Leave],
  [Dave], [Engineering], [Active],
)
```

### Fill Function Signature

The `fill` parameter can be a function that receives cell coordinates:

```typst
// (x, y) => color  where x = column index, y = row index (both 0-based)
fill: (x, y) => {
  if y == 0 { rgb("#1a56db") }      // header row
  else if calc.rem(y, 2) == 0 { luma(248) }  // even rows
  else { white }                      // odd rows
}
```

### Align Function Signature

```typst
// (x, y) => alignment
align: (x, y) => {
  if x == 0 { left }          // first column left-aligned
  else if y == 0 { center }   // header centered
  else { right }              // data right-aligned
}
```

### Stroke Function Signature

```typst
// (x, y) => stroke
stroke: (x, y) => {
  (
    bottom: if y == 0 { 2pt + black } else { 0.5pt + luma(200) },
    rest: none,
  )
}
```

## Comprehensive Styled Table Example

```typst
#let header-color = rgb("#1e3a5f")
#let header-text = white
#let border-color = luma(220)
#let alt-row = luma(248)

#table(
  columns: (auto, 1fr, 1fr, auto),
  stroke: none,
  inset: (x: 12pt, y: 8pt),
  fill: (x, y) => if y == 0 { header-color } else if calc.rem(y, 2) == 0 { alt-row },
  align: (x, y) => if x == 3 { right } else { left },

  // Header
  table.header(
    ..([*ID*], [*Product*], [*Category*], [*Price*]).map(c =>
      table.cell(fill: header-color)[#text(fill: header-text, c)]
    ),
  ),

  // Separator
  table.hline(stroke: 2pt + header-color),

  // Data rows
  [001], [Widget Pro], [Hardware], [\$49.99],
  [002], [DataSync], [Software], [\$29.99],
  [003], [CloudKit], [SaaS], [\$9.99/mo],
  [004], [PowerCell], [Hardware], [\$89.99],

  // Footer
  table.hline(stroke: 1pt + border-color),
  table.footer(
    table.cell(colspan: 3, align: right)[*Total (one-time):*],
    [*\$169.97*],
  ),
)
```

## Table Without Borders (Clean Style)

```typst
#table(
  columns: (1fr, auto, auto),
  stroke: none,
  inset: (x: 0pt, y: 6pt),
  align: (left, right, right),

  table.hline(stroke: 1.5pt),
  [*Description*], [*Qty*], [*Amount*],
  table.hline(stroke: 0.5pt),
  [Consulting services], [40 hrs], [\$4,000],
  [Development], [120 hrs], [\$12,000],
  [Testing], [20 hrs], [\$2,000],
  table.hline(stroke: 0.5pt),
  table.cell(colspan: 2, align: right)[*Total*], [*\$18,000*],
  table.hline(stroke: 1.5pt),
)
```

## Gotchas

- Table children are laid out left-to-right, top-to-bottom. The number of columns determines when rows wrap.
- `table.cell()` is needed for `colspan`/`rowspan`, custom fill/alignment per cell.
- `fill`, `align`, and `stroke` can all be functions of `(x, y)` for per-cell control.
- When using `table.header()` with `repeat: true`, the header repeats on every page if the table spans multiple pages.
- `stroke: none` removes all borders. Then use `table.hline()` / `table.vline()` to add specific rules.
- Inset dictionary: `(x: 10pt, y: 5pt)` or `(left: 10pt, right: 10pt, top: 5pt, bottom: 5pt)`.
- Column alignment shorthand: `align: (left, center, right)` sets per-column alignment as an array.
