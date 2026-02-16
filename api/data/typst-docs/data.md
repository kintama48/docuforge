# Typst Data — Loading, Parsing, and Manipulation

## `sys.inputs` — Template Data Input

`sys.inputs` is a dictionary of string key-value pairs passed to the Typst compiler at compile time. This is the primary mechanism for injecting dynamic data into templates (critical for DocuForge).

```typst
// Access input data
#let name = sys.inputs.at("name", default: "Unknown")
#let data = json.decode(sys.inputs.at("data", default: "{}"))

// Check if input exists
#if "title" in sys.inputs [
  = #sys.inputs.title
]
```

**Important**: All `sys.inputs` values are strings. Parse JSON for complex data:

```typst
#let raw-data = sys.inputs.at("items", default: "[]")
#let items = json.decode(raw-data)

#for item in items [
  - #item.name: #item.value
]
```

## `#json()` — Load JSON File

```typst
#json(path)          // str (positional) — file path, returns parsed value
```

```typst
#let data = json("data.json")
#data.name           // access fields
#data.items.len()    // array length
```

### `json.decode()` — Parse JSON String

```typst
#json.decode(data)   // str or bytes — JSON string to parse
```

```typst
#let obj = json.decode("{\"name\": \"Alice\", \"age\": 30}")
#obj.name  // "Alice"
```

### `json.encode()` — Encode to JSON String

```typst
#json.encode(value)  // any — value to encode
```

## `#csv()` — Load CSV File

```typst
#csv(
  path,              // str (positional) — file path
  delimiter: str,    // delimiter character — default ","
  row-type: type,    // array (default) or dictionary
)
```

```typst
// Returns array of arrays
#let data = csv("sales.csv")
#let headers = data.first()
#let rows = data.slice(1)

// With dictionary rows (uses first row as keys)
#let data = csv("sales.csv", row-type: dictionary)
#for row in data [
  #row.name: #row.amount \
]
```

### `csv.decode()` — Parse CSV String

```typst
#csv.decode(data, delimiter: ",", row-type: array)
```

## `#yaml()` — Load YAML File

```typst
#yaml(path)          // str (positional) — file path
```

```typst
#let config = yaml("config.yaml")
#config.title
```

### `yaml.decode()` / `yaml.encode()`

```typst
#let data = yaml.decode("key: value\nlist:\n  - a\n  - b")
#yaml.encode((key: "value", list: ("a", "b")))
```

## `#toml()` — Load TOML File

```typst
#toml(path)          // str (positional) — file path
```

```typst
#let config = toml("config.toml")
```

### `toml.decode()` / `toml.encode()`

## `#xml()` — Load XML File

```typst
#xml(path)           // str (positional) — file path, returns array of XML nodes
```

```typst
#let doc = xml("data.xml")
// Returns nested array/dictionary structure representing XML tree
```

### `xml.decode()` — Parse XML String

## `#read()` — Read Raw File

```typst
#read(
  path,              // str (positional) — file path
  encoding: auto | none | str, // encoding — default auto ("utf-8"); none for bytes
)
```

```typst
#let content = read("template.txt")
#let bytes = read("image.png", encoding: none)
```

## String Methods

```typst
#let s = "Hello, World!"

s.len()                    // 13 — character count
s.contains("World")        // true
s.starts-with("Hello")     // true
s.ends-with("!")           // true
s.find("World")            // "World" or none
s.position("World")        // 7
s.match(regex("\w+"))      // first match object
s.matches(regex("\w+"))    // array of all match objects

s.split(", ")              // ("Hello", "World!")
s.split()                  // split on whitespace
s.trim()                   // remove leading/trailing whitespace
s.trim("!", at: end)       // trim specific chars, at: start | end
s.replace("World", "Typst") // "Hello, Typst!"
s.replace(regex("\w+"), "X") // replace with regex

s.slice(0, 5)              // "Hello" — slice by index
s.first()                  // "H"
s.last()                   // "!"
s.at(0)                    // "H"
s.rev()                    // reverse string

s.clusters()               // array of grapheme clusters
s.codepoints()             // array of codepoints

// Case conversion
"hello".to-unicode()       // (not a method — no built-in case conversion)
upper("hello")             // "HELLO" — use the `upper` function
lower("HELLO")             // "hello" — use the `lower` function
```

### String Match Object

```typst
#let m = "abc123".match(regex("(\d+)"))
// m.start — start index
// m.end — end index
// m.text — matched text
// m.captures — array of capture groups
```

## Array Methods

```typst
#let arr = (1, 2, 3, 4, 5)

arr.len()                    // 5
arr.first()                  // 1
arr.last()                   // 5
arr.at(2)                    // 3 (0-indexed)
arr.at(-1)                   // 5 (negative indexing)
arr.at(10, default: 0)       // 0 (with default)
arr.slice(1, 3)              // (2, 3)
arr.contains(3)              // true
arr.find(x => x > 3)        // 4
arr.position(x => x > 3)    // 3

// Transformation
arr.map(x => x * 2)         // (2, 4, 6, 8, 10)
arr.filter(x => x > 2)      // (3, 4, 5)
arr.fold(0, (acc, x) => acc + x)  // 15 (sum)
arr.rev()                    // (5, 4, 3, 2, 1)
arr.sorted()                 // sorted ascending
arr.sorted(key: x => -x)    // sorted descending
arr.dedup()                  // remove consecutive duplicates
arr.flatten()                // flatten nested arrays

// Joining
arr.join(", ")               // "1, 2, 3, 4, 5"
arr.join(", ", last: " and ") // "1, 2, 3, 4 and 5"

// Enumeration
arr.enumerate()              // ((0, 1), (1, 2), (2, 3), ...)
arr.enumerate(start: 1)     // ((1, 1), (2, 2), (3, 3), ...)

// Combining
arr.zip(("a", "b", "c"))    // ((1, "a"), (2, "b"), (3, "c"))
(1, 2) + (3, 4)             // (1, 2, 3, 4) — concatenation

// Mutation (creates new array)
arr.push(6)                  // error: arrays are immutable — use:
#let arr2 = arr + (6,)       // (1, 2, 3, 4, 5, 6)

// Range
range(5)                     // (0, 1, 2, 3, 4)
range(1, 6)                  // (1, 2, 3, 4, 5)
range(0, 10, step: 2)       // (0, 2, 4, 6, 8)
```

## Dictionary Methods

```typst
#let d = (name: "Alice", age: 30, role: "Engineer")

d.at("name")                 // "Alice"
d.at("missing", default: none) // none (with default)
d.keys()                     // ("name", "age", "role")
d.values()                   // ("Alice", 30, "Engineer")
d.pairs()                    // (("name", "Alice"), ("age", 30), ("role", "Engineer"))
d.len()                      // 3

// Check key existence
"name" in d                  // true
"email" in d                 // false

// Iteration
#for (key, value) in d [
  *#key*: #value \
]

// Insert/remove (returns new dictionary)
#let d2 = d + (email: "a@b.com")  // add/merge
// To remove, construct a new dict:
#let d3 = (:)
#for (k, v) in d {
  if k != "age" { d3.insert(k, v) }
}

// Insert method (mutates in-place within let binding)
#{
  let d = (a: 1)
  d.insert("b", 2)     // d is now (a: 1, b: 2)
  d.remove("a")        // d is now (b: 2)
}
```

## Type Conversions

```typst
int("42")            // 42
int(3.7)             // 3 (truncates)
float("3.14")        // 3.14
float(42)            // 42.0
str(42)              // "42"
str(3.14)            // "3.14"
str(true)            // "true"
repr((1, 2, 3))      // "(1, 2, 3)" — debug representation
type(42)             // int
type("hi")           // str
type((1, 2))         // array
```

## Common Data Patterns for Templates

### Loading JSON Data from sys.inputs

```typst
// Standard DocuForge pattern: data passed as JSON string via sys.inputs
#let raw = sys.inputs.at("data", default: "{}")
#let data = json.decode(raw)

// With fallback defaults
#let company = data.at("company", default: (name: "Company", address: ""))
#let items = data.at("items", default: ())
#let total = items.fold(0.0, (sum, item) => sum + float(item.at("amount", default: "0")))
```

### Building a Table from Data

```typst
#let items = json.decode(sys.inputs.at("items", default: "[]"))

#table(
  columns: (auto, 1fr, auto),
  table.header([*#*], [*Description*], [*Amount*]),
  ..items.enumerate().map(((i, item)) => (
    [#{i + 1}],
    [#item.description],
    [#item.amount],
  )).flatten(),
)
```

### Conditional Content Based on Data

```typst
#let show-notes = sys.inputs.at("show_notes", default: "false") == "true"

#if show-notes and "notes" in data [
  == Notes
  #data.notes
]
```

## Gotchas

- `sys.inputs` values are always strings. Always parse with `json.decode()`, `int()`, `float()`, etc.
- Arrays are immutable once created. Use `+` to concatenate, and `let` rebinding to "modify."
- Dictionary field access with `.field` syntax only works for known string keys. Use `.at("key")` for dynamic keys.
- `json()` loads from a file path. `json.decode()` parses a string. Don't confuse them.
- `csv()` returns an array of arrays by default. Use `row-type: dictionary` to get named fields.
- Empty array literal needs a trailing comma: `(,)` is empty... actually `()` is the empty array/dictionary. A single-element array is `(1,)`.
- `range()` end is exclusive: `range(0, 3)` produces `(0, 1, 2)`.
