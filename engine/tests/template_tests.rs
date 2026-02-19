//! Integration tests using real template fixtures.
//!
//! These tests use the templates from tests/fixtures/templates/ with actual fonts
//! to ensure PDFs are generated with visible content.

use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::sync::Arc;

use docuforge_engine::cache::asset_cache::AssetCache;
use docuforge_engine::engine::compiler::Compiler;
use docuforge_engine::engine::fonts::FontLoader;
use docuforge_engine::models::request::{RenderRequest, Template};

// =============================================================================
// Test helpers
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
    let cache = AssetCache::new(10 * 1024 * 1024);
    Compiler::new(fonts, cache)
}

fn load_template(name: &str) -> String {
    let path = fixtures_dir().join("templates").join(name);
    fs::read_to_string(&path).unwrap_or_else(|e| panic!("Failed to load template {}: {}", name, e))
}

fn load_data(name: &str) -> serde_json::Value {
    let path = fixtures_dir().join("data").join(name);
    let content =
        fs::read_to_string(&path).unwrap_or_else(|e| panic!("Failed to load data {}: {}", name, e));
    serde_json::from_str(&content)
        .unwrap_or_else(|e| panic!("Failed to parse JSON {}: {}", name, e))
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

/// Validate that a PDF is well-formed and contains expected structure
fn validate_pdf(pdf: &[u8], min_size: usize) {
    // Check header
    assert!(
        pdf.starts_with(b"%PDF-"),
        "PDF should start with %PDF- magic bytes"
    );

    // Check minimum size
    assert!(
        pdf.len() >= min_size,
        "PDF should be at least {} bytes, got {}",
        min_size,
        pdf.len()
    );

    let pdf_str = String::from_utf8_lossy(pdf);

    // Check for essential PDF structure
    assert!(pdf_str.contains("%%EOF"), "PDF should have EOF marker");
    assert!(
        pdf_str.contains("/Type /Page"),
        "PDF should have page definition"
    );
    assert!(pdf_str.contains("/Font"), "PDF should have font references");
}

// =============================================================================
// Minimal template test
// =============================================================================

#[tokio::test]
async fn test_minimal_template() {
    let compiler = compiler_with_fonts();
    let template = load_template("minimal.typ");
    let request = make_request(&template, None);

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok(), "minimal.typ should compile successfully");

    let pdf = result.unwrap();
    validate_pdf(&pdf, 1000);

    println!("minimal.typ PDF size: {} bytes", pdf.len());
}

// =============================================================================
// Hello name template test
// =============================================================================

#[tokio::test]
async fn test_hello_name_template() {
    let compiler = compiler_with_fonts();
    let template = load_template("hello_name.typ");
    let data = load_data("simple.json");
    let request = make_request(&template, Some(data));

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok(), "hello_name.typ should compile successfully");

    let pdf = result.unwrap();
    validate_pdf(&pdf, 1000);

    println!("hello_name.typ PDF size: {} bytes", pdf.len());
}

// =============================================================================
// Invoice template test
// =============================================================================

#[tokio::test]
async fn test_invoice_template() {
    let compiler = compiler_with_fonts();
    let template = load_template("invoice.typ");
    let data = load_data("invoice_data.json");
    let request = make_request(&template, Some(data));

    let result = compiler.compile(&request, 5000).await;
    assert!(
        result.is_ok(),
        "invoice.typ should compile successfully: {:?}",
        result.err()
    );

    let pdf = result.unwrap();
    validate_pdf(&pdf, 2000);

    println!("invoice.typ PDF size: {} bytes", pdf.len());
}

// =============================================================================
// Letter template test
// =============================================================================

#[tokio::test]
async fn test_letter_template() {
    let compiler = compiler_with_fonts();
    let template = load_template("letter.typ");
    let data = load_data("letter_data.json");
    let request = make_request(&template, Some(data));

    let result = compiler.compile(&request, 5000).await;
    assert!(
        result.is_ok(),
        "letter.typ should compile successfully: {:?}",
        result.err()
    );

    let pdf = result.unwrap();
    validate_pdf(&pdf, 2000);

    println!("letter.typ PDF size: {} bytes", pdf.len());
}

// =============================================================================
// Report template test (multi-page)
// =============================================================================

#[tokio::test]
async fn test_report_template() {
    let compiler = compiler_with_fonts();
    let template = load_template("report.typ");
    let data = load_data("report_data.json");
    let request = make_request(&template, Some(data));

    let result = compiler.compile(&request, 10000).await; // Longer timeout for multi-page
    assert!(
        result.is_ok(),
        "report.typ should compile successfully: {:?}",
        result.err()
    );

    let pdf = result.unwrap();
    validate_pdf(&pdf, 5000); // Multi-page should be larger

    // Check that it likely has multiple pages
    let pdf_str = String::from_utf8_lossy(&pdf);
    let page_count = pdf_str.matches("/Type /Page").count();
    println!(
        "report.typ PDF size: {} bytes, pages: {}",
        pdf.len(),
        page_count
    );

    // Report should have multiple pages due to pagebreaks
    assert!(page_count >= 3, "Report should have at least 3 pages");
}

// =============================================================================
// Error case tests
// =============================================================================

#[tokio::test]
async fn test_syntax_error_template() {
    let compiler = compiler_with_fonts();
    let template = load_template("syntax_error.typ");
    let request = make_request(&template, None);

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_err(), "syntax_error.typ should fail to compile");

    let err = result.unwrap_err();
    println!("Syntax error: {:?}", err);
}

// =============================================================================
// Font rendering tests
// =============================================================================

#[tokio::test]
async fn test_font_rendering_inter() {
    let compiler = compiler_with_fonts();
    let content = r#"
#set text(font: "Inter")
This text uses the Inter font family.
"#;
    let request = make_request(content, None);

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok(), "Should compile with Inter font");

    let pdf = result.unwrap();
    validate_pdf(&pdf, 1000);
}

#[tokio::test]
async fn test_font_rendering_roboto() {
    let compiler = compiler_with_fonts();
    let content = r#"
#set text(font: "Roboto")
This text uses the Roboto font family.
"#;
    let request = make_request(content, None);

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok(), "Should compile with Roboto font");

    let pdf = result.unwrap();
    validate_pdf(&pdf, 1000);
}

#[tokio::test]
async fn test_font_rendering_jetbrains_mono() {
    let compiler = compiler_with_fonts();
    let content = r#"
#set text(font: "JetBrains Mono")
This text uses monospace font.

```rust
fn main() {
    println!("Hello, code!");
}
```
"#;
    let request = make_request(content, None);

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok(), "Should compile with JetBrains Mono font");

    let pdf = result.unwrap();
    validate_pdf(&pdf, 1000);
}

#[tokio::test]
async fn test_mixed_fonts() {
    let compiler = compiler_with_fonts();
    let content = r#"
#set text(font: "Inter")

= Document with Mixed Fonts

Regular text in Inter.

#text(font: "Roboto")[This paragraph uses Roboto.]

#text(font: "JetBrains Mono")[`code_example()`]

Back to Inter.
"#;
    let request = make_request(content, None);

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok(), "Should compile with mixed fonts");

    let pdf = result.unwrap();
    validate_pdf(&pdf, 2000); // Should be larger with multiple fonts embedded
}

// =============================================================================
// Complex data substitution tests
// =============================================================================

#[tokio::test]
async fn test_boolean_data() {
    let compiler = compiler_with_fonts();
    let content = r#"
Active: #if sys.inputs.is_active [Yes] else [No]
"#;
    let request = make_request(content, Some(serde_json::json!({ "is_active": true })));

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_numeric_data() {
    let compiler = compiler_with_fonts();
    let content = r#"
Integer: #sys.inputs.count
Float: #sys.inputs.price
"#;
    let request = make_request(
        content,
        Some(serde_json::json!({ "count": 42, "price": 19.99 })),
    );

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_null_handling() {
    let compiler = compiler_with_fonts();
    let content = r#"
Value: #sys.inputs.maybe_null
"#;
    let request = make_request(content, Some(serde_json::json!({ "maybe_null": null })));

    let result = compiler.compile(&request, 5000).await;
    // Typst handles none values gracefully
    assert!(result.is_ok());
}
