# Typst Visualize — Shapes, Images, and Colors

## `#rect()` — Rectangle

```typst
#rect(
  body,                // content (positional, optional)
  width: auto | relative,
  height: auto | relative | fraction,
  fill: none | color | gradient | pattern,
  stroke: none | auto | stroke | dictionary,
  radius: relative | dictionary,    // corner radius
  inset: relative | dictionary,     // inner padding
  outset: relative | dictionary,    // outer expansion
)
```

```typst
#rect(width: 100pt, height: 50pt, fill: blue, radius: 4pt)
#rect(fill: luma(240), stroke: 1pt + gray, inset: 10pt)[Content inside]
#rect(
  width: 100%,
  stroke: (left: 3pt + blue, rest: 0.5pt + luma(200)),
  radius: (right: 6pt),
  inset: 12pt,
)[Styled rectangle]
```

## `#square()` — Square

```typst
#square(
  body,                // content (positional, optional)
  size: auto | length, // side length
  fill: none | color | gradient | pattern,
  stroke: none | auto | stroke | dictionary,
  radius: relative | dictionary,
  inset: relative | dictionary,
  outset: relative | dictionary,
)
```

```typst
#square(size: 40pt, fill: red)
#square(size: 60pt, fill: eastern, stroke: 2pt + navy)[#align(center + horizon)[#text(white)[A]]]
```

## `#circle()` — Circle

```typst
#circle(
  body,                // content (positional, optional)
  radius: length,      // circle radius (alternative to width/height)
  fill: none | color | gradient | pattern,
  stroke: none | auto | stroke,
  inset: relative | dictionary,
  outset: relative | dictionary,
)
```

```typst
#circle(radius: 20pt, fill: green)
#circle(radius: 30pt, fill: eastern, stroke: none)[#align(center + horizon)[#text(white)[1]]]
```

## `#ellipse()` — Ellipse

```typst
#ellipse(
  body,
  width: auto | relative,
  height: auto | relative | fraction,
  fill: none | color | gradient | pattern,
  stroke: none | auto | stroke,
  inset: relative | dictionary,
  outset: relative | dictionary,
)
```

```typst
#ellipse(width: 100pt, height: 60pt, fill: purple.lighten(60%))
```

## `#line()` — Line

```typst
#line(
  start: array,       // (x, y) start point — default (0pt, 0pt)
  end: none | array,  // (x, y) end point
  length: relative,   // line length (alternative to end) — default 0pt
  angle: angle,       // line angle — default 0deg
  stroke: stroke,     // line stroke — default 1pt + black
)
```

```typst
#line(length: 100%, stroke: 0.5pt + luma(180))
#line(start: (0pt, 0pt), end: (100pt, 50pt), stroke: 2pt + red)
#line(length: 50pt, angle: 45deg)
```

## `#polygon()` — Polygon

```typst
#polygon(
  ..vertices,          // array of (x, y) pairs (variadic positional)
  fill: none | color | gradient | pattern,
  fill-rule: str,      // "non-zero" or "even-odd" — default "non-zero"
  stroke: none | auto | stroke,
)
```

```typst
// Triangle
#polygon(
  fill: orange,
  (0pt, 40pt), (20pt, 0pt), (40pt, 40pt),
)

// Pentagon
#polygon(
  fill: blue.lighten(70%),
  stroke: 1pt + blue,
  (25pt, 0pt), (50pt, 18pt), (40pt, 45pt), (10pt, 45pt), (0pt, 18pt),
)
```

## `#path()` — Bezier Path

```typst
#path(
  ..vertices,          // array of points or (point, pre-handle, post-handle) (variadic positional)
  fill: none | color | gradient | pattern,
  fill-rule: str,      // "non-zero" or "even-odd"
  stroke: none | auto | stroke,
  closed: bool,        // close the path — default false
)
```

```typst
// Curved path with control points
#path(
  fill: purple.lighten(80%),
  stroke: 1pt + purple,
  closed: true,
  ((0pt, 50pt), (0pt, -20pt), (0pt, 20pt)),
  ((50pt, 0pt), (-20pt, 0pt), (20pt, 0pt)),
  ((100pt, 50pt), (0pt, -20pt), (0pt, 20pt)),
)
```

## `#image()` — Images

```typst
#image(
  path,              // str (positional) — file path or URL
  width: auto | relative,
  height: auto | relative | fraction,
  alt: none | str,   // alt text
  fit: str,          // "cover", "contain", or "stretch" — default "cover"
  format: auto | str, // "png", "jpg", "gif", "svg" — default auto
)
```

```typst
#image("logo.png", width: 80%)
#image("photo.jpg", width: 200pt, height: 150pt, fit: "contain")
#image("diagram.svg", width: 100%)

// Image in figure
#figure(
  image("chart.png", width: 80%),
  caption: [Sales data for Q4],
)
```

### `image.decode()` — Decode Image from Bytes/String

```typst
// Decode SVG from string
#image.decode(
  data,            // str or bytes — the image data
  format: auto | str,
  width: auto | relative,
  height: auto | relative | fraction,
  alt: none | str,
  fit: str,
)
```

## Colors

### Color Constructors

```typst
// RGB (0-255 or hex)
rgb(r, g, b)          // e.g. rgb(255, 0, 128)
rgb(r, g, b, a)       // with alpha (0-255)
rgb("#ff0080")        // hex string
rgb("#ff008080")      // hex with alpha

// Luma (grayscale)
luma(value)           // 0 (black) to 255 (white)
luma(value, alpha)    // with alpha

// CMYK
cmyk(c, m, y, k)     // 0% to 100% each

// HSL (via color.hsl)
color.hsl(hue, saturation, lightness)
color.hsl(hue, saturation, lightness, alpha)

// HSV (via color.hsv)
color.hsv(hue, saturation, value)
color.hsv(hue, saturation, value, alpha)

// Oklab
oklab(lightness, a, b)
oklab(lightness, a, b, alpha)

// Oklch
oklch(lightness, chroma, hue)
oklch(lightness, chroma, hue, alpha)
```

### Named Colors

```
black, white, gray, silver,
red, maroon, orange, yellow, olive,
green, lime, teal, aqua, cyan,
blue, navy, purple, fuchsia, magenta,
eastern (Typst brand blue)
```

### Color Methods

```typst
color.lighten(amount)   // e.g. blue.lighten(40%)
color.darken(amount)    // e.g. red.darken(20%)
color.negate()          // invert the color
color.saturate(amount)  // increase saturation
color.desaturate(amount)
color.transparentize(amount) // reduce opacity, e.g. blue.transparentize(50%)
color.opacify(amount)   // increase opacity
color.mix(other, space: str) // mix with another color
color.components()      // get color components as dictionary

// Mix two colors
color.mix(red, blue)              // equal mix
color.mix((red, 70%), (blue, 30%)) // weighted mix

// Convert between spaces
color.to-hex()
```

## Gradients

### `gradient.linear()` — Linear Gradient

```typst
gradient.linear(
  ..stops,           // color or (color, ratio) pairs
  angle: angle,      // gradient angle — default 0deg
  space: str,        // color space — "oklab" (default), "srgb", etc.
  relative: str,     // "self" or "parent" — default "self"
  dir: direction,    // alternative to angle — e.g. ttb, ltr
)
```

```typst
#rect(
  width: 100%,
  height: 40pt,
  fill: gradient.linear(blue, purple, angle: 90deg),
)

// With stops
#rect(
  width: 100%,
  height: 40pt,
  fill: gradient.linear((blue, 0%), (white, 50%), (red, 100%)),
)

// Use as text fill
#set text(fill: gradient.linear(blue, purple))
```

### `gradient.radial()` — Radial Gradient

```typst
gradient.radial(
  ..stops,
  center: array,     // (x, y) center — default (50%, 50%)
  radius: relative,  // outer radius — default 50%
  focal-center: auto | array,
  focal-radius: relative,
  space: str,
  relative: str,
)
```

```typst
#circle(
  radius: 40pt,
  fill: gradient.radial(yellow, orange, red),
)
```

### `gradient.conic()` — Conic Gradient

```typst
gradient.conic(
  ..stops,
  center: array,     // (x, y) center — default (50%, 50%)
  angle: angle,      // start angle — default 0deg
  space: str,
  relative: str,
)
```

```typst
#square(
  size: 80pt,
  fill: gradient.conic(red, yellow, green, cyan, blue, purple, red),
)
```

## Patterns

```typst
pattern(
  size: auto | array, // (width, height) of pattern tile
  spacing: array,     // (x, y) spacing between tiles — default (0pt, 0pt)
  relative: str,      // "self" or "parent" — default "self"
  body,               // content — the pattern tile
)
```

```typst
// Dotted pattern
#rect(
  width: 100pt,
  height: 60pt,
  fill: pattern(size: (10pt, 10pt))[
    #circle(radius: 2pt, fill: luma(200))
  ],
)
```

## `stroke()` — Stroke Configuration

Stroke can be specified as shorthand or a dictionary:

```typst
// Shorthand
1pt                    // 1pt black
1pt + red              // 1pt red
2pt + rgb("#333")      // 2pt dark gray

// Full stroke object
stroke(
  paint: color | gradient | pattern, // stroke color — default black
  thickness: length,    // line thickness — default 1pt
  cap: str,            // "butt", "round", "square" — default "butt"
  join: str,           // "miter", "round", "bevel" — default "miter"
  dash: none | str | array | dictionary, // dash pattern
  miter-limit: float,  // miter join limit — default 4.0
)
```

### Dash Patterns

```typst
// Named patterns
stroke(dash: "dashed")       // standard dashes
stroke(dash: "dotted")       // dots
stroke(dash: "dash-dotted")  // dash-dot pattern
stroke(dash: "densely-dashed")
stroke(dash: "loosely-dashed")
stroke(dash: "densely-dotted")
stroke(dash: "loosely-dotted")
stroke(dash: "densely-dash-dotted")
stroke(dash: "loosely-dash-dotted")

// Custom dash array
stroke(dash: (5pt, 3pt))              // on 5pt, off 3pt
stroke(dash: (5pt, 3pt, 1pt, 3pt))    // dash-dot-dash-dot

// Custom dash dictionary
stroke(dash: (array: (5pt, 3pt), phase: 2pt))
```

```typst
#line(length: 100%, stroke: (paint: red, thickness: 2pt, dash: "dashed"))
#rect(
  width: 100pt,
  height: 60pt,
  stroke: stroke(paint: blue, thickness: 1.5pt, cap: "round", dash: "dotted"),
)
```

## Common Visual Patterns

### Card Component
```typst
#let card(title, body) = block(
  width: 100%,
  fill: white,
  stroke: 0.5pt + luma(220),
  radius: 6pt,
  inset: 0pt,
)[
  #block(fill: luma(248), width: 100%, inset: 10pt, radius: (top: 6pt))[
    *#title*
  ]
  #block(inset: 10pt)[#body]
]
```

### Badge/Tag
```typst
#let tag(label, color: blue) = box(
  fill: color.lighten(80%),
  stroke: 0.5pt + color,
  inset: (x: 6pt, y: 2pt),
  radius: 3pt,
  text(size: 8pt, fill: color.darken(20%), label),
)
```
