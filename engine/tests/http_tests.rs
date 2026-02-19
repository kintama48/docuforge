//! HTTP endpoint integration tests with actual fonts.
//!
//! These tests start a real HTTP server with fonts loaded and make actual requests.
//! They verify that the full rendering pipeline produces PDFs with visible content.

use std::path::Path;
use std::sync::Arc;

use axum_test::TestServer;
use docuforge_engine::cache::asset_cache::AssetCache;
use docuforge_engine::config::Config;
use docuforge_engine::engine::compiler::Compiler;
use docuforge_engine::engine::fonts::FontLoader;
use docuforge_engine::server::{create_router, AppState};
use serde_json::json;

// =============================================================================
// Test setup
// =============================================================================

fn fonts_dir() -> &'static Path {
    Path::new(concat!(env!("CARGO_MANIFEST_DIR"), "/assets/fonts"))
}

/// Create a test server with actual fonts loaded.
/// This is the key difference from the existing tests that use empty fonts.
fn setup_test_app_with_fonts() -> TestServer {
    let fonts = FontLoader::load_from_directory(fonts_dir())
        .expect("Failed to load fonts - ensure assets/fonts has font files");
    let font_count = fonts.len();
    println!("Test server loaded {} fonts", font_count);

    let fonts = Arc::new(fonts);
    let cache = AssetCache::new(10 * 1024 * 1024);
    let compiler = Compiler::new(fonts.clone(), cache);
    let config = Config::from_env();
    let state = AppState::new(compiler, config, font_count);
    let router = create_router(state);
    TestServer::new(router).expect("Failed to create test server")
}

/// Validate that a PDF response is well-formed and contains font data
fn validate_pdf_response(pdf: &[u8]) {
    assert!(
        pdf.starts_with(b"%PDF-"),
        "Response should start with PDF magic bytes"
    );

    assert!(
        pdf.len() > 1000,
        "PDF with fonts should be larger than 1000 bytes, got {}",
        pdf.len()
    );

    let pdf_str = String::from_utf8_lossy(pdf);
    assert!(
        pdf_str.contains("/Font"),
        "PDF should contain font references"
    );
    assert!(
        pdf_str.contains("/Type /Page"),
        "PDF should contain page definition"
    );
}

// =============================================================================
// Basic render tests with fonts
// =============================================================================

#[tokio::test]
async fn test_render_hello_world_with_fonts() {
    let server = setup_test_app_with_fonts();

    let response = server
        .post("/render")
        .json(&json!({
            "template": {
                "main": "main.typ",
                "files": {
                    "main.typ": "Hello, World!"
                }
            }
        }))
        .await;

    response.assert_status_ok();

    let pdf = response.as_bytes();
    validate_pdf_response(pdf);

    println!("Hello World PDF size: {} bytes", pdf.len());
}

#[tokio::test]
async fn test_render_with_data_produces_content() {
    let server = setup_test_app_with_fonts();

    let response = server
        .post("/render")
        .json(&json!({
            "template": {
                "main": "main.typ",
                "files": {
                    "main.typ": "Hello, #sys.inputs.name! You have #sys.inputs.points points."
                }
            },
            "data": {
                "name": "Alice",
                "points": 42
            }
        }))
        .await;

    response.assert_status_ok();

    let pdf = response.as_bytes();
    validate_pdf_response(pdf);

    println!("Data substitution PDF size: {} bytes", pdf.len());
}

#[tokio::test]
async fn test_render_multifile_with_fonts() {
    let server = setup_test_app_with_fonts();

    let response = server
        .post("/render")
        .json(&json!({
            "template": {
                "main": "main.typ",
                "files": {
                    "main.typ": "#import \"utils.typ\": greeting\n\n#greeting(\"World\")",
                    "utils.typ": "#let greeting(name) = [Hello, #name! Welcome to DocuForge.]"
                }
            }
        }))
        .await;

    response.assert_status_ok();

    let pdf = response.as_bytes();
    validate_pdf_response(pdf);
}

// =============================================================================
// Complex template tests
// =============================================================================

#[tokio::test]
async fn test_render_invoice_via_http() {
    let server = setup_test_app_with_fonts();

    let response = server
        .post("/render")
        .json(&json!({
            "template": {
                "main": "main.typ",
                "files": {
                    "main.typ": r#"
#set page(paper: "a4", margin: 2cm)
#set text(size: 11pt)

#align(center)[
  = Invoice \##sys.inputs.invoice_id
]

#v(1em)

*Customer:* #sys.inputs.customer

#v(1em)

#table(
  columns: (1fr, auto),
  stroke: none,
  [*Item*], [*Price*],
  ..sys.inputs.items.map(item => (item.name, [\$#item.price])).flatten()
)

#line(length: 100%)

#align(right)[
  *Total: \$#sys.inputs.total*
]
"#
                }
            },
            "data": {
                "invoice_id": "INV-001",
                "customer": "Acme Corp",
                "items": [
                    {"name": "Widget A", "price": 29.99},
                    {"name": "Widget B", "price": 49.99}
                ],
                "total": 79.98
            }
        }))
        .await;

    response.assert_status_ok();

    let pdf = response.as_bytes();
    validate_pdf_response(pdf);

    println!("Invoice PDF size: {} bytes", pdf.len());
}

#[tokio::test]
async fn test_render_multipage_document() {
    let server = setup_test_app_with_fonts();

    let response = server
        .post("/render")
        .json(&json!({
            "template": {
                "main": "main.typ",
                "files": {
                    "main.typ": r#"
#set page(paper: "a4", numbering: "1")

= Page 1

This is the first page of the document.

#pagebreak()

= Page 2

This is the second page.

#pagebreak()

= Page 3

This is the third page.
"#
                }
            }
        }))
        .await;

    response.assert_status_ok();

    let pdf = response.as_bytes();
    validate_pdf_response(pdf);

    // Check for multiple pages
    let pdf_str = String::from_utf8_lossy(pdf);
    let page_count = pdf_str.matches("/Type /Page").count();
    assert!(
        page_count >= 3,
        "Should have at least 3 pages, got {}",
        page_count
    );

    println!("Multipage PDF: {} bytes, {} pages", pdf.len(), page_count);
}

// =============================================================================
// Font-specific tests
// =============================================================================

#[tokio::test]
async fn test_render_with_specific_font() {
    let server = setup_test_app_with_fonts();

    let response = server
        .post("/render")
        .json(&json!({
            "template": {
                "main": "main.typ",
                "files": {
                    "main.typ": r#"
#set text(font: "Roboto")

This document uses the Roboto font family.

*Bold text* and _italic text_ are supported.
"#
                }
            }
        }))
        .await;

    response.assert_status_ok();

    let pdf = response.as_bytes();
    validate_pdf_response(pdf);
}

#[tokio::test]
async fn test_render_with_code_block() {
    let server = setup_test_app_with_fonts();

    let response = server
        .post("/render")
        .json(&json!({
            "template": {
                "main": "main.typ",
                "files": {
                    "main.typ": r#"
= Code Example

Here is some inline `code` and a code block:

```rust
fn main() {
    println!("Hello, World!");
}
```
"#
                }
            }
        }))
        .await;

    response.assert_status_ok();

    let pdf = response.as_bytes();
    validate_pdf_response(pdf);
}

// =============================================================================
// Error handling tests
// =============================================================================

#[tokio::test]
async fn test_compilation_error_returns_400() {
    let server = setup_test_app_with_fonts();

    let response = server
        .post("/render")
        .json(&json!({
            "template": {
                "main": "main.typ",
                "files": {
                    "main.typ": "Hello #[unclosed bracket"
                }
            }
        }))
        .await;

    response.assert_status_bad_request();

    let json: serde_json::Value = response.json();
    assert_eq!(json["error"], "compilation_failed");
    assert!(json.get("message").is_some());
}

#[tokio::test]
async fn test_missing_main_file_returns_422() {
    let server = setup_test_app_with_fonts();

    let response = server
        .post("/render")
        .json(&json!({
            "template": {
                "main": "nonexistent.typ",
                "files": {
                    "other.typ": "Hello"
                }
            }
        }))
        .await;

    response.assert_status_unprocessable_entity();

    let json: serde_json::Value = response.json();
    assert_eq!(json["error"], "invalid_request");
}

// =============================================================================
// Content-Type and header tests
// =============================================================================

#[tokio::test]
async fn test_content_type_is_pdf() {
    let server = setup_test_app_with_fonts();

    let response = server
        .post("/render")
        .json(&json!({
            "template": {
                "main": "main.typ",
                "files": {
                    "main.typ": "Test"
                }
            }
        }))
        .await;

    response.assert_status_ok();

    let content_type = response
        .headers()
        .get("content-type")
        .expect("Missing Content-Type header")
        .to_str()
        .expect("Invalid Content-Type header");

    assert_eq!(content_type, "application/pdf");
}

#[tokio::test]
async fn test_content_disposition_header() {
    let server = setup_test_app_with_fonts();

    let response = server
        .post("/render")
        .json(&json!({
            "template": {
                "main": "main.typ",
                "files": {
                    "main.typ": "Test"
                }
            }
        }))
        .await;

    response.assert_status_ok();

    let disposition = response
        .headers()
        .get("content-disposition")
        .expect("Missing Content-Disposition header")
        .to_str()
        .expect("Invalid Content-Disposition header");

    assert!(disposition.contains("inline"));
    assert!(disposition.contains("filename="));
}

// =============================================================================
// Health check with fonts
// =============================================================================

#[tokio::test]
async fn test_health_shows_fonts_loaded() {
    let server = setup_test_app_with_fonts();

    let response = server.get("/health").await;
    response.assert_status_ok();

    let json: serde_json::Value = response.json();

    let fonts_loaded = json["fonts_loaded"].as_u64().unwrap();
    assert!(fonts_loaded > 0, "Should report fonts loaded");

    println!("Health check reports {} fonts loaded", fonts_loaded);
}
