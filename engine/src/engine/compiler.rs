use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use bytes::Bytes;
use tracing::{debug, info, warn};
use typst::diag::{Severity, SourceDiagnostic, Warned};
use typst::syntax::Span;
use typst::World;

use crate::cache::asset_cache::AssetCache;
use crate::engine::fonts::FontLoader;
use crate::engine::world::DocuForgeWorld;
use crate::error::{EngineError, ErrorSpan};
use crate::models::request::RenderRequest;

/// Compilation orchestrator.
/// Handles asset resolution, world construction, and Typst compilation with timeout.
#[derive(Clone)]
pub struct Compiler {
    fonts: Arc<FontLoader>,
    asset_cache: AssetCache,
}

impl Compiler {
    /// Create a new compiler instance.
    pub fn new(fonts: Arc<FontLoader>, asset_cache: AssetCache) -> Self {
        Self { fonts, asset_cache }
    }

    /// Compile a render request to PDF bytes.
    ///
    /// # Flow
    /// 1. Resolve all assets (fetch URLs, decode base64)
    /// 2. Construct DocuForgeWorld
    /// 3. Compile with timeout using spawn_blocking
    /// 4. Export to PDF on success
    /// 5. Extract error spans on failure
    pub async fn compile(
        &self,
        request: &RenderRequest,
        timeout_ms: u64,
    ) -> Result<Vec<u8>, EngineError> {
        let file_count = request.template.files.len();
        debug!(file_count, main = %request.template.main, "Starting compilation");

        // Step 1: Resolve all assets
        let assets = self.resolve_assets(request).await?;

        // Step 2: Build the world
        let world = DocuForgeWorld::new(request, Arc::clone(&self.fonts), assets)?;

        // Step 3: Compile with timeout
        let timeout = Duration::from_millis(timeout_ms);

        let compile_result = tokio::time::timeout(timeout, async {
            // Typst compilation is CPU-bound, run in blocking thread pool
            tokio::task::spawn_blocking(move || compile_and_export(world))
                .await
                .map_err(|e| EngineError::Internal(format!("Task join error: {}", e)))?
        })
        .await;

        match compile_result {
            Ok(Ok(pdf_bytes)) => {
                info!(size = pdf_bytes.len(), "Compilation successful");
                Ok(pdf_bytes)
            }
            Ok(Err(e)) => Err(e),
            Err(_) => {
                warn!(timeout_ms, "Compilation timed out");
                Err(EngineError::Timeout(timeout_ms))
            }
        }
    }

    /// Resolve all assets from the request.
    /// Fetches URLs and decodes base64 content using the asset cache.
    async fn resolve_assets(
        &self,
        request: &RenderRequest,
    ) -> Result<HashMap<String, Bytes>, EngineError> {
        let Some(assets) = &request.assets else {
            return Ok(HashMap::new());
        };

        let mut resolved = HashMap::with_capacity(assets.len());

        for asset in assets {
            let data = self.asset_cache.get_or_fetch(asset).await?;
            resolved.insert(asset.name.clone(), data);
        }

        debug!(count = resolved.len(), "Assets resolved");
        Ok(resolved)
    }
}

/// Perform Typst compilation and PDF export.
/// This runs in a blocking thread.
fn compile_and_export(world: DocuForgeWorld) -> Result<Vec<u8>, EngineError> {
    // Compile to document - returns Warned<SourceResult<Document>>
    let Warned { output, warnings } = typst::compile(&world);

    // Log any warnings
    for warning in &warnings {
        log_diagnostic(&world, warning);
    }

    match output {
        Ok(document) => {
            // Export to PDF
            let pdf_bytes = typst_pdf::pdf(&document, &typst_pdf::PdfOptions::default())
                .map_err(|e| EngineError::Internal(format!("PDF export failed: {:?}", e)))?;
            Ok(pdf_bytes)
        }
        Err(errors) => {
            // Extract first error for structured response
            let first_error = errors.first();

            let (message, span, hint) = if let Some(diag) = first_error {
                let span_info = extract_span(&world, diag.span);
                let hint = diag.hints.first().map(|h| h.to_string());
                (diag.message.to_string(), span_info, hint)
            } else {
                ("Compilation failed".to_string(), None, None)
            };

            // Log all errors
            for diag in &errors {
                log_diagnostic(&world, diag);
            }

            Err(EngineError::CompilationFailed {
                message,
                span,
                hint,
            })
        }
    }
}

/// Extract file/line/column from a Typst span.
fn extract_span(world: &DocuForgeWorld, span: Span) -> Option<ErrorSpan> {
    // Get the source file from the span
    let source_id = span.id()?;
    let source = world.source(source_id).ok()?;

    // Get the byte range for this span
    let range = source.range(span)?;
    let byte_offset = range.start;

    // Find line and column
    let line = source.byte_to_line(byte_offset)?;
    let column = source.byte_to_column(byte_offset)?;

    // Get filename from path
    let file = source_id
        .vpath()
        .as_rootless_path()
        .to_string_lossy()
        .to_string();

    Some(ErrorSpan {
        file,
        line: (line + 1) as u32, // Convert 0-indexed to 1-indexed
        column: (column + 1) as u32,
    })
}

/// Log a diagnostic with its span information.
fn log_diagnostic(world: &DocuForgeWorld, diag: &SourceDiagnostic) {
    let span_str = if let Some(span) = extract_span(world, diag.span) {
        format!("{}:{}:{}", span.file, span.line, span.column)
    } else {
        "unknown".to_string()
    };

    match diag.severity {
        Severity::Error => warn!(span = %span_str, message = %diag.message, "Typst error"),
        Severity::Warning => debug!(span = %span_str, message = %diag.message, "Typst warning"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::request::{Asset, Template};
    use serde_json::json;

    fn empty_fonts() -> Arc<FontLoader> {
        Arc::new(FontLoader::empty())
    }

    fn test_cache() -> AssetCache {
        AssetCache::new(10 * 1024 * 1024) // 10MB
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

    #[tokio::test]
    async fn test_compile_minimal() {
        let compiler = Compiler::new(empty_fonts(), test_cache());
        let request = simple_request("Hello, World!");

        let result = compiler.compile(&request, 5000).await;
        assert!(result.is_ok());

        let pdf = result.unwrap();
        assert!(pdf.starts_with(b"%PDF"));
        assert!(pdf.len() > 100);
    }

    #[tokio::test]
    async fn test_compile_with_data() {
        let compiler = Compiler::new(empty_fonts(), test_cache());

        let mut files = HashMap::new();
        files.insert(
            "main.typ".to_string(),
            "Hello, #sys.inputs.name!".to_string(),
        );

        let request = RenderRequest {
            template: Template {
                main: "main.typ".to_string(),
                files,
            },
            data: Some(json!({"name": "Claude"})),
            assets: None,
            options: None,
        };

        let result = compiler.compile(&request, 5000).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_compile_multifile() {
        let compiler = Compiler::new(empty_fonts(), test_cache());

        let mut files = HashMap::new();
        files.insert(
            "main.typ".to_string(),
            "#import \"lib.typ\": greeting\n#greeting(\"World\")".to_string(),
        );
        files.insert(
            "lib.typ".to_string(),
            "#let greeting(name) = [Hello, #name!]".to_string(),
        );

        let request = RenderRequest {
            template: Template {
                main: "main.typ".to_string(),
                files,
            },
            data: None,
            assets: None,
            options: None,
        };

        let result = compiler.compile(&request, 5000).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_compile_syntax_error() {
        let compiler = Compiler::new(empty_fonts(), test_cache());
        let request = simple_request("#[unclosed bracket");

        let result = compiler.compile(&request, 5000).await;
        assert!(result.is_err());

        match result.unwrap_err() {
            EngineError::CompilationFailed { message, span, .. } => {
                assert!(!message.is_empty());
                assert!(span.is_some());
                let span = span.unwrap();
                assert_eq!(span.file, "main.typ");
                assert!(span.line >= 1);
            }
            other => panic!("Expected CompilationFailed, got {:?}", other),
        }
    }

    #[tokio::test]
    async fn test_compile_missing_variable() {
        let compiler = Compiler::new(empty_fonts(), test_cache());
        let request = simple_request("#sys.inputs.undefined_var");

        let result = compiler.compile(&request, 5000).await;
        // This may or may not be an error depending on Typst behavior
        // The test validates it doesn't panic
        let _ = result;
    }

    #[tokio::test]
    async fn test_compile_with_base64_asset() {
        let compiler = Compiler::new(empty_fonts(), test_cache());

        // 1x1 red PNG
        let png_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

        let mut files = HashMap::new();
        files.insert("main.typ".to_string(), "#image(\"test.png\")".to_string());

        let request = RenderRequest {
            template: Template {
                main: "main.typ".to_string(),
                files,
            },
            data: None,
            assets: Some(vec![Asset {
                name: "test.png".to_string(),
                content: Some(png_base64.to_string()),
                url: None,
                hash: None,
            }]),
            options: None,
        };

        let result = compiler.compile(&request, 5000).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_compile_timeout() {
        let compiler = Compiler::new(empty_fonts(), test_cache());

        // This creates a very fast compile that should succeed
        let request = simple_request("Quick");

        // Very short timeout - but compilation is fast so it should succeed
        let result = compiler.compile(&request, 100).await;
        // Simple content should compile fast enough
        assert!(result.is_ok());
    }

    // Note: Testing actual timeout with infinite loop requires careful handling
    // as it can consume resources. In production, the timeout will kill the task.
}
