use serde::Deserialize;
use serde_json::Value;
use std::collections::HashMap;
use utoipa::ToSchema;

/// Request body for PDF rendering
#[derive(Debug, Deserialize, ToSchema)]
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
#[derive(Debug, Deserialize, ToSchema)]
pub struct Template {
    /// Entry point file name (must exist in files map)
    #[schema(example = "main.typ")]
    pub main: String,
    /// Map of filename to Typst content
    #[schema(value_type = HashMap<String, String>, example = json!({"main.typ": "= Hello World\n\nThis is a document."}))]
    pub files: HashMap<String, String>,
}

/// External asset (image, font, etc.)
#[derive(Debug, Deserialize, ToSchema)]
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
#[derive(Debug, Deserialize, ToSchema)]
pub struct RenderOptions {
    /// Compilation timeout in milliseconds (default: 30000)
    #[schema(example = 30000)]
    pub timeout_ms: Option<u64>,
}
