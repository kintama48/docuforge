use serde::Deserialize;
use serde_json::Value;
use std::collections::HashMap;
use utoipa::ToSchema;

/// Request body for PDF rendering
#[derive(Debug, Deserialize, ToSchema, Clone)]
pub struct RenderRequest {
    /// Template files and entry point
    pub template: Template,
    /// Data to inject into the template via sys.inputs
    #[schema(value_type = Object, example = json!({"name": "John", "total": 99.99}))]
    pub data: Option<Value>,
    /// External assets (images, fonts) to include
    pub assets: Option<Vec<Asset>>,
    /// Rendering options
    pub options: Option<RenderOptions>,
}

/// Template definition with files
#[derive(Debug, Deserialize, ToSchema, Clone)]
pub struct Template {
    /// Entry point file name (must exist in files map)
    #[schema(example = "main.typ")]
    pub main: String,
    /// Map of filename to Typst content
    #[schema(value_type = HashMap<String, String>, example = json!({"main.typ": "= Hello World\n\nThis is a document."}))]
    pub files: HashMap<String, String>,
}

/// External asset (image, font, etc.)
#[derive(Debug, Deserialize, ToSchema, Clone)]
pub struct Asset {
    /// Asset filename to reference in template
    #[schema(example = "logo.png")]
    pub name: String,
    /// Base64-encoded content (mutually exclusive with url)
    pub content: Option<String>,
    /// URL to fetch asset from (mutually exclusive with content)
    #[schema(example = "https://example.com/logo.png")]
    pub url: Option<String>,
    /// Expected SHA256 hash for verification
    pub hash: Option<String>,
}

/// Rendering options
#[derive(Debug, Deserialize, ToSchema, Clone)]
pub struct RenderOptions {
    /// Compilation timeout in milliseconds (default: 30000)
    #[schema(example = 30000)]
    pub timeout_ms: Option<u64>,
    /// Output format for the render request. Defaults to PDF bytes.
    pub output: Option<RenderOutput>,
    /// Image format when output is images. Defaults to PNG.
    pub image_format: Option<RenderImageFormat>,
    /// Rasterization DPI when output is images. Defaults to 144.
    #[schema(example = 144)]
    pub image_dpi: Option<u32>,
    /// JPEG quality when output is images and image_format is jpg. Defaults to 90.
    #[schema(example = 90)]
    pub image_quality: Option<u8>,
    /// One-based page numbers to rasterize. Omit/null for all pages.
    #[schema(example = json!([1, 2]))]
    pub image_pages: Option<Vec<usize>>,
    /// Template compilation cache hints for in-process (L1) and Redis (L2) cache layers.
    pub cache: Option<TemplateCacheOptions>,
    /// Optional in-memory PDF encryption config.
    pub encryption: Option<EncryptionOptions>,
}

/// Supported render output formats.
#[derive(Debug, Deserialize, ToSchema, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RenderOutput {
    Pdf,
    Images,
}

/// Supported engine image output formats.
#[derive(Debug, Deserialize, ToSchema, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RenderImageFormat {
    Png,
    Jpg,
}

/// Template cache hints from the API tier.
#[derive(Debug, Deserialize, ToSchema, Clone)]
pub struct TemplateCacheOptions {
    /// Whether this template should be eligible for Redis L2 memoization.
    #[schema(example = true)]
    pub cacheable: bool,
    /// Stable fingerprint representing the canonical template bundle.
    #[schema(example = "6f63a0d4e4b26f84fd93cf51431d6535e5cd37f4fd5f6ea01f091f6d307f8fbe")]
    pub template_fingerprint: Option<String>,
    /// Optional template version ID for observability.
    #[schema(example = "ver_01HXYZ...")]
    pub version_id: Option<String>,
}

/// In-memory PDF encryption settings.
#[derive(Debug, Deserialize, ToSchema, Clone)]
pub struct EncryptionOptions {
    /// User password required to open the generated PDF.
    #[schema(example = "super-secret-deal")]
    pub user_password: String,
    /// Encryption mode.
    #[schema(example = "aes256")]
    pub mode: EncryptionMode,
    /// Permission policy for the encrypted PDF.
    #[schema(example = "print_only")]
    pub permissions: EncryptionPermissions,
}

/// Supported encryption modes.
#[derive(Debug, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "snake_case")]
pub enum EncryptionMode {
    Aes256,
}

/// Supported PDF permission policies.
#[derive(Debug, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "snake_case")]
pub enum EncryptionPermissions {
    PrintOnly,
}
