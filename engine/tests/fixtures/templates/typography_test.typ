// Typography test - all heading levels, text styles, code, quotes, links
#set page(paper: "a4", margin: 2cm)
#set text(font: "Inter", size: 11pt)
#set par(justify: true, leading: 0.65em)
#set heading(numbering: "1.1")

// =============================================================================
// HEADING LEVELS
// =============================================================================

= Heading Level 1 (H1)

This is content under a level 1 heading. It represents the main title or primary section of a document.

== Heading Level 2 (H2)

Content under a level 2 heading. Used for major sections within a document.

=== Heading Level 3 (H3)

Content under a level 3 heading. Used for subsections.

==== Heading Level 4 (H4)

Content under a level 4 heading. Used for minor subsections.

===== Heading Level 5 (H5)

Content under a level 5 heading. Rarely used but available.

====== Heading Level 6 (H6)

Content under a level 6 heading. The deepest level of heading.

#v(1em)
#line(length: 100%, stroke: 0.5pt + luma(200))
#v(1em)

// =============================================================================
// TEXT STYLING
// =============================================================================

= Text Formatting

== Basic Styles

*This text is bold* and demonstrates strong emphasis.

_This text is italic_ and demonstrates emphasis.

*_This text is bold and italic_* combining both styles.

#underline[This text is underlined] for additional emphasis.

#strike[This text is struck through] showing deleted content.

#highlight[This text is highlighted] to draw attention.

#smallcaps[This Text Uses Small Caps] for stylistic purposes.

#super[superscript] and #sub[subscript] text examples.

== Font Sizes

#text(size: 8pt)[This is 8pt text - very small]

#text(size: 10pt)[This is 10pt text - small]

#text(size: 12pt)[This is 12pt text - normal]

#text(size: 14pt)[This is 14pt text - slightly larger]

#text(size: 18pt)[This is 18pt text - large]

#text(size: 24pt)[This is 24pt text - very large]

#text(size: 32pt)[32pt - Extra Large]

== Font Weights

#text(weight: 100)[Weight 100 - Thin]

#text(weight: 300)[Weight 300 - Light]

#text(weight: 400)[Weight 400 - Regular]

#text(weight: 500)[Weight 500 - Medium]

#text(weight: 600)[Weight 600 - Semibold]

#text(weight: 700)[Weight 700 - Bold]

#text(weight: 900)[Weight 900 - Black]

== Colors

#text(fill: red)[This text is red]

#text(fill: blue)[This text is blue]

#text(fill: green)[This text is green]

#text(fill: orange)[This text is orange]

#text(fill: purple)[This text is purple]

#text(fill: rgb("#2563eb"))[This text uses a custom hex color]

#text(fill: rgb(220, 38, 38))[This text uses RGB values]

#v(1em)
#line(length: 100%, stroke: 0.5pt + luma(200))
#v(1em)

// =============================================================================
// CODE FORMATTING
// =============================================================================

= Code Formatting

== Inline Code

Here is some inline code: `const x = 42;` and more text after it.

You can use `function_name()` to call a function.

Variables like `$PATH` and `HOME_DIR` are common in shell scripts.

== Code Blocks

Simple code block:

```
This is a plain code block
with multiple lines
and no syntax highlighting
```

Python code:

```python
def fibonacci(n: int) -> int:
    """Calculate the nth Fibonacci number."""
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

# Example usage
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")
```

Rust code:

```rust
fn main() {
    let numbers: Vec<i32> = (1..=10).collect();

    let sum: i32 = numbers.iter()
        .filter(|&n| n % 2 == 0)
        .sum();

    println!("Sum of even numbers: {}", sum);
}
```

JavaScript code:

```javascript
const fetchData = async (url) => {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
```

SQL query:

```sql
SELECT
    u.name,
    COUNT(o.id) as order_count,
    SUM(o.total) as total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.created_at >= '2024-01-01'
GROUP BY u.id, u.name
HAVING COUNT(o.id) > 5
ORDER BY total_spent DESC;
```

#v(1em)
#line(length: 100%, stroke: 0.5pt + luma(200))
#v(1em)

// =============================================================================
// QUOTES AND CITATIONS
// =============================================================================

= Quotes and Citations

== Block Quotes

#quote(block: true, attribution: [Albert Einstein])[
  Imagination is more important than knowledge. Knowledge is limited. Imagination encircles the world.
]

#quote(block: true)[
  The only way to do great work is to love what you do. If you haven't found it yet, keep looking. Don't settle.
]

== Nested Quotes

#quote(block: true)[
  Someone once said:
  #quote(block: true)[
    A quote within a quote demonstrates nesting capability.
  ]
  And that was very profound indeed.
]

#v(1em)
#line(length: 100%, stroke: 0.5pt + luma(200))
#v(1em)

// =============================================================================
// LISTS
// =============================================================================

= Lists

== Bullet Lists

- First item in the list
- Second item in the list
- Third item with a longer description that might wrap to multiple lines to test how the layout handles longer content
- Fourth item
  - Nested item 1
  - Nested item 2
    - Deeply nested item
    - Another deeply nested item
  - Nested item 3
- Fifth item back at top level

== Numbered Lists

+ First numbered item
+ Second numbered item
+ Third numbered item
  + Nested numbered item
  + Another nested numbered item
+ Fourth numbered item

== Definition Lists

/ Term One: This is the definition of the first term. It can be quite long and span multiple lines if necessary.

/ Term Two: A shorter definition.

/ Another Term: Yet another definition to demonstrate the pattern.

#v(1em)
#line(length: 100%, stroke: 0.5pt + luma(200))
#v(1em)

// =============================================================================
// LINKS AND REFERENCES
// =============================================================================

= Links

== URLs

Visit #link("https://example.com")[Example Website] for more information.

Check out #link("https://github.com")[GitHub] for code repositories.

Email us at #link("mailto:info@example.com")[info\@example.com].

== Internal References

See @intro for the introduction section.

Refer to @table-example for data.

#v(1em)

== Labeled Content <intro>

This paragraph has a label and can be referenced from elsewhere in the document.

#figure(
  caption: [Example table with label],
  table(
    columns: 3,
    [A], [B], [C],
    [1], [2], [3],
  )
) <table-example>

#v(1em)
#line(length: 100%, stroke: 0.5pt + luma(200))
#v(1em)

// =============================================================================
// SPECIAL TYPOGRAPHY
// =============================================================================

= Special Typography

== Ligatures and Special Characters

Common ligatures: fi, fl, ff, ffi, ffl

En dash: 1990--2000

Em dash: The answer---if there is one---is complex.

Ellipsis: And so it goes...

Quotes: "Double quotes" and 'single quotes'

== Mathematical Expressions

Note: Math typesetting requires a math-capable font. Here we demonstrate simple math:

Inline text formula: E = mc#super[2]

Fractions: 1/2, 3/4, 5/8

Exponents using superscript: x#super[2] + y#super[3] = z#super[n]

Subscripts: H#sub[2]O, CO#sub[2], C#sub[6]H#sub[12]O#sub[6]

== Symbols and Emoji

Arrows: #sym.arrow.r #sym.arrow.l #sym.arrow.l.r #sym.arrow.r.double #sym.arrow.l.double #sym.arrow.l.r.double

Math symbols: + - \* / = != \< \> \<= \>=

Currency: \$, EUR, GBP, JPY

Greek letters: #sym.alpha, #sym.beta, #sym.gamma, #sym.delta, #sym.pi

== Horizontal Rules

Above the line

#line(length: 100%)

Below the line

#line(length: 100%, stroke: 2pt + blue)

#line(length: 50%, stroke: (dash: "dashed"))

#v(1em)
#line(length: 100%, stroke: 0.5pt + luma(200))
#v(1em)

// =============================================================================
// BOXES AND CALLOUTS
// =============================================================================

= Boxes and Callouts

#rect(
  width: 100%,
  inset: 12pt,
  stroke: 1pt + blue,
  fill: blue.lighten(90%),
)[
  *Info Box*

  This is an informational callout box with a light blue background.
]

#v(0.5em)

#rect(
  width: 100%,
  inset: 12pt,
  stroke: 1pt + orange,
  fill: orange.lighten(90%),
)[
  *Warning Box*

  This is a warning callout box with a light orange background.
]

#v(0.5em)

#rect(
  width: 100%,
  inset: 12pt,
  stroke: 1pt + red,
  fill: red.lighten(90%),
)[
  *Error Box*

  This is an error callout box with a light red background.
]

#v(0.5em)

#rect(
  width: 100%,
  inset: 12pt,
  stroke: 1pt + green,
  fill: green.lighten(90%),
)[
  *Success Box*

  This is a success callout box with a light green background.
]
