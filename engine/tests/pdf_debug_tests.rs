//! Debug tests for the blank PDF issue.
//!
//! These tests diagnose why PDFs are being generated with no visible content.
//! The root cause: tests use FontLoader::empty(), which means no fonts are available.
//! Typst compiles successfully but produces PDFs with invisible text.

use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;

use docuforge_engine::cache::asset_cache::AssetCache;
use docuforge_engine::engine::compiler::Compiler;
use docuforge_engine::engine::fonts::FontLoader;
use docuforge_engine::models::request::{RenderRequest, Template};
use serde_json::json;

// =============================================================================
// Test helpers
// =============================================================================

/// Get the path to the fonts directory
fn fonts_dir() -> &'static Path {
    Path::new(concat!(env!("CARGO_MANIFEST_DIR"), "/assets/fonts"))
}

/// Create a compiler with actual fonts loaded
fn compiler_with_fonts() -> Compiler {
    let fonts = FontLoader::load_from_directory(fonts_dir())
        .expect("Failed to load fonts from assets/fonts");
    println!("Loaded {} fonts", fonts.len());
    let fonts = Arc::new(fonts);
    let cache = AssetCache::new(10 * 1024 * 1024);
    Compiler::new(fonts, cache)
}

/// Create a compiler with no fonts (reproduces the blank PDF bug)
fn compiler_without_fonts() -> Compiler {
    let fonts = Arc::new(FontLoader::empty());
    let cache = AssetCache::new(10 * 1024 * 1024);
    Compiler::new(fonts, cache)
}

fn simple_request(content: &str) -> RenderRequest {
    let mut files = HashMap::new();
    files.insert("main.typ".to_string(), content.to_string());

    RenderRequest {
        template: Template {
            main: "main.typ".to_string(),
            files,
        },
        data: None,
        assets: None,
        options: None,
    }
}

fn request_with_data(content: &str, data: serde_json::Value) -> RenderRequest {
    let mut files = HashMap::new();
    files.insert("main.typ".to_string(), content.to_string());

    RenderRequest {
        template: Template {
            main: "main.typ".to_string(),
            files,
        },
        data: Some(data),
        assets: None,
        options: None,
    }
}

// =============================================================================
// Debug tests: Understanding the blank PDF issue
// =============================================================================

#[tokio::test]
async fn debug_compile_without_fonts_produces_blank_pdf() {
    // This test demonstrates the bug: compiling without fonts produces a PDF
    // that has no visible text.
    let compiler = compiler_without_fonts();
    let request = simple_request("Hello, World!");

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok(), "Compilation should succeed even without fonts");

    let pdf = result.unwrap();

    // PDF is generated
    assert!(pdf.starts_with(b"%PDF-"), "Should produce valid PDF header");

    // PDF has content (metadata, structure)
    println!("PDF size without fonts: {} bytes", pdf.len());
    assert!(pdf.len() > 100, "PDF should have some content");

    // But the PDF is essentially blank - no font data embedded
    // This is the bug we're debugging
    let pdf_str = String::from_utf8_lossy(&pdf);

    // Check if there are any font references
    let has_font_ref = pdf_str.contains("/Font") || pdf_str.contains("/F1");
    println!("Has font reference: {}", has_font_ref);

    // Without fonts, Typst still creates a PDF but text is invisible
    // because there's no font to render it with
}

#[tokio::test]
async fn debug_compile_with_fonts_produces_visible_text() {
    // This test shows the fix: with fonts loaded, PDFs have visible text
    let compiler = compiler_with_fonts();
    let request = simple_request("Hello, World!");

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok(), "Compilation should succeed with fonts");

    let pdf = result.unwrap();

    // PDF is generated
    assert!(pdf.starts_with(b"%PDF-"), "Should produce valid PDF header");

    // PDF should be larger with embedded font data
    println!("PDF size with fonts: {} bytes", pdf.len());
    assert!(pdf.len() > 1000, "PDF with fonts should be larger");

    // Check for font references in the PDF
    let pdf_str = String::from_utf8_lossy(&pdf);
    let has_font_ref = pdf_str.contains("/Font");
    println!("Has font reference: {}", has_font_ref);
    assert!(has_font_ref, "PDF should contain font references");
}

#[tokio::test]
async fn debug_compare_pdf_sizes() {
    // Compare PDF sizes between with and without fonts
    let content = "Hello, World! This is a test of PDF generation.";

    let compiler_no_fonts = compiler_without_fonts();
    let compiler_fonts = compiler_with_fonts();

    let request = simple_request(content);

    let pdf_no_fonts = compiler_no_fonts.compile(&request, 5000).await.unwrap();
    let pdf_with_fonts = compiler_fonts.compile(&request, 5000).await.unwrap();

    println!("PDF without fonts: {} bytes", pdf_no_fonts.len());
    println!("PDF with fonts: {} bytes", pdf_with_fonts.len());
    println!("Difference: {} bytes", pdf_with_fonts.len() as i64 - pdf_no_fonts.len() as i64);

    // PDF with fonts should be significantly larger due to embedded font data
    assert!(
        pdf_with_fonts.len() > pdf_no_fonts.len(),
        "PDF with fonts should be larger than without"
    );
}

// =============================================================================
// Core functionality tests with fonts
// =============================================================================

#[tokio::test]
async fn test_hello_world_with_fonts() {
    let compiler = compiler_with_fonts();
    let request = simple_request("Hello, World!");

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok());

    let pdf = result.unwrap();
    assert!(pdf.starts_with(b"%PDF-"));
    assert!(pdf.len() > 1000, "PDF should contain embedded font data");
}

#[tokio::test]
async fn test_data_substitution_with_fonts() {
    let compiler = compiler_with_fonts();
    let request = request_with_data(
        "Hello, #sys.inputs.name! You have #sys.inputs.points points.",
        json!({
            "name": "Alice",
            "points": 42
        }),
    );

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok());

    let pdf = result.unwrap();
    assert!(pdf.starts_with(b"%PDF-"));
    assert!(pdf.len() > 1000);
}

#[tokio::test]
async fn test_multiline_content_with_fonts() {
    let compiler = compiler_with_fonts();
    let content = r#"
= Document Title

This is the first paragraph with some content.

This is the second paragraph.

== Section 1

More content here.

== Section 2

Even more content.
"#;
    let request = simple_request(content);

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok());

    let pdf = result.unwrap();
    assert!(pdf.starts_with(b"%PDF-"));
    // Multi-page or complex document should be larger
    println!("Multiline PDF size: {} bytes", pdf.len());
}

#[tokio::test]
async fn test_nested_data_with_fonts() {
    let compiler = compiler_with_fonts();
    let content = r#"
Customer: #sys.inputs.customer.name

Address: #sys.inputs.customer.address.street, #sys.inputs.customer.address.city
"#;
    let request = request_with_data(
        content,
        json!({
            "customer": {
                "name": "John Doe",
                "address": {
                    "street": "123 Main St",
                    "city": "Springfield"
                }
            }
        }),
    );

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_array_iteration_with_fonts() {
    let compiler = compiler_with_fonts();
    let content = r#"
Items:
#for item in sys.inputs.items [
  - #item.name: \$#item.price
]
"#;
    let request = request_with_data(
        content,
        json!({
            "items": [
                {"name": "Widget A", "price": 10},
                {"name": "Widget B", "price": 20},
                {"name": "Widget C", "price": 30}
            ]
        }),
    );

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_ok(), "Array iteration failed: {:?}", result.err());
}

// =============================================================================
// PDF validation tests
// =============================================================================

#[tokio::test]
async fn test_pdf_has_valid_structure() {
    let compiler = compiler_with_fonts();
    let request = simple_request("Test content");

    let pdf = compiler.compile(&request, 5000).await.unwrap();

    // Check PDF header
    assert!(pdf.starts_with(b"%PDF-1."));

    // Check PDF has trailer
    let pdf_str = String::from_utf8_lossy(&pdf);
    assert!(pdf_str.contains("%%EOF"), "PDF should end with EOF marker");

    // Check PDF has objects
    assert!(pdf_str.contains("obj"), "PDF should contain objects");
    assert!(pdf_str.contains("endobj"), "PDF should have complete objects");
}

#[tokio::test]
async fn test_pdf_contains_page() {
    let compiler = compiler_with_fonts();
    let request = simple_request("Page content");

    let pdf = compiler.compile(&request, 5000).await.unwrap();
    let pdf_str = String::from_utf8_lossy(&pdf);

    // PDF should contain page definition
    assert!(pdf_str.contains("/Type /Page"), "PDF should contain page type");
    assert!(pdf_str.contains("/MediaBox"), "PDF should have media box");
}

#[tokio::test]
async fn test_pdf_contains_content_stream() {
    let compiler = compiler_with_fonts();
    let request = simple_request("Stream content");

    let pdf = compiler.compile(&request, 5000).await.unwrap();
    let pdf_str = String::from_utf8_lossy(&pdf);

    // PDF should contain content stream
    assert!(pdf_str.contains("/Contents"), "PDF should have contents reference");
    assert!(pdf_str.contains("stream"), "PDF should have stream");
    assert!(pdf_str.contains("endstream"), "PDF should have endstream");
}

// =============================================================================
// Error handling tests (these don't need fonts since they fail before rendering)
// =============================================================================

#[tokio::test]
async fn test_syntax_error_returns_error() {
    let compiler = compiler_with_fonts();
    let request = simple_request("#[unclosed bracket");

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_err());

    let err = result.unwrap_err();
    let err_str = format!("{:?}", err);
    assert!(err_str.contains("CompilationFailed"));
}

#[tokio::test]
async fn test_missing_import_returns_error() {
    let compiler = compiler_with_fonts();
    let request = simple_request("#import \"nonexistent.typ\": *\n\nHello");

    let result = compiler.compile(&request, 5000).await;
    assert!(result.is_err());
}
