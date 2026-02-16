# Typst Miscellaneous — Counters, State, Queries, and Utilities

## `#datetime()` — Date and Time

```typst
#datetime(
  year: int,         // year
  month: int,        // month (1-12)
  day: int,          // day (1-31)
  hour: int,         // hour (0-23)
  minute: int,       // minute (0-59)
  second: int,       // second (0-59)
)
```

### Methods

```typst
#let d = datetime(year: 2024, month: 6, day: 15)
d.year()             // 2024
d.month()            // 6
d.day()              // 15
d.display()          // default display
d.display("[month repr:long] [day], [year]") // "June 15, 2024"
d.display("[day]/[month]/[year]")            // "15/06/2024"
d.display("[year]-[month]-[day]")            // "2024-06-15"
```

### Display Format Patterns

```
[year]           — 4-digit year: 2024
[year repr:last_two] — 2-digit year: 24
[month]          — zero-padded month: 06
[month repr:long] — full month name: June
[month repr:short] — abbreviated: Jun
[day]            — zero-padded day: 15
[day padding:none] — no padding: 15
[hour]           — 24-hour: 14
[hour repr:12]   — 12-hour: 2
[minute]         — minute: 30
[second]         — second: 00
[period]         — AM/PM
[week_number]    — week of year
[weekday]        — day of week name
[weekday repr:short] — abbreviated weekday
```

### `datetime.today()` — Current Date

```typst
// Requires context
#context datetime.today().display("[month repr:long] [day], [year]")
```

## `#counter()` — Counters

Counters track and display numeric values, typically associated with elements like headings, figures, and pages.

```typst
// Built-in counters
counter(page)        // page counter
counter(heading)     // heading counter
counter(figure)      // figure counter
counter(math.equation) // equation counter
counter(footnote)    // footnote counter

// Custom counter
#let my-counter = counter("my-thing")
```

### Counter Methods (require `context`)

```typst
// Get current value (returns array for hierarchical counters)
context counter(page).get()          // e.g. (3,)
context counter(heading).get()       // e.g. (2, 1) for section 2.1

// Get final value (value at end of document)
context counter(page).final()        // e.g. (10,)

// Display current value
context counter(page).display()      // "3"
context counter(page).display("1/1", both: true) // "3/10"
context counter(heading).display("1.1") // "2.1"

// Step (increment)
#counter(heading).step()             // increment level 1
#counter(heading).step(level: 2)     // increment level 2

// Update (set to specific value)
#counter(page).update(1)             // reset to 1
#counter(page).update(n => n + 5)    // function update
```

### Common Counter Patterns

```typst
// Page X of Y
#set page(footer: context [
  #h(1fr)
  #counter(page).display("1", both: false)
  #[ of ]
  #counter(page).final().first()
  #h(1fr)
])

// Reset page counter after title page
// (use a new page with counter update)
#pagebreak()
#counter(page).update(1)

// Custom element counter
#let theorem-counter = counter("theorem")
#let theorem(body) = {
  theorem-counter.step()
  block(
    fill: luma(245),
    inset: 10pt,
    width: 100%,
  )[
    *Theorem #context theorem-counter.display().* #body
  ]
}
```

## `#state()` — Mutable State

State allows tracking mutable values across the document. Unlike counters, state can hold any value type.

```typst
#state(
  key,               // str (positional) — unique state identifier
  init,              // any (positional, optional) — initial value
)
```

### State Methods (require `context`)

```typst
#let total = state("total", 0)

// Update state
#total.update(10)                    // set to 10
#total.update(v => v + 5)           // increment by 5

// Get current value
context total.get()                  // current value at this point

// Get final value
context total.final()                // value at end of document

// Display
context total.display()              // display current value
context total.display(v => [Total: #v]) // display with formatter
```

### State Example — Running Total

```typst
#let running-total = state("invoice-total", 0.0)

#let add-line-item(desc, amount) = {
  running-total.update(v => v + amount)
  [#desc: \$#amount \ ]
}

#add-line-item("Item A", 100.0)
#add-line-item("Item B", 250.0)
#add-line-item("Item C", 75.0)

*Total: \$#context running-total.get()*
```

## `#query()` — Query Elements

Query finds all elements matching a selector in the document. Must be used in a `context` expression.

```typst
context {
  let headings = query(heading)          // all headings
  let h1s = query(heading.where(level: 1)) // level 1 headings
  let figs = query(figure)              // all figures
  let labeled = query(<my-label>)        // elements with specific label

  // Each result has location(), fields, etc.
  for h in headings {
    [#h.body — page #h.location().page() \ ]
  }
}
```

### Query Result Properties

```typst
context {
  let results = query(heading)
  for item in results {
    item.body          // content of the heading
    item.level         // heading level
    item.location()    // location object
    item.location().page()     // page number
    item.location().position() // (x, y) position on page
  }
}
```

## `#context` — Context Expression

Context expressions give access to location-dependent information like page numbers, counters, and states. Introduced as a replacement for the older `locate()` pattern.

```typst
// Access page number
context [Page #counter(page).get().first()]

// Access heading counter
context [Section #counter(heading).display("1.1")]

// Use in complex expressions
context {
  let page-num = counter(page).get().first()
  let total = counter(page).final().first()
  [#page-num / #total]
}

// Context with query
context {
  let all-headings = query(heading.where(level: 1))
  [There are #all-headings.len() chapters.]
}
```

**Important**: `context` creates a scope where you can use `.get()`, `.final()`, `.display()`, `query()`, `datetime.today()`, and other location-dependent functions.

## `#locate()` — Location-Dependent Content (Legacy)

**Deprecated in favor of `context`**, but still seen in older code:

```typst
// Old pattern (deprecated):
#locate(loc => {
  let page = counter(page).at(loc).first()
  [Page #page]
})

// New pattern (preferred):
context [Page #counter(page).get().first()]
```

## `#metadata()` — Attach Metadata

```typst
#metadata(value) // any (positional) — attach invisible metadata to the document
```

```typst
// Attach metadata with a label
#metadata("chapter-start") <ch-start>

// Query metadata later
context {
  let marks = query(<ch-start>)
  // marks contains metadata elements
}
```

## `#assert()` — Assertions

```typst
#assert(
  condition,         // bool (positional) — condition to check
  message: str,      // error message if assertion fails
)
```

```typst
#assert(items.len() > 0, message: "Items array must not be empty")
#assert(type(count) == int, message: "Count must be an integer")

// assert.eq and assert.ne
#assert.eq(1 + 1, 2)
#assert.ne("a", "b")
```

## `#panic()` — Abort Compilation

```typst
#panic(..values)     // any (variadic) — values to display in error message
```

```typst
#if data == none {
  panic("No data provided to template")
}
```

## `#type()` — Get Type

```typst
#type(value)         // any (positional) — returns the type of the value
```

```typst
#type(42)            // int
#type("hi")          // str
#type(true)          // bool
#type((1, 2))        // array
#type((a: 1))        // dictionary
#type([hello])       // content
#type(none)          // none
#type(auto)          // auto
#type(1pt)           // length
#type(50%)           // ratio
#type(red)           // color
```

## `#eval()` — Evaluate Typst Code

```typst
#eval(
  code,              // str (positional) — Typst code to evaluate
  mode: str,         // "code" (default), "markup", or "math"
  scope: dictionary, // variables available in evaluated code
)
```

```typst
#eval("1 + 2")                    // 3
#eval("[Hello *World*]", mode: "markup") // content
#eval("x + y", scope: (x: 1, y: 2))     // 3
#eval("$ x^2 $", mode: "markup")        // math equation
```

**Warning**: `eval` is powerful but should be used carefully. It cannot access the document context or imports.

## `#selector()` — Construct Selectors

```typst
#selector(target)    // element function, label, or regex
```

```typst
// Combine selectors
#let sel = selector(heading).or(figure)
context query(sel)

// Before/after selectors
selector(heading).before(<my-label>)
selector(heading).after(<my-label>)
```

## Calc Module — Mathematical Functions

```typst
calc.min(..values)           // minimum value
calc.max(..values)           // maximum value
calc.abs(value)              // absolute value
calc.pow(base, exp)          // exponentiation
calc.sqrt(value)             // square root
calc.root(n, value)          // nth root
calc.exp(value)              // e^value
calc.ln(value)               // natural logarithm
calc.log(value, base: 10)   // logarithm

calc.round(value, digits: 0) // round to digits
calc.ceil(value)             // ceiling
calc.floor(value)            // floor
calc.trunc(value)            // truncate to integer
calc.fract(value)            // fractional part
calc.rem(a, b)               // remainder (modulo)
calc.quo(a, b)               // quotient

calc.sin(angle)              // sine (takes angle: 90deg)
calc.cos(angle)              // cosine
calc.tan(angle)              // tangent
calc.asin(value)             // arcsine (returns angle)
calc.acos(value)             // arccosine
calc.atan(value)             // arctangent

calc.even(int)               // is even
calc.odd(int)                // is odd
calc.gcd(a, b)               // greatest common divisor
calc.lcm(a, b)               // least common multiple
calc.fact(int)               // factorial
calc.perm(n, k)              // permutations
calc.binom(n, k)             // binomial coefficient
calc.clamp(value, min, max)  // clamp to range

calc.pi                      // 3.14159...
calc.e                       // 2.71828...
calc.inf                     // infinity
calc.nan                     // not a number
```

### Examples

```typst
#calc.round(3.14159, digits: 2)  // 3.14
#calc.min(1, 2, 3)               // 1
#calc.max(1, 2, 3)               // 3
#calc.abs(-5)                    // 5
#calc.pow(2, 10)                 // 1024
#calc.rem(17, 5)                 // 2
#calc.clamp(15, 0, 10)          // 10

// Format currency
#let format-currency(amount) = {
  let rounded = calc.round(amount, digits: 2)
  [\$#rounded]
}
```

## `#document()` — Document Metadata

```typst
#set document(
  title: none | content,    // document title (for PDF metadata)
  author: str | array,      // author(s)
  keywords: array,          // keywords
  date: auto | none | datetime, // document date
)
```

```typst
#set document(
  title: "My Report",
  author: ("Alice", "Bob"),
  keywords: ("report", "analysis"),
  date: datetime(year: 2024, month: 6, day: 15),
)
```

## Common Utility Patterns

### Custom Numbered Element

```typst
#let definition-counter = counter("definition")

#let definition(term, body) = {
  definition-counter.step()
  block(
    width: 100%,
    inset: 10pt,
    stroke: (left: 2pt + eastern),
    fill: eastern.lighten(95%),
  )[
    *Definition #context definition-counter.display().* (#emph(term)) \
    #body
  ]
}

#definition("Convergence")[A sequence converges if...]
```

### Page Header with Section Title

```typst
#set page(header: context {
  let elems = query(selector(heading.where(level: 1)).before(here()))
  if elems.len() > 0 {
    let current = elems.last()
    set text(size: 9pt, style: "italic")
    current.body
    h(1fr)
    counter(page).display()
  }
})
```

### Conditional Page Numbering (Roman for Front Matter)

```typst
// Front matter with roman numerals
#set page(numbering: "i")
#outline()
#pagebreak()

// Main content with arabic numbers
#set page(numbering: "1")
#counter(page).update(1)
= Introduction
#lorem(200)
```

## Gotchas

- `context` is required for any location-dependent operation: `counter.get()`, `counter.final()`, `state.get()`, `state.final()`, `query()`, `here()`, `datetime.today()`.
- Counters return arrays: `counter(page).get()` returns `(3,)`, not `3`. Use `.first()` to get the number.
- `state.get()` returns the value at the current point in the document, which may differ from `state.final()`.
- `query()` returns all matching elements in the entire document, regardless of where it's called.
- `eval()` runs in an isolated scope. It cannot see `#let` bindings or imports from the calling context unless passed via `scope`.
- `here()` returns the current location; used inside `context` to get the current position.
- Custom counters use string keys: `counter("my-name")`. Built-in counters use element functions: `counter(page)`.
