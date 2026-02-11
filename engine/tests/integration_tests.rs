//! Integration tests for docuforge-engine HTTP endpoints.
//!
//! Each test creates a real HTTP server and makes actual requests.
//! Tests use an empty font loader for simplicity since PDF generation
//! works fine with Typst's built-in font fallback.

use std::sync::Arc;

use axum_test::TestServer;
use docuforge_engine::cache::asset_cache::AssetCache;
use docuforge_engine::config::Config;
use docuforge_engine::engine::compiler::Compiler;
use docuforge_engine::engine::fonts::FontLoader;
use docuforge_engine::server::{create_router, AppState};
use serde_json::json;

/// Create a test server with empty fonts and default config.
fn setup_test_app() -> TestServer {
    let fonts = Arc::new(FontLoader::empty());
    let cache = AssetCache::new(10 * 1024 * 1024); // 10MB
    let compiler = Compiler::new(fonts.clone(), cache);
    let config = Config::from_env();
    let state = AppState::new(compiler, config, fonts.len());
    let router = create_router(state);
    TestServer::new(router).expect("Failed to create test server")
}

// =============================================================================
// Health endpoint tests
// =============================================================================

#[tokio::test]
async fn test_health_returns_200() {
    let server = setup_test_app();
    let response = server.get("/health").await;
    response.assert_status_ok();
}

#[tokio::test]
async fn test_health_json_structure() {
    let server = setup_test_app();
    let response = server.get("/health").await;

    let json: serde_json::Value = response.json();

    // All required fields must be present
    assert!(json.get("status").is_some(), "Missing 'status' field");
    assert!(json.get("version").is_some(), "Missing 'version' field");
    assert!(
        json.get("fonts_loaded").is_some(),
        "Missing 'fonts_loaded' field"
    );
    assert!(
        json.get("uptime_seconds").is_some(),
        "Missing 'uptime_seconds' field"
    );

    // Validate types
    assert_eq!(json["status"], "healthy");
    assert!(json["fonts_loaded"].is_number());
    assert!(json["uptime_seconds"].is_number());
}

// =============================================================================
// Simple render tests
// =============================================================================

#[tokio::test]
async fn test_render_hello_world() {
    let server = setup_test_app();

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
    assert!(!response.as_bytes().is_empty());
}

#[tokio::test]
async fn test_pdf_is_valid() {
    let server = setup_test_app();

    let response = server
        .post("/render")
        .json(&json!({
            "template": {
                "main": "main.typ",
                "files": {
                    "main.typ": "Hello"
                }
            }
        }))
        .await;

    response.assert_status_ok();

    let bytes = response.as_bytes();
    // PDF files always start with %PDF-
    assert!(
        bytes.starts_with(b"%PDF-"),
        "Response does not start with PDF magic bytes"
    );
}

#[tokio::test]
async fn test_content_type_header() {
    let server = setup_test_app();

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

// =============================================================================
// Render with data tests
// =============================================================================

#[tokio::test]
async fn test_render_with_simple_data() {
    let server = setup_test_app();

    let response = server
        .post("/render")
        .json(&json!({
            "template": {
                "main": "main.typ",
                "files": {
                    "main.typ": "Hello, #sys.inputs.name!"
                }
            },
            "data": {
                "name": "Test"
            }
        }))
        .await;

    response.assert_status_ok();
    assert!(response.as_bytes().starts_with(b"%PDF-"));
}

#[tokio::test]
async fn test_render_with_empty_data() {
    let server = setup_test_app();

    let response = server
        .post("/render")
        .json(&json!({
            "template": {
                "main": "main.typ",
                "files": {
                    "main.typ": "No data needed"
                }
            },
            "data": {}
        }))
        .await;

    response.assert_status_ok();
    assert!(response.as_bytes().starts_with(b"%PDF-"));
}

// =============================================================================
// Error handling tests
// =============================================================================

#[tokio::test]
async fn test_syntax_error_returns_400() {
    let server = setup_test_app();

    let response = server
        .post("/render")
        .json(&json!({
            "template": {
                "main": "main.typ",
                "files": {
                    "main.typ": "Hello #[unclosed"
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
async fn test_missing_main_file() {
    let server = setup_test_app();

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

    // Main file not in files map is an invalid request (422)
    response.assert_status_unprocessable_entity();

    let json: serde_json::Value = response.json();
    assert_eq!(json["error"], "invalid_request");
}

#[tokio::test]
async fn test_malformed_json() {
    let server = setup_test_app();

    let response = server
        .post("/render")
        .content_type("application/json")
        .bytes("{not valid json".as_bytes().to_vec().into())
        .await;

    // Axum returns 400 for JSON parse errors
    response.assert_status_bad_request();
}

// =============================================================================
// Comprehensive data substitution tests
// =============================================================================

#[tokio::test]
async fn test_render_with_nested_data() {
    let server = setup_test_app();

    let response = server
        .post("/render")
        .json(&json!({
            "template": {
                "main": "main.typ",
                "files": {
                    "main.typ": "#let d = sys.inputs\n= #d.customer.name\nAddress: #d.customer.address"
                }
            },
            "data": {
                "customer": {
                    "name": "John Doe",
                    "address": "123 Main St"
                }
            }
        }))
        .await;

    response.assert_status_ok();
    let bytes = response.as_bytes();
    assert!(bytes.starts_with(b"%PDF-"));
    // Should produce a reasonable PDF (more than just headers)
    assert!(bytes.len() > 1000, "PDF seems too small: {} bytes", bytes.len());
}

#[tokio::test]
async fn test_render_with_array_data() {
    let server = setup_test_app();

    let response = server
        .post("/render")
        .json(&json!({
            "template": {
                "main": "main.typ",
                "files": {
                    "main.typ": "#let items = sys.inputs.items\n#for item in items [\n  - #item\n]"
                }
            },
            "data": {
                "items": ["Apple", "Banana", "Cherry"]
            }
        }))
        .await;

    response.assert_status_ok();
    assert!(response.as_bytes().starts_with(b"%PDF-"));
}

#[tokio::test]
async fn test_render_multifile() {
    let server = setup_test_app();

    let response = server
        .post("/render")
        .json(&json!({
            "template": {
                "main": "main.typ",
                "files": {
                    "main.typ": "#import \"utils.typ\": greet\n#greet(\"World\")",
                    "utils.typ": "#let greet(name) = [Hello, #name!]"
                }
            }
        }))
        .await;

    response.assert_status_ok();
    assert!(response.as_bytes().starts_with(b"%PDF-"));
}

#[tokio::test]
async fn test_render_formatted_document() {
    let server = setup_test_app();

    let response = server
        .post("/render")
        .json(&json!({
            "template": {
                "main": "main.typ",
                "files": {
                    "main.typ": "= Document Title\n\n== Section 1\n\nThis is *bold* and _italic_ text.\n\n- Item 1\n- Item 2\n\n#table(\n  columns: 2,\n  [A], [B],\n  [1], [2]\n)"
                }
            }
        }))
        .await;

    response.assert_status_ok();
    let bytes = response.as_bytes();
    assert!(bytes.starts_with(b"%PDF-"));
    // A formatted document with table should be substantial
    assert!(bytes.len() > 2000, "PDF seems too small for formatted document");
}
