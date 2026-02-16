# Typst Foundations — Core Language Constructs

## Variables and Functions with `#let`

```typst
// Variable binding
#let name = "Alice"
#let count = 42
#let ratio = 3.14
#let active = true
#let items = (1, 2, 3)           // array
#let config = (key: "value")     // dictionary
#let nothing = none

// Function definition
#let greet(name) = [Hello, #name!]

// Function with default parameter
#let badge(label, color: blue) = {
  box(fill: color, inset: 4pt, radius: 2pt, text(white, label))
}

// Destructuring
#let (a, b) = (1, 2)
#let (name: n, age: a) = (name: "Bob", age: 30)
```

### Function Signatures

Functions use positional and named arguments. Named arguments have defaults.

```typst
// Positional args come first, named args can appear in any order
#let card(title, body, width: 100%, border: true) = {
  block(
    width: width,
    stroke: if border { 1pt } else { none },
    inset: 8pt,
    [*#title* \ #body]
  )
}

// Calling with positional then named args
#card("Title", "Body text", width: 50%, border: false)
```

### Variadic Arguments

```typst
// args sink captures remaining positional and named arguments
#let flex(..args) = {
  // args.pos() returns array of positional args
  // args.named() returns dictionary of named args
  for item in args.pos() {
    item
  }
}
```

## Set Rules with `#set`

Set rules configure default properties for elements within a scope.

```typst
// Set default text properties
#set text(font: "Inter", size: 11pt)

// Set paragraph defaults
#set par(justify: true, leading: 0.65em)

// Set page defaults
#set page(margin: 2cm)

// Set heading numbering
#set heading(numbering: "1.1")

// Scoped set rule (only applies inside the block)
#block[
  #set text(fill: red)
  This text is red.
]
This text is not red.

// Conditional set rule
#set text(fill: red) if urgent
```

## Show Rules with `#show`

Show rules transform how elements are displayed.

```typst
// Transform all headings
#show heading: it => {
  set text(blue)
  block(below: 0.8em, it.body)
}

// Transform specific heading levels
#show heading.where(level: 1): it => {
  pagebreak(weak: true)
  text(size: 24pt, it.body)
}

// Transform all emphasis to colored text
#show emph: set text(fill: navy)

// Replace text with regex
#show regex("TODO"): box(fill: yellow, inset: 2pt, [TODO])

// Transform raw code blocks
#show raw.where(block: true): it => {
  block(fill: luma(240), inset: 8pt, radius: 4pt, it)
}

// Show-everything rule (applies to all content)
#show: columns.with(2)
```

### Selector Syntax

Selectors filter which elements a rule applies to:

```typst
heading                          // all headings
heading.where(level: 1)          // level 1 headings only
heading.where(level: 2)          // level 2 headings only
figure.where(kind: table)        // only table figures
figure.where(kind: image)        // only image figures
raw.where(block: true)           // only block code
selector(heading).or(figure)     // heading or figure
```

## Types

| Type         | Example                          | Description                     |
|--------------|----------------------------------|---------------------------------|
| `content`    | `[Hello]`, `text("hi")`         | Typeset-able content            |
| `str`        | `"hello"`                        | String                          |
| `int`        | `42`, `-3`                       | Integer                         |
| `float`      | `3.14`, `1e-5`                   | Floating point                  |
| `bool`       | `true`, `false`                  | Boolean                         |
| `array`      | `(1, 2, 3)`                      | Ordered sequence                |
| `dictionary` | `(key: "val")`                   | Key-value mapping               |
| `none`       | `none`                           | Absence of value                |
| `auto`       | `auto`                           | Automatic/default value         |
| `length`     | `12pt`, `1em`, `2cm`, `3in`      | Physical/font-relative length   |
| `ratio`      | `50%`, `100%`                    | Percentage                      |
| `relative`   | `1em + 50%`                      | Length + ratio combined         |
| `fraction`   | `1fr`, `2fr`                     | Fractional space                |
| `color`      | `red`, `rgb("#ff0000")`          | Color value                     |
| `alignment`  | `center`, `left + top`           | 1D or 2D alignment             |
| `angle`      | `45deg`, `1rad`                  | Angle                           |
| `direction`  | `ltr`, `rtl`, `ttb`, `btt`      | Direction                       |
| `label`      | `<my-label>`                     | Reference label                 |
| `regex`      | `regex("\d+")`                   | Regular expression              |
| `function`   | `(x) => x + 1`                  | Function value                  |

### Length Units

```typst
12pt        // points (1/72 inch)
1em         // relative to current font size
1cm         // centimeters
1mm         // millimeters
1in         // inches
50%         // percentage of container
1fr         // fractional unit (for grid/stack)
1em + 20%   // combined relative length
```

## Control Flow

### If/Else

```typst
#if count > 10 [
  Many items.
] else if count > 0 [
  Some items.
] else [
  No items.
]

// Inline ternary-style
#let color = if urgent { red } else { black }
```

### For Loop

```typst
// Iterate over array
#for item in items [
  - #item
]

// Iterate with index using enumerate
#for (i, item) in items.enumerate() [
  #(i + 1). #item
]

// Iterate over dictionary
#for (key, value) in config [
  *#key*: #value \
]

// For loop in code block returns joined content
#{
  for i in range(5) {
    [Item #i. ]
  }
}
```

### While Loop

```typst
#{
  let i = 0
  while i < 5 {
    [#i ]
    i += 1
  }
}
```

## Content Blocks and Code Blocks

```typst
// Content block — markup mode, returns content
[This is *markup* with #variable]

// Code block — code mode, returns last expression
{
  let x = 1 + 2
  [The result is #x]
}

// Nesting: code in content, content in code
[The answer is #{
  let a = 2
  let b = 3
  [#(a + b)]
}]
```

## Importing

```typst
// Import everything from a file
#import "template.typ": *

// Import specific items
#import "utils.typ": badge, card

// Import and rename
#import "utils.typ": badge as my-badge

// Import from package
#import "@preview/tablex:0.0.8": tablex, cellx
```

## Gotchas

- Trailing commas are allowed in arrays, dictionaries, and function arguments.
- A single-element array needs a trailing comma: `(1,)` — without it, `(1)` is just parenthesized `1`.
- Dictionary keys are strings but written without quotes: `(key: val)` is the same as `("key": val)`.
- `#let` bindings are scoped to the nearest block. Top-level bindings are file-scoped.
- `none` and `""` are different — `none` produces no output, `""` is an empty string.
- Use `#{ }` for multi-statement code; `#expr` for single expressions.
- To concatenate content, use `+`: `[Hello] + [ ] + [World]`.
- To join strings, use `+`: `"Hello" + " " + "World"`.
- Methods use dot syntax: `"hello".len()`, `items.at(0)`.
- Field access on content: `heading.body`, `figure.caption`, etc.
