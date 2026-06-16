use std::collections::BTreeMap;
use std::collections::BTreeSet;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use base64::Engine as _;
use bytes::Bytes;
use image::codecs::jpeg::JpegEncoder;
use image::ExtendedColorType;
use lopdf::encryption::crypt_filters::{Aes256CryptFilter, CryptFilter};
use lopdf::{Document as PdfDocument, EncryptionState, EncryptionVersion, Permissions};
use rand::RngCore;
use tracing::{debug, info, warn};
use typst::diag::{Severity, SourceDiagnostic, Warned};
use typst::model::Document;
use typst::syntax::Span;
use typst::World;
use zeroize::Zeroize;

use crate::cache::asset_cache::AssetCache;
use crate::cache::template_cache::TemplateCache;
use crate::cache::template_cache_l2::TemplateCacheL2;
use crate::engine::fonts::FontLoader;
use crate::engine::world::DocuForgeWorld;
use crate::error::EngineError;
use crate::models::request::{
    EncryptionMode, EncryptionOptions, EncryptionPermissions, RenderImageFormat, RenderOutput,
    RenderRequest, TemplateCacheOptions,
};
use crate::models::response::{ErrorSpan, ImagePage, ImageRenderResponse};

const DEFAULT_IMAGE_DPI: u32 = 144;
const MIN_IMAGE_DPI: u32 = 72;
const MAX_IMAGE_DPI: u32 = 300;
const DEFAULT_IMAGE_QUALITY: u8 = 90;

/// Compiled render output.
#[derive(Debug)]
pub enum CompiledRender {
    Pdf(Vec<u8>),
    Images(ImageRenderResponse),
}

#[derive(Clone)]
struct ExportOptions {
    output: RenderOutput,
    image_format: RenderImageFormat,
    image_dpi: u32,
    image_quality: u8,
    image_pages: Option<Vec<usize>>,
    encryption: Option<EncryptionOptions>,
}

/// Compilation orchestrator.
/// Handles asset resolution, world construction, and Typst compilation with timeout.
#[derive(Clone)]
pub struct Compiler {
    fonts: Arc<FontLoader>,
    asset_cache: AssetCache,
    template_cache: TemplateCache,
    template_cache_l2: Option<TemplateCacheL2>,
}

impl Compiler {
    /// Create a new compiler instance.
    pub fn new(fonts: Arc<FontLoader>, asset_cache: AssetCache) -> Self {
        Self {
            fonts,
            asset_cache,
            template_cache: TemplateCache::new(1_000),
            template_cache_l2: None,
        }
    }

    /// Override template cache capacity.
    pub fn with_template_cache_entries(mut self, max_entries: u64) -> Self {
        self.template_cache = TemplateCache::new(max_entries.max(1));
        self
    }

    /// Configure Redis-backed L2 template cache.
    pub fn with_template_cache_l2(mut self, cache: Option<TemplateCacheL2>) -> Self {
        self.template_cache_l2 = cache;
        self
    }

    /// Compile a render request to PDF bytes.
    pub async fn compile(
        &self,
        request: &RenderRequest,
        timeout_ms: u64,
    ) -> Result<Vec<u8>, EngineError> {
        match self.compile_render(request, timeout_ms).await? {
            CompiledRender::Pdf(pdf_bytes) => Ok(pdf_bytes),
            CompiledRender::Images(_) => Err(EngineError::InvalidRequest(
                "Compiler::compile returns PDF bytes; use compile_render for image output"
                    .to_string(),
            )),
        }
    }

    /// Compile a render request to PDF bytes or page images.
    ///
    /// # Flow
    /// 1. Resolve all assets (fetch URLs, decode base64)
    /// 2. Construct DocuForgeWorld
    /// 3. Compile with timeout using spawn_blocking
    /// 4. Export to PDF on success
    /// 5. Extract error spans on failure
    pub async fn compile_render(
        &self,
        request: &RenderRequest,
        timeout_ms: u64,
    ) -> Result<CompiledRender, EngineError> {
        let file_count = request.template.files.len();
        debug!(file_count, main = %request.template.main, "Starting compilation");

        // Step 1: Resolve all assets
        let assets = self.resolve_assets(request).await?;

        // Step 2: Resolve (or memoize) template bundle and build world
        let cache_hints = request
            .options
            .as_ref()
            .and_then(|opts| opts.cache.as_ref());
        let (cached_template, l1_hit, l2_hit) = self.resolve_template(request, cache_hints).await;
        debug!(
            l1_hit,
            l2_hit,
            cacheable = cache_hints.map(|h| h.cacheable).unwrap_or(false),
            "Template cache lookup completed"
        );
        let world = DocuForgeWorld::new_from_parts(
            cached_template.main.as_ref(),
            cached_template.files.as_ref(),
            request.data.as_ref(),
            Arc::clone(&self.fonts),
            assets,
        )?;
        let export_options = ExportOptions::from_request(request)?;

        // Step 3: Compile with timeout
        let timeout = Duration::from_millis(timeout_ms);

        let compile_result = tokio::time::timeout(timeout, async {
            // Typst compilation is CPU-bound, run in blocking thread pool
            tokio::task::spawn_blocking(move || compile_and_export(world, export_options))
                .await
                .map_err(|e| EngineError::Internal(format!("Task join error: {}", e)))?
        })
        .await;

        match compile_result {
            Ok(Ok(output)) => {
                match &output {
                    CompiledRender::Pdf(pdf_bytes) => {
                        info!(
                            size = pdf_bytes.len(),
                            output = "pdf",
                            "Compilation successful"
                        );
                    }
                    CompiledRender::Images(images) => {
                        info!(
                            pages = images.pages.len(),
                            output = "images",
                            "Compilation successful"
                        );
                    }
                }
                Ok(output)
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

    async fn resolve_template(
        &self,
        request: &RenderRequest,
        cache_hints: Option<&TemplateCacheOptions>,
    ) -> (
        Arc<crate::cache::template_cache::CachedTemplate>,
        bool,
        bool,
    ) {
        let cacheable = cache_hints.map(|h| h.cacheable).unwrap_or(false);
        let template_fingerprint = cache_hints.and_then(|h| h.template_fingerprint.as_deref());

        if cacheable {
            if let (Some(l2), Some(fingerprint)) = (&self.template_cache_l2, template_fingerprint) {
                match l2.get(fingerprint).await {
                    Ok(Some(cached_from_l2)) => {
                        self.template_cache
                            .insert_precomputed(Arc::clone(&cached_from_l2));
                        return (cached_from_l2, false, true);
                    }
                    Ok(None) => {
                        let (cached, l1_hit) = self
                            .template_cache
                            .get_or_insert_with_state(&request.template);
                        if !l1_hit {
                            if let Err(err) = l2.set(fingerprint, cached.as_ref()).await {
                                warn!(%err, "Failed to write template to Redis L2 cache");
                            }
                        }
                        return (cached, l1_hit, false);
                    }
                    Err(err) => {
                        warn!(%err, "Failed to read template from Redis L2 cache");
                    }
                }
            }
        }

        let (cached, l1_hit) = self
            .template_cache
            .get_or_insert_with_state(&request.template);
        (cached, l1_hit, false)
    }
}

impl ExportOptions {
    fn from_request(request: &RenderRequest) -> Result<Self, EngineError> {
        let options = request.options.as_ref();
        let output = options
            .and_then(|options| options.output)
            .unwrap_or(RenderOutput::Pdf);
        let image_format = options
            .and_then(|options| options.image_format)
            .unwrap_or(RenderImageFormat::Png);
        let image_dpi = options
            .and_then(|options| options.image_dpi)
            .unwrap_or(DEFAULT_IMAGE_DPI);
        let image_quality = options
            .and_then(|options| options.image_quality)
            .unwrap_or(DEFAULT_IMAGE_QUALITY);
        let image_pages = options.and_then(|options| options.image_pages.clone());
        let encryption = options.and_then(|options| options.encryption.clone());

        if !(MIN_IMAGE_DPI..=MAX_IMAGE_DPI).contains(&image_dpi) {
            return Err(EngineError::InvalidRequest(format!(
                "image_dpi must be between {MIN_IMAGE_DPI} and {MAX_IMAGE_DPI}"
            )));
        }

        if !(1..=100).contains(&image_quality) {
            return Err(EngineError::InvalidRequest(
                "image_quality must be between 1 and 100".to_string(),
            ));
        }

        if output == RenderOutput::Images && encryption.is_some() {
            return Err(EngineError::InvalidRequest(
                "PDF encryption is not supported for image output".to_string(),
            ));
        }

        if let Some(pages) = &image_pages {
            if pages.is_empty() {
                return Err(EngineError::InvalidRequest(
                    "image_pages must contain at least one page".to_string(),
                ));
            }
            if pages.iter().any(|page| *page == 0) {
                return Err(EngineError::InvalidRequest(
                    "image_pages must use one-based page numbers".to_string(),
                ));
            }
        }

        Ok(Self {
            output,
            image_format,
            image_dpi,
            image_quality,
            image_pages,
            encryption,
        })
    }
}

/// Perform Typst compilation and PDF export.
/// This runs in a blocking thread.
fn compile_and_export(
    world: DocuForgeWorld,
    options: ExportOptions,
) -> Result<CompiledRender, EngineError> {
    // Compile to document - returns Warned<SourceResult<Document>>
    let Warned { output, warnings } = typst::compile(&world);

    // Log any warnings
    for warning in &warnings {
        log_diagnostic(&world, warning);
    }

    match output {
        Ok(document) => {
            if options.output == RenderOutput::Images {
                let images = export_images(&document, &options)?;
                return Ok(CompiledRender::Images(images));
            }

            let pdf = export_pdf(&document, options.encryption)?;
            Ok(CompiledRender::Pdf(pdf))
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

fn export_pdf(
    document: &Document,
    encryption: Option<EncryptionOptions>,
) -> Result<Vec<u8>, EngineError> {
    let mut pdf_bytes = typst_pdf::pdf(document, &typst_pdf::PdfOptions::default())
        .map_err(|e| EngineError::Internal(format!("PDF export failed: {:?}", e)))?;

    if let Some(mut encryption_options) = encryption {
        let encrypted_pdf = encrypt_pdf_in_memory(&mut pdf_bytes, &mut encryption_options)?;
        pdf_bytes.zeroize();
        encryption_options.user_password.zeroize();
        return Ok(encrypted_pdf);
    }

    Ok(pdf_bytes)
}

fn export_images(
    document: &Document,
    options: &ExportOptions,
) -> Result<ImageRenderResponse, EngineError> {
    let page_count = document.pages.len();
    if page_count == 0 {
        return Err(EngineError::InvalidRequest(
            "Cannot render images for a document with no pages".to_string(),
        ));
    }

    let selected_pages = selected_image_pages(options.image_pages.as_deref(), page_count)?;
    let scale = options.image_dpi as f32 / 72.0;
    let format_label = match options.image_format {
        RenderImageFormat::Png => "png",
        RenderImageFormat::Jpg => "jpg",
    };

    let mut pages = Vec::with_capacity(selected_pages.len());
    for index in selected_pages {
        let zero_based = index - 1;
        let page = document.pages.get(zero_based).ok_or_else(|| {
            EngineError::InvalidRequest(format!("image_pages must be between 1 and {page_count}"))
        })?;
        let pixmap = typst_render::render(page, scale);
        let image_bytes = match options.image_format {
            RenderImageFormat::Png => pixmap
                .encode_png()
                .map_err(|e| EngineError::Internal(format!("PNG export failed: {e}")))?,
            RenderImageFormat::Jpg => encode_jpeg(
                pixmap.data(),
                pixmap.width(),
                pixmap.height(),
                options.image_quality,
            )?,
        };

        pages.push(ImagePage {
            index,
            data: base64::engine::general_purpose::STANDARD.encode(image_bytes),
        });
    }

    Ok(ImageRenderResponse {
        pages,
        format: format_label.to_string(),
    })
}

fn selected_image_pages(
    requested_pages: Option<&[usize]>,
    page_count: usize,
) -> Result<Vec<usize>, EngineError> {
    let Some(requested_pages) = requested_pages else {
        return Ok((1..=page_count).collect());
    };

    let mut selected = BTreeSet::new();
    for page in requested_pages {
        if *page == 0 || *page > page_count {
            return Err(EngineError::InvalidRequest(format!(
                "image_pages must be between 1 and {page_count}"
            )));
        }
        selected.insert(*page);
    }

    if selected.is_empty() {
        return Err(EngineError::InvalidRequest(
            "image_pages must contain at least one page".to_string(),
        ));
    }

    Ok(selected.into_iter().collect())
}

fn encode_jpeg(
    premultiplied_rgba: &[u8],
    width: u32,
    height: u32,
    quality: u8,
) -> Result<Vec<u8>, EngineError> {
    let expected_len = width as usize * height as usize * 4;
    if premultiplied_rgba.len() != expected_len {
        return Err(EngineError::Internal(
            "Unexpected raster buffer length".to_string(),
        ));
    }

    let mut rgb = Vec::with_capacity(width as usize * height as usize * 3);
    for pixel in premultiplied_rgba.chunks_exact(4) {
        let alpha = u16::from(pixel[3]);
        let white = 255 - alpha;
        rgb.push((u16::from(pixel[0]) + white).min(255) as u8);
        rgb.push((u16::from(pixel[1]) + white).min(255) as u8);
        rgb.push((u16::from(pixel[2]) + white).min(255) as u8);
    }

    let mut out = Vec::new();
    let mut encoder = JpegEncoder::new_with_quality(&mut out, quality);
    encoder
        .encode(&rgb, width, height, ExtendedColorType::Rgb8)
        .map_err(|e| EngineError::Internal(format!("JPEG export failed: {e}")))?;
    Ok(out)
}

fn encrypt_pdf_in_memory(
    plaintext_pdf: &mut [u8],
    encryption: &mut EncryptionOptions,
) -> Result<Vec<u8>, EngineError> {
    if plaintext_pdf.is_empty() {
        return Err(EngineError::EncryptionFailed(
            "Cannot encrypt an empty PDF buffer".to_string(),
        ));
    }

    if encryption.user_password.len() < 8 || encryption.user_password.len() > 128 {
        return Err(EngineError::InvalidRequest(
            "Encryption password must be between 8 and 128 characters".to_string(),
        ));
    }

    if !matches!(encryption.mode, EncryptionMode::Aes256) {
        return Err(EngineError::InvalidRequest(
            "Only aes256 encryption mode is supported".to_string(),
        ));
    }

    let permissions = match encryption.permissions {
        EncryptionPermissions::PrintOnly => Permissions::PRINTABLE,
    };

    let mut document = PdfDocument::load_mem(plaintext_pdf)
        .map_err(|e| EngineError::EncryptionFailed(format!("Failed to load generated PDF: {e}")))?;

    let mut owner_password_bytes = [0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut owner_password_bytes);
    let mut owner_password = base64::engine::general_purpose::STANDARD.encode(owner_password_bytes);
    owner_password_bytes.zeroize();

    let mut file_encryption_key = [0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut file_encryption_key);

    let crypt_filter: Arc<dyn CryptFilter> = Arc::new(Aes256CryptFilter);
    let encryption_version = EncryptionVersion::V5 {
        encrypt_metadata: true,
        crypt_filters: BTreeMap::from([(b"StdCF".to_vec(), crypt_filter)]),
        file_encryption_key: &file_encryption_key,
        stream_filter: b"StdCF".to_vec(),
        string_filter: b"StdCF".to_vec(),
        owner_password: owner_password.as_str(),
        user_password: encryption.user_password.as_str(),
        permissions,
    };

    let encryption_state = EncryptionState::try_from(encryption_version).map_err(|e| {
        EngineError::EncryptionFailed(format!("Failed to build encryption state: {e}"))
    })?;

    document
        .encrypt(&encryption_state)
        .map_err(|e| EngineError::EncryptionFailed(format!("Failed to encrypt PDF: {e}")))?;

    let mut encrypted_pdf = Vec::new();
    document.save_to(&mut encrypted_pdf).map_err(|e| {
        EngineError::EncryptionFailed(format!("Failed to serialize encrypted PDF: {e}"))
    })?;

    owner_password.zeroize();
    file_encryption_key.zeroize();

    Ok(encrypted_pdf)
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
    use crate::models::request::{Asset, RenderImageFormat, RenderOptions, RenderOutput, Template};
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
    async fn test_compile_image_output() {
        let compiler = Compiler::new(empty_fonts(), test_cache());
        let mut request = simple_request("Hello, image render!");
        request.options = Some(RenderOptions {
            timeout_ms: Some(5000),
            output: Some(RenderOutput::Images),
            image_format: Some(RenderImageFormat::Png),
            image_dpi: Some(144),
            image_quality: None,
            image_pages: Some(vec![1]),
            cache: None,
            encryption: None,
        });

        let result = compiler.compile_render(&request, 5000).await;
        assert!(result.is_ok());

        match result.unwrap() {
            CompiledRender::Images(images) => {
                assert_eq!(images.format, "png");
                assert_eq!(images.pages.len(), 1);
                assert_eq!(images.pages[0].index, 1);
                assert!(!images.pages[0].data.is_empty());
            }
            other => panic!("Expected image render output, got {:?}", other),
        }
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

    #[tokio::test]
    async fn test_compile_with_encryption_adds_encrypt_dictionary() {
        let compiler = Compiler::new(empty_fonts(), test_cache());

        let mut files = HashMap::new();
        files.insert("main.typ".to_string(), "Top secret".to_string());

        let request = RenderRequest {
            template: Template {
                main: "main.typ".to_string(),
                files,
            },
            data: None,
            assets: None,
            options: Some(RenderOptions {
                timeout_ms: Some(5000),
                output: None,
                image_format: None,
                image_dpi: None,
                image_quality: None,
                image_pages: None,
                cache: None,
                encryption: Some(EncryptionOptions {
                    user_password: "super-secret-password".to_string(),
                    mode: EncryptionMode::Aes256,
                    permissions: EncryptionPermissions::PrintOnly,
                }),
            }),
        };

        let result = compiler.compile(&request, 5000).await;
        assert!(result.is_ok());

        let pdf_bytes = result.unwrap();
        let document = PdfDocument::load_mem(&pdf_bytes).unwrap();
        assert!(document.trailer.get(b"Encrypt").is_ok());
    }

    #[tokio::test]
    async fn test_compile_with_short_encryption_password_fails() {
        let compiler = Compiler::new(empty_fonts(), test_cache());

        let mut files = HashMap::new();
        files.insert("main.typ".to_string(), "Hello".to_string());

        let request = RenderRequest {
            template: Template {
                main: "main.typ".to_string(),
                files,
            },
            data: None,
            assets: None,
            options: Some(RenderOptions {
                timeout_ms: Some(5000),
                output: None,
                image_format: None,
                image_dpi: None,
                image_quality: None,
                image_pages: None,
                cache: None,
                encryption: Some(EncryptionOptions {
                    user_password: "short".to_string(),
                    mode: EncryptionMode::Aes256,
                    permissions: EncryptionPermissions::PrintOnly,
                }),
            }),
        };

        let result = compiler.compile(&request, 5000).await;
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            EngineError::InvalidRequest(_)
        ));
    }

    // Note: Testing actual timeout with infinite loop requires careful handling
    // as it can consume resources. In production, the timeout will kill the task.
}
