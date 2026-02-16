# Typst Math — Mathematical Typesetting

## Math Modes

```typst
// Inline math — no spaces around $
$x^2 + y^2 = z^2$

// Display/block math — spaces around $ (or newline)
$ x^2 + y^2 = z^2 $

// Equivalent:
$
  x^2 + y^2 = z^2
$
```

**Key rule**: `$...$` with no spaces inside = inline; `$ ... $` with spaces/newlines = display (centered, larger).

## Basic Syntax

```typst
// Superscript and subscript
$x^2$            // x squared
$x_i$            // x sub i
$x_i^2$          // both
$x^(n+1)$        // grouped superscript
$a_(i j)$        // grouped subscript

// Fractions
$a / b$          // renders as a fraction: a over b
$(a + b) / c$    // grouped fraction

// Square root
$sqrt(x)$
$root(3, x)$    // cube root

// Grouping with parentheses (just for precedence, don't render)
$x^(2n)$
```

## `#math.equation()` — Equation Element

```typst
#math.equation(
  body,              // content (positional)
  block: bool,       // display mode — default false
  numbering: none | str | function, // equation numbering — e.g. "(1)"
  supplement: auto | content | function, // supplement for refs — default auto ("Equation")
  number-align: alignment, // number alignment — default end + horizon
)
```

```typst
// Numbered equations
#set math.equation(numbering: "(1)")

$ E = m c^2 $ <energy>

See @energy for the energy equation.

// Custom numbering per section
#set math.equation(numbering: num => {
  let count = counter(heading).get()
  numbering("(1.1)", ..count, num)
})
```

## Common Symbols

### Greek Letters (lowercase)
```
alpha, beta, gamma, delta, epsilon, zeta, eta, theta,
iota, kappa, lambda, mu, nu, xi, omicron, pi,
rho, sigma, tau, upsilon, phi, chi, psi, omega
```

### Greek Letters (uppercase)
```
Alpha, Beta, Gamma, Delta, Epsilon, Zeta, Eta, Theta,
Iota, Kappa, Lambda, Mu, Nu, Xi, Omicron, Pi,
Rho, Sigma, Tau, Upsilon, Phi, Chi, Psi, Omega
```

### Operators
```
plus, minus, times, div, dot, star, ast,
plus.minus, minus.plus, slash
```

### Relations
```
eq, eq.not, lt, gt, lt.eq, gt.eq,
approx, equiv, tilde, prec, succ,
subset, supset, subset.eq, supset.eq,
in, in.not, ni
```

### Arrows
```
arrow.r, arrow.l, arrow.t, arrow.b,
arrow.r.long (-->), arrow.l.long (<--),
arrow.r.double (==>), arrow.l.double (<==),
arrow.l.r (<->), arrow.l.r.double (<=>),
|->  (maps to)
```

### Big Operators
```
sum, product, integral, integral.double, integral.triple,
union, union.big, sect, sect.big,
and.big, or.big
```

### Misc
```
infinity, partial, nabla, forall, exists, exists.not,
emptyset, nothing, dots, dots.c (centered dots), dots.v (vertical),
hbar, planck, ell
```

### Using Symbols

```typst
$ sum_(i=0)^n i = (n(n+1)) / 2 $

$ integral_0^infinity e^(-x) dif x = 1 $

$ lim_(n -> infinity) (1 + 1/n)^n = e $

// Use `dif` for differential d
$ (dif f) / (dif x) $
```

## Matrices

### `mat()` — Matrix

```typst
$ mat(
  1, 2, 3;
  4, 5, 6;
  7, 8, 9;
) $

// With delimiter
$ mat(delim: "[",
  a, b;
  c, d;
) $

// Augmented matrix
$ mat(augment: #2,
  1, 0, x;
  0, 1, y;
) $

// Gap control
$ mat(gap: #0.5em,
  a, b;
  c, d;
) $
```

### `vec()` — Column Vector

```typst
$ vec(x, y, z) $

$ vec(delim: "[", 1, 2, 3) $

// Row vector (transpose notation)
$ vec(x, y, z)^T $
```

## Cases

```typst
$ f(x) = cases(
  x^2 &"if" x > 0,
  0 &"if" x = 0,
  -x^2 &"if" x < 0,
) $

// Reverse cases (brace on right)
$ cases(delim: "}", reverse: #true,
  x = 1,
  y = 2,
) $
```

## Brackets and Delimiters

### `lr()` — Auto-Sized Delimiters

```typst
// Auto-sized parentheses
$ lr(( sum_(i=0)^n i^2 )) $

// Auto-sized brackets
$ lr([ a / b ]) $

// Mixed delimiters
$ lr(( x | x > 0 )) $

// Manual size
$ lr(size: #2em, ( a / b )) $
```

### Specific Delimiter Functions

```typst
$ abs(x) $           // |x|
$ norm(x) $          // ||x||
$ ceil(x) $          // ceiling
$ floor(x) $         // floor
$ round(x) $         // rounding brackets
```

## `attach()` — Limits and Attachments

```typst
// Limits above/below (for display mode)
$ attach(sum, b: i=0, t: n) $

// Forces limits placement
$ limits(sum)_(i=0)^n $

// Scripts (force side placement)
$ scripts(sum)_(i=0)^n $
```

## Text in Math

```typst
// Roman text inside math
$ "if" x > 0 $

// Use upright for single letters that should not be italic
$ upright(d) / upright(d) x $

// Bold in math
$ bold(x) = vec(x_1, x_2, x_3) $

// Serif/sans-serif
$ serif(A) $
$ sans(A) $

// Calligraphic
$ cal(L) $

// Blackboard bold
$ bb(R) $          // Real numbers
$ bb(Z) $          // Integers
$ bb(N) $          // Natural numbers
$ bb(C) $          // Complex numbers
```

## Alignment

```typst
// Align equations at &
$ x &= a + b \
    &= c + d $

// Multiple aligned equations
$
  f(x) &= x^2 + 2x + 1 \
       &= (x + 1)^2
$
```

## Spacing in Math

```typst
$ a #h(2em) b $     // manual space using h()
$ a thin b $        // thin space
$ a med b $         // medium space
$ a thick b $       // thick space
$ a quad b $        // quad space
```

## Accents and Decorations

```typst
$ hat(x) $          // x with hat
$ tilde(x) $        // x with tilde
$ dot(x) $          // x with dot (time derivative)
$ dot.double(x) $   // x with double dot
$ macron(x) $       // x with bar/macron
$ arrow(x) $        // x with arrow (vector)
$ overline(A B) $   // overline
$ underline(x) $    // underline
$ overbrace(1 + 2 + 3, "text") $  // overbrace with label
$ underbrace(x + y, "sum") $       // underbrace
$ cancel(x) $       // strikethrough/cancel
```

## Common Patterns

### Piecewise Function
```typst
$ |x| = cases(
  x &"if" x >= 0,
  -x &"if" x < 0,
) $
```

### System of Equations
```typst
$ cases(
  x + y = 1,
  x - y = 3,
) $
```

### Summation with Conditions
```typst
$ sum_(k=1)^n k^2 = (n(n+1)(2n+1)) / 6 $
```

### Matrix Equation
```typst
$ mat(a, b; c, d) vec(x, y) = vec(e, f) $
```

## Gotchas

- Variables are italic by default in math. Use `"text"` for upright text.
- Semicolons `;` separate rows in matrices.
- Commas `,` separate elements in vectors and function arguments.
- `&` is for alignment, `\` is for line breaks in multi-line math.
- `dif` produces the upright "d" for differentials.
- Use `#` to escape to code mode inside math: `$x + #calc.sqrt(2)$`.
- Display math (with spaces) centers the equation; inline math flows with text.
- Single letters in math are treated as variables (italic). Multi-letter identifiers like `sin`, `cos`, `log` are recognized as operators (upright).
- For custom operator names, use `op("name")`: `$op("argmax")_x f(x)$`.
