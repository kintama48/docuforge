// design.typ — shared design system for DocuForge starter templates.
//
// Conventions:
//   * Inter Variable for text + UI; JetBrains Mono for code/numerics where it helps legibility.
//   * Color palette built around a single brand accent (configurable per render via data.brand_color).
//   * Typography scale: 9pt (caption) → 10pt (body) → 12pt (lead) → 18pt (h3) → 24pt (h2) → 36pt (h1).
//   * Money values pass through `money()` for `$X,XXX.XX` formatting; never `str(number)` raw.
//
// Templates import via:
//   #import "../_shared/design.typ": *
//
// Engine reads the input data via sys.inputs (typed). Templates do `#let data = sys.inputs`.

// ── Palette ─────────────────────────────────────────────────────────────────

#let DEFAULT_BRAND = rgb("#1f3a8a") // indigo-900 default; override via data.brand_color
#let INK = rgb("#0f172a")           // slate-900 — primary text
#let MUTED = rgb("#64748b")         // slate-500 — secondary text
#let SUBTLE = rgb("#94a3b8")        // slate-400 — captions
#let HAIRLINE = rgb("#e2e8f0")      // slate-200 — borders / dividers
#let CANVAS = rgb("#f8fafc")        // slate-50  — table header bg, hero block
#let SUCCESS = rgb("#16a34a")
#let WARNING = rgb("#d97706")
#let DANGER = rgb("#dc2626")

#let resolve-brand(data) = {
  let raw = data.at("brand_color", default: none)
  if raw == none { DEFAULT_BRAND } else { rgb(raw) }
}

// ── Type ────────────────────────────────────────────────────────────────────

#let h1(body, fill: INK) = text(font: "Inter Variable", size: 32pt, weight: 700, fill: fill, body)
#let h2(body, fill: INK) = text(font: "Inter Variable", size: 22pt, weight: 700, fill: fill, body)
#let h3(body, fill: INK) = text(font: "Inter Variable", size: 14pt, weight: 600, fill: fill, body)
#let lead(body, fill: INK) = text(font: "Inter Variable", size: 12pt, weight: 400, fill: fill, body)
#let body-text(body, fill: INK) = text(font: "Inter Variable", size: 10pt, weight: 400, fill: fill, body)
#let caption(body, fill: MUTED) = text(font: "Inter Variable", size: 9pt, weight: 500, tracking: 0.06em, fill: fill, upper(body))

// ── Formatters ──────────────────────────────────────────────────────────────

// money(amount, currency: "USD") → "$1,234.56" (rendered as content, not raw)
// Accepts ints, floats. Always two decimals. Comma-thousands.
#let money(amount, currency: "USD") = {
  let sym = (
    USD: "$", EUR: "€", GBP: "£", JPY: "¥", INR: "₹", CAD: "$", AUD: "$",
  ).at(currency, default: currency + " ")
  let amt = if type(amount) == int { float(amount) } else { amount }
  // round to 2 dp
  let cents = calc.round(amt * 100.0)
  let whole = calc.floor(cents / 100.0)
  let frac = calc.rem(cents, 100.0)
  // add thousands separators
  let s = str(int(whole))
  let neg = s.starts-with("-")
  if neg { s = s.slice(1) }
  let parts = ()
  while s.len() > 3 {
    parts.insert(0, s.slice(s.len() - 3))
    s = s.slice(0, s.len() - 3)
  }
  parts.insert(0, s)
  let grouped = parts.join(",")
  let frac-s = if frac < 10 { "0" + str(int(frac)) } else { str(int(frac)) }
  sym + (if neg { "-" } else { "" }) + grouped + "." + frac-s
}

// date-pretty("2026-06-15") → "Jun 15, 2026"
#let date-pretty(s) = {
  let months = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
  let parts = s.split("-")
  if parts.len() != 3 { return s }
  let y = parts.at(0)
  let m = int(parts.at(1))
  let d = int(parts.at(2))
  if m < 1 or m > 12 { return s }
  months.at(m - 1) + " " + str(d) + ", " + y
}

// ── Layout primitives ───────────────────────────────────────────────────────

// hairline divider with optional vertical breathing room
#let divider(top: 0.6em, bottom: 0.6em) = {
  v(top)
  line(length: 100%, stroke: 0.5pt + HAIRLINE)
  v(bottom)
}

// brand strip used at the top of headed documents (invoice, quote, contract, etc.)
#let brand-strip(brand) = {
  block(width: 100%, height: 6pt, fill: brand)
}

// pill / badge for status (Paid, Unpaid, Overdue, Draft)
#let badge(label, fill: SUCCESS, ink: white) = {
  box(
    inset: (x: 8pt, y: 4pt),
    radius: 4pt,
    fill: fill,
    text(font: "Inter Variable", size: 8pt, weight: 700, fill: ink, tracking: 0.08em, upper(label)),
  )
}

#let status-badge(status) = {
  let s = lower(str(status))
  if s == "paid" { badge("Paid", fill: SUCCESS) }
  else if s == "overdue" { badge("Overdue", fill: DANGER) }
  else if s == "draft" { badge("Draft", fill: MUTED) }
  else { badge("Unpaid", fill: WARNING) }
}

// kvp = "label / value" pair, label is small caps muted, value is body weight
#let kvp(label, value) = grid(
  columns: (auto, 1fr),
  column-gutter: 10pt,
  align: (right, left),
  caption(label),
  body-text(value),
)

// ── Configurable page ───────────────────────────────────────────────────────

#let default-page(brand: DEFAULT_BRAND, margin: (x: 24mm, y: 22mm)) = page(
  paper: "a4",
  margin: margin,
)
