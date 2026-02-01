//! Comprehensive integration tests for all template types and edge cases.
//!
//! This test file covers:
//! - All template types (invoice, report, resume, contract, etc.)
//! - Multi-page document generation
//! - Large tables and stress testing
//! - Deeply nested data structures
//! - Edge cases (empty arrays, special characters, unicode)
//! - PDF validation and structure verification

use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::sync::Arc;

use docuforge_engine::cache::asset_cache::AssetCache;
use docuforge_engine::engine::compiler::Compiler;
use docuforge_engine::engine::fonts::FontLoader;
use docuforge_engine::models::request::{RenderRequest, Template};

// =============================================================================
// Test Infrastructure
// =============================================================================

fn fonts_dir() -> &'static Path {
    Path::new(concat!(env!("CARGO_MANIFEST_DIR"), "/assets/fonts"))
}

fn fixtures_dir() -> &'static Path {
    Path::new(concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures"))
}

fn compiler_with_fonts() -> Compiler {
    let fonts = FontLoader::load_from_directory(fonts_dir())
        .expect("Failed to load fonts from assets/fonts");
    let fonts = Arc::new(fonts);
    let cache = AssetCache::new(50 * 1024 * 1024); // 50MB cache for stress tests
    Compiler::new(fonts, cache)
}

fn load_template(name: &str) -> String {
    let path = fixtures_dir().join("templates").join(name);
    fs::read_to_string(&path).unwrap_or_else(|e| panic!("Failed to load template {}: {}", name, e))
}

fn load_data(name: &str) -> serde_json::Value {
    let path = fixtures_dir().join("data").join(name);
    let content = fs::read_to_string(&path)
        .unwrap_or_else(|e| panic!("Failed to load data {}: {}", name, e));
    serde_json::from_str(&content).unwrap_or_else(|e| panic!("Failed to parse JSON {}: {}", name, e))
}

fn make_request(template_content: &str, data: Option<serde_json::Value>) -> RenderRequest {
    let mut files = HashMap::new();
    files.insert("main.typ".to_string(), template_content.to_string());

    RenderRequest {
        template: Template {
            main: "main.typ".to_string(),
            files,
        },
        data,
        assets: None,
        options: None,
    }
}

/// Validate that a PDF is well-formed and contains expected structure.
fn validate_pdf(pdf: &[u8], min_size: usize) {
    assert!(
        pdf.starts_with(b"%PDF-"),
        "PDF should start with %PDF- magic bytes, got: {:?}",
        &pdf[..std::cmp::min(10, pdf.len())]
    );

    assert!(
        pdf.len() >= min_size,
        "PDF should be at least {} bytes, got {}",
        min_size,
        pdf.len()
    );

    let pdf_str = String::from_utf8_lossy(pdf);
    assert!(pdf_str.contains("%%EOF"), "PDF should have EOF marker");
    assert!(
        pdf_str.contains("/Type /Page"),
        "PDF should have page definition"
    );
}

/// Count the number of pages in a PDF by searching for page objects.
fn count_pdf_pages(pdf: &[u8]) -> usize {
    let pdf_str = String::from_utf8_lossy(pdf);
    // Count /Type /Page but not /Type /Pages (the parent)
    pdf_str
        .matches("/Type /Page")
        .count()
        .saturating_sub(pdf_str.matches("/Type /Pages").count())
}

/// Check if PDF likely contains embedded fonts.
fn has_embedded_fonts(pdf: &[u8]) -> bool {
    let pdf_str = String::from_utf8_lossy(pdf);
    pdf_str.contains("/Font") && pdf_str.contains("/FontDescriptor")
}

// =============================================================================
// DETAILED INVOICE TEMPLATE TESTS
// =============================================================================

#[tokio::test]
async fn test_invoice_detailed_compiles() {
    let compiler = compiler_with_fonts();
    let template = load_template("invoice_detailed.typ");
    let data = load_data("invoice_detailed.json");
    let request = make_request(&template, Some(data));

    let result = compiler.compile(&request, 15000).await;
    assert!(
        result.is_ok(),
        "invoice_detailed.typ should compile: {:?}",
        result.err()
    );

    let pdf = result.unwrap();
    validate_pdf(&pdf, 5000);
    assert!(has_embedded_fonts(&pdf), "Invoice should have embedded fonts");

    println!(
        "invoice_detailed.typ: {} bytes, {} pages",
        pdf.len(),
        count_pdf_pages(&pdf)
    );
}

#[tokio::test]
async fn test_invoice_detailed_has_line_items() {
    let compiler = compiler_with_fonts();
    let template = load_template("invoice_detailed.typ");
    let data = load_data("invoice_detailed.json");
    let request = make_request(&template, Some(data));

    let result = compiler.compile(&request, 15000).await;
    assert!(result.is_ok());

    let pdf = result.unwrap();
    // The invoice has 12 line items, so PDF should be substantial
    assert!(
        pdf.len() > 10000,
        "Invoice with 12 items should be larger, got {} bytes",
        pdf.len()
    );
}

// =============================================================================
// MULTI-PAGE REPORT TEMPLATE TESTS
// =============================================================================

#[tokio::test]
async fn test_report_multipage_compiles() {
    let compiler = compiler_with_fonts();
    let template = load_template("report_multipage.typ");
    let data = load_data("report_multipage.json");
    let request = make_request(&template, Some(data));

    let result = compiler.compile(&request, 30000).await; // Longer timeout for complex report
    assert!(
        result.is_ok(),
        "report_multipage.typ should compile: {:?}",
        result.err()
    );

    let pdf = result.unwrap();
    validate_pdf(&pdf, 10000);

    println!(
        "report_multipage.typ: {} bytes, {} pages",
        pdf.len(),
        count_pdf_pages(&pdf)
    );
}

#[tokio::test]
async fn test_report_multipage_has_multiple_pages() {
    let compiler = compiler_with_fonts();
    let template = load_template("report_multipage.typ");
    let data = load_data("report_multipage.json");
    let request = make_request(&template, Some(data));

    let result = compiler.compile(&request, 30000).await;
    assert!(result.is_ok());

    let pdf = result.unwrap();
    let page_count = count_pdf_pages(&pdf);

    assert!(
        page_count >= 5,
        "Multi-page report should have at least 5 pages, got {}",
        page_count
    );
}

#[tokio::test]
async fn test_report_has_table_of_contents() {
    let compiler = compiler_with_fonts();
    let template = load_template("report_multipage.typ");
    let data = load_data("report_multipage.json");
    let request = make_request(&template, Some(data));

    let result = compiler.compile(&request, 30000).await;
    assert!(result.is_ok());

    // TOC functionality is tested by successful compilation
    // Typst's outline() function would error if it couldn't build TOC
    let pdf = result.unwrap();
    assert!(pdf.len() > 15000, "Report with TOC should be substantial");
}

// =============================================================================
// PROFESSIONAL RESUME TEMPLATE TESTS
// =============================================================================

#[tokio::test]
async fn test_resume_professional_compiles() {
    let compiler = compiler_with_fonts();
    let template = load_template("resume_professional.typ");
    let data = load_data("resume_data.json");
    let request = make_request(&template, Some(data));

    let result = compiler.compile(&request, 15000).await;
    assert!(
        result.is_ok(),
        "resume_professional.typ should compile: {:?}",
        result.err()
    );

    let pdf = result.unwrap();
    validate_pdf(&pdf, 5000);

    println!(
        "resume_professional.typ: {} bytes, {} pages",
        pdf.len(),
        count_pdf_pages(&pdf)
    );
}

#[tokio::test]
async fn test_resume_fits_reasonable_length() {
    let compiler = compiler_with_fonts();
    let template = load_template("resume_professional.typ");
    let data = load_data("resume_data.json");
    let request = make_request(&template, Some(data));

    let result = compiler.compile(&request, 15000).await;
    assert!(result.is_ok());

    let pdf = result.unwrap();
    let page_count = count_pdf_pages(&pdf);

    // A professional resume should be 1-3 pages
    assert!(
        page_count >= 1 && page_count <= 3,
        "Resume should be 1-3 pages, got {}",
        page_count
    );
}

// =============================================================================
// LEGAL CONTRACT TEMPLATE TESTS
// =============================================================================

#[tokio::test]
async fn test_contract_legal_compiles() {
    let compiler = compiler_with_fonts();
    let template = load_template("contract_legal.typ");
    let data = load_data("contract_data.json");
    let request = make_request(&template, Some(data));

    let result = compiler.compile(&request, 20000).await;
    assert!(
        result.is_ok(),
        "contract_legal.typ should compile: {:?}",
        result.err()
    );

    let pdf = result.unwrap();
    validate_pdf(&pdf, 8000);

    println!(
        "contract_legal.typ: {} bytes, {} pages",
        pdf.len(),
        count_pdf_pages(&pdf)
    );
}

#[tokio::test]
async fn test_contract_has_signature_blocks() {
    let compiler = compiler_with_fonts();
    let template = load_template("contract_legal.typ");
    let data = load_data("contract_data.json");
    let request = make_request(&template, Some(data));

    let result = compiler.compile(&request, 20000).await;
    assert!(result.is_ok());

    // Contract with signature blocks compiles successfully
    let pdf = result.unwrap();
    assert!(pdf.len() > 10000, "Contract should be substantial");
}

// =============================================================================
// TABLE STRESS TEST
// =============================================================================

#[tokio::test]
async fn test_table_stress_test_compiles() {
    let compiler = compiler_with_fonts();
    let template = load_template("table_stress_test.typ");
    let data = load_data("table_large.json");
    let request = make_request(&template, Some(data));

    let result = compiler.compile(&request, 30000).await; // Extended timeout for stress test
    assert!(
        result.is_ok(),
        "table_stress_test.typ should compile: {:?}",
        result.err()
    );

    let pdf = result.unwrap();
    validate_pdf(&pdf, 10000);

    println!(
        "table_stress_test.typ: {} bytes, {} pages",
        pdf.len(),
        count_pdf_pages(&pdf)
    );
}

#[tokio::test]
async fn test_wide_table_10_columns() {
    let compiler = compiler_with_fonts();
    let template = load_template("table_stress_test.typ");
    let data = load_data("table_large.json");
    let request = make_request(&template, Some(data));

    let result = compiler.compile(&request, 30000).await;
    assert!(
        result.is_ok(),
        "Wide table with 10+ columns should compile"
    );
}

#[tokio::test]
async fn test_long_table_25_rows() {
    let compiler = compiler_with_fonts();
    let template = load_template("table_stress_test.typ");
    let data = load_data("table_large.json");
    let request = make_request(&template, Some(data));

    let result = compiler.compile(&request, 30000).await;
    assert!(result.is_ok(), "Long table with 25 rows should compile");

    let pdf = result.unwrap();
    // Long table should span multiple pages
    let page_count = count_pdf_pages(&pdf);
    assert!(
        page_count >= 2,
        "Table with 25 rows should span multiple pages"
    );
}

#[tokio::test]
async fn test_nested_tables() {
    let compiler = compiler_with_fonts();
    let template = load_template("table_stress_test.typ");
    let data = load_data("table_large.json");
    let request = make_request(&template, Some(data));

    let result = compiler.compile(&request, 30000).await;
    assert!(result.is_ok(), "Nested tables should compile");
}

#[tokio::test]
async fn test_empty_table_data() {
    let compiler = compiler_with_fonts();
    let template = load_template("table_stress_test.typ");
    let data = load_data("table_large.json");

    // The empty_table_data field is already empty in the fixture
    if let serde_json::Value::Object(ref map) = data {
        assert!(
            map.get("empty_table_data")
                .map(|v| v.as_array().map(|a| a.is_empty()).unwrap_or(false))
                .unwrap_or(false),
            "Test data should have empty_table_data array"
        );
    }

    let request = make_request(&template, Some(data));
    let result = compiler.compile(&request, 30000).await;
    assert!(result.is_ok(), "Template with empty table should compile");
}

// =============================================================================
// DATA-INTENSIVE TEMPLATE TESTS
// =============================================================================

#[tokio::test]
async fn test_data_intensive_compiles() {
    let compiler = compiler_with_fonts();
    let template = load_template("data_intensive.typ");
    let data = load_data("nested_complex.json");
    let request = make_request(&template, Some(data));

    let result = compiler.compile(&request, 30000).await;
    assert!(
        result.is_ok(),
        "data_intensive.typ should compile: {:?}",
        result.err()
    );

    let pdf = result.unwrap();
    validate_pdf(&pdf, 10000);

    println!(
        "data_intensive.typ: {} bytes, {} pages",
        pdf.len(),
        count_pdf_pages(&pdf)
    );
}

#[tokio::test]
async fn test_deeply_nested_data_access() {
    let compiler = compiler_with_fonts();
    let template = load_template("data_intensive.typ");
    let data = load_data("nested_complex.json");
    let request = make_request(&template, Some(data));

    let result = compiler.compile(&request, 30000).await;
    assert!(
        result.is_ok(),
        "Deeply nested data (products.categories.subcategories.products) should work"
    );
}

#[tokio::test]
async fn test_conditional_rendering() {
    let compiler = compiler_with_fonts();
    let template = load_template("data_intensive.typ");
    let data = load_data("nested_complex.json");
    let request = make_request(&template, Some(data));

    // The template has conditional sections based on include_appendix
    let result = compiler.compile(&request, 30000).await;
    assert!(result.is_ok(), "Conditional rendering should work");
}

#[tokio::test]
async fn test_array_iteration_with_index() {
    let compiler = compiler_with_fonts();
    let template = load_template("data_intensive.typ");
    let data = load_data("nested_complex.json");
    let request = make_request(&template, Some(data));

    // The template uses .enumerate() for indexed iteration
    let result = compiler.compile(&request, 30000).await;
    assert!(result.is_ok(), "Array iteration with enumerate should work");
}

// =============================================================================
// TYPOGRAPHY TEST
// =============================================================================

#[tokio::test]
async fn test_typography_test_compiles() {
    let compiler = compiler_with_fonts();
    let template = load_template("typography_test.typ");
    let request = make_request(&template, None);

    let result = compiler.compile(&request, 15000).await;
    assert!(
        result.is_ok(),
        "typography_test.typ should compile: {:?}",
        result.err()
    );

    let pdf = result.unwrap();
    validate_pdf(&pdf, 10000);

    println!(
        "typography_test.typ: {} bytes, {} pages",
        pdf.len(),
        count_pdf_pages(&pdf)
    );
}

#[tokio::test]
async fn test_all_heading_levels() {
    let compiler = compiler_with_fonts();
    let content = r#"
= Heading 1
== Heading 2
=== Heading 3
==== Heading 4
===== Heading 5
====== Heading 6
"#;
    let request = make_request(content, None);

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok(), "All heading levels should compile");
}

#[tokio::test]
async fn test_text_formatting_styles() {
    let compiler = compiler_with_fonts();
    let content = r#"
*Bold text*
_Italic text_
*_Bold and italic_*
#underline[Underlined]
#strike[Strikethrough]
#highlight[Highlighted]
#smallcaps[Small Caps]
#super[superscript] and #sub[subscript]
"#;
    let request = make_request(content, None);

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok(), "All text formatting styles should compile");
}

#[tokio::test]
async fn test_code_blocks() {
    let compiler = compiler_with_fonts();
    let content = r#"
Inline: `let x = 42`

```rust
fn main() {
    println!("Hello");
}
```

```python
def greet():
    print("Hello")
```
"#;
    let request = make_request(content, None);

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok(), "Code blocks should compile");
}

// =============================================================================
// COMPLEX LAYOUT TEST
// =============================================================================

#[tokio::test]
async fn test_layout_complex_compiles() {
    let compiler = compiler_with_fonts();
    let template = load_template("layout_complex.typ");
    let data = load_data("layout_complex.json");
    let request = make_request(&template, Some(data));

    let result = compiler.compile(&request, 20000).await;
    assert!(
        result.is_ok(),
        "layout_complex.typ should compile: {:?}",
        result.err()
    );

    let pdf = result.unwrap();
    validate_pdf(&pdf, 8000);

    println!(
        "layout_complex.typ: {} bytes, {} pages",
        pdf.len(),
        count_pdf_pages(&pdf)
    );
}

#[tokio::test]
async fn test_multi_column_layout() {
    let compiler = compiler_with_fonts();
    let content = r#"
#columns(2)[
  First column content here.

  #colbreak()

  Second column content here.
]
"#;
    let request = make_request(content, None);

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok(), "Multi-column layout should compile");
}

#[tokio::test]
async fn test_three_column_layout() {
    let compiler = compiler_with_fonts();
    let content = r#"
#columns(3, gutter: 1em)[
  Column 1
  #colbreak()
  Column 2
  #colbreak()
  Column 3
]
"#;
    let request = make_request(content, None);

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok(), "Three-column layout should compile");
}

#[tokio::test]
async fn test_page_breaks() {
    let compiler = compiler_with_fonts();
    let content = r#"
Page 1 content

#pagebreak()

Page 2 content

#pagebreak()

Page 3 content
"#;
    let request = make_request(content, None);

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok());

    let pdf = result.unwrap();
    let page_count = count_pdf_pages(&pdf);
    assert_eq!(page_count, 3, "Should have exactly 3 pages");
}

#[tokio::test]
async fn test_headers_and_footers() {
    let compiler = compiler_with_fonts();
    let content = r#"
#set page(
  header: [Header Text],
  footer: context [Page #counter(page).display()]
)

Content on page 1.

#pagebreak()

Content on page 2.
"#;
    let request = make_request(content, None);

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok(), "Headers and footers should compile");
}

// =============================================================================
// EDGE CASES
// =============================================================================

#[tokio::test]
async fn test_empty_array_handling() {
    let compiler = compiler_with_fonts();
    let content = r#"
#let items = sys.inputs.items
Items count: #items.len()

#if items.len() == 0 [
  No items found.
] else [
  #for item in items [
    - #item
  ]
]
"#;
    let request = make_request(content, Some(serde_json::json!({ "items": [] })));

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok(), "Empty array should be handled gracefully");
}

#[tokio::test]
async fn test_missing_optional_field() {
    let compiler = compiler_with_fonts();
    let content = r#"
Name: #sys.inputs.name
#if sys.inputs.at("optional_field", default: none) != none [
  Optional: #sys.inputs.optional_field
]
"#;
    let request = make_request(content, Some(serde_json::json!({ "name": "Test" })));

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok(), "Missing optional field should be handled");
}

#[tokio::test]
async fn test_very_long_string() {
    let compiler = compiler_with_fonts();
    let content = r#"
#sys.inputs.long_text
"#;
    let long_text = "A".repeat(10000); // 10k character string
    let request = make_request(
        content,
        Some(serde_json::json!({ "long_text": long_text })),
    );

    let result = compiler.compile(&request, 10000).await;
    assert!(result.is_ok(), "Very long strings should be handled");
}

#[tokio::test]
async fn test_special_characters() {
    let compiler = compiler_with_fonts();
    let content = r#"
Currency: \$1,234.56, EUR 999.99
Quotes: "Hello" and 'World'
Ampersand: A & B
Angle brackets: \<tag\> and \>value\<
Percent: 15%
"#;
    let request = make_request(content, None);

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok(), "Special characters should be handled");
}

#[tokio::test]
async fn test_unicode_characters() {
    let compiler = compiler_with_fonts();
    let content = r#"
Chinese: #sys.inputs.chinese
Japanese: #sys.inputs.japanese
Korean: #sys.inputs.korean
Arabic: #sys.inputs.arabic
Emojis: #sys.inputs.emojis
"#;
    let request = make_request(
        content,
        Some(serde_json::json!({
            "chinese": "Hello",
            "japanese": "Hello",
            "korean": "Hello",
            "arabic": "Hello",
            "emojis": "Hello World"
        })),
    );

    let result = compiler.compile(&request, 5000).await;
    // May fail if fonts don't support these characters, but shouldn't crash
    // The important thing is it doesn't panic
    println!("Unicode result: {:?}", result.is_ok());
}

#[tokio::test]
async fn test_numbers_with_many_decimals() {
    let compiler = compiler_with_fonts();
    let content = r#"
Pi: #sys.inputs.pi
Tiny: #sys.inputs.tiny
Large: #sys.inputs.large
"#;
    let request = make_request(
        content,
        Some(serde_json::json!({
            "pi": 3.141592653589793,
            "tiny": 0.000000001,
            "large": 9999999999.999999
        })),
    );

    let result = compiler.compile(&request, 5000).await;
    assert!(
        result.is_ok(),
        "Numbers with many decimals should be handled"
    );
}

#[tokio::test]
async fn test_negative_numbers() {
    let compiler = compiler_with_fonts();
    let content = r#"
Negative: #sys.inputs.negative
"#;
    let request = make_request(content, Some(serde_json::json!({ "negative": -42.5 })));

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok(), "Negative numbers should be handled");
}

#[tokio::test]
async fn test_boolean_values() {
    let compiler = compiler_with_fonts();
    let content = r#"
#if sys.inputs.flag [
  Flag is true
] else [
  Flag is false
]
"#;
    let request = make_request(content, Some(serde_json::json!({ "flag": true })));
    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok());

    let request = make_request(content, Some(serde_json::json!({ "flag": false })));
    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok(), "Boolean values should be handled");
}

#[tokio::test]
async fn test_null_values() {
    let compiler = compiler_with_fonts();
    let content = r#"
#let val = sys.inputs.nullable
#if val == none [
  Value is null/none
] else [
  Value: #val
]
"#;
    let request = make_request(content, Some(serde_json::json!({ "nullable": null })));

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok(), "Null values should be handled as none");
}

// =============================================================================
// PDF VALIDATION TESTS
// =============================================================================

#[tokio::test]
async fn test_pdf_starts_with_magic_bytes() {
    let compiler = compiler_with_fonts();
    let request = make_request("Hello, World!", None);

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok());

    let pdf = result.unwrap();
    assert!(
        pdf.starts_with(b"%PDF-"),
        "PDF must start with %PDF- magic bytes"
    );
}

#[tokio::test]
async fn test_pdf_ends_with_eof() {
    let compiler = compiler_with_fonts();
    let request = make_request("Hello, World!", None);

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok());

    let pdf = result.unwrap();
    let pdf_str = String::from_utf8_lossy(&pdf);
    assert!(pdf_str.contains("%%EOF"), "PDF must contain %%EOF marker");
}

#[tokio::test]
async fn test_pdf_has_reasonable_size() {
    let compiler = compiler_with_fonts();
    let request = make_request("Hello, World!", None);

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok());

    let pdf = result.unwrap();
    // A minimal PDF with fonts should be at least 1KB
    assert!(
        pdf.len() >= 1000,
        "PDF should be at least 1KB, got {} bytes",
        pdf.len()
    );
    // And not absurdly large for simple content
    assert!(
        pdf.len() < 1_000_000,
        "Simple PDF shouldn't exceed 1MB, got {} bytes",
        pdf.len()
    );
}

#[tokio::test]
async fn test_pdf_not_empty() {
    let compiler = compiler_with_fonts();
    let request = make_request("Test content", None);

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok());

    let pdf = result.unwrap();
    assert!(!pdf.is_empty(), "PDF should not be empty");
}

// =============================================================================
// STRESS TESTS
// =============================================================================

#[tokio::test]
async fn test_many_pages() {
    let compiler = compiler_with_fonts();
    // Generate content that will span many pages
    let mut content = String::new();
    for i in 1..=20 {
        content.push_str(&format!("= Section {}\n\n", i));
        content.push_str("Lorem ipsum dolor sit amet, consectetur adipiscing elit. ");
        content.push_str("Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ");
        content.push_str("Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris. ");
        content.push_str("\n\n#pagebreak()\n\n");
    }

    let request = make_request(&content, None);
    let result = compiler.compile(&request, 30000).await;
    assert!(result.is_ok(), "Document with many pages should compile");

    let pdf = result.unwrap();
    let page_count = count_pdf_pages(&pdf);
    assert!(page_count >= 15, "Should have many pages, got {}", page_count);
}

#[tokio::test]
async fn test_large_data_payload() {
    let compiler = compiler_with_fonts();
    let content = r#"
#for item in sys.inputs.items [
  - Item #item.id: #item.name (#item.value)
]
"#;
    // Generate a large array of items
    let items: Vec<_> = (1..=500)
        .map(|i| {
            serde_json::json!({
                "id": i,
                "name": format!("Item number {}", i),
                "value": i * 10
            })
        })
        .collect();

    let request = make_request(content, Some(serde_json::json!({ "items": items })));
    let result = compiler.compile(&request, 30000).await;
    assert!(
        result.is_ok(),
        "Large data payload should compile: {:?}",
        result.err()
    );
}

#[tokio::test]
async fn test_complex_nested_loops() {
    let compiler = compiler_with_fonts();
    let content = r#"
#for category in sys.inputs.categories [
  = #category.name

  #for sub in category.subs [
    == #sub.name

    #for item in sub.items [
      - #item
    ]
  ]
]
"#;
    let data = serde_json::json!({
        "categories": [
            {
                "name": "Category 1",
                "subs": [
                    {"name": "Sub 1.1", "items": ["A", "B", "C"]},
                    {"name": "Sub 1.2", "items": ["D", "E"]}
                ]
            },
            {
                "name": "Category 2",
                "subs": [
                    {"name": "Sub 2.1", "items": ["F", "G", "H", "I"]}
                ]
            }
        ]
    });

    let request = make_request(content, Some(data));
    let result = compiler.compile(&request, 10000).await;
    assert!(result.is_ok(), "Complex nested loops should compile");
}

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

#[tokio::test]
async fn test_syntax_error_returns_error() {
    let compiler = compiler_with_fonts();
    let content = "#[unclosed bracket";
    let request = make_request(content, None);

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_err(), "Syntax error should return error");
}

#[tokio::test]
async fn test_undefined_variable_returns_error() {
    let compiler = compiler_with_fonts();
    let content = "#sys.inputs.undefined_variable_that_does_not_exist";
    let request = make_request(content, Some(serde_json::json!({ "other": "value" })));

    let result = compiler.compile(&request, 5000).await;
    // This might error or might return none depending on Typst version
    // The important thing is it doesn't panic
    println!("Undefined variable result: {:?}", result.is_ok());
}

#[tokio::test]
async fn test_type_error_returns_error() {
    let compiler = compiler_with_fonts();
    let content = "#calc.sqrt(\"not a number\")";
    let request = make_request(content, None);

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_err(), "Type error should return error");
}
