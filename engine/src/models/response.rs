use serde::Serialize;
use utoipa::ToSchema;

/// Source location for an error
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ErrorSpan {
    /// Filename where error occurred
    #[schema(example = "main.typ")]
    pub file: String,
    /// Line number (1-indexed)
    #[schema(example = 5)]
    pub line: u32,
    /// Column number (1-indexed)
    #[schema(example = 12)]
    pub column: u32,
}

/// Error response for failed requests
#[derive(Debug, Serialize, ToSchema)]
pub struct ErrorResponse {
    /// Error code (e.g., "compilation_failed", "invalid_request")
    #[schema(example = "compilation_failed")]
    pub error: String,
    /// Human-readable error message
    #[schema(example = "unclosed delimiter")]
    pub message: String,
    /// Source location of the error (for compilation errors)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub span: Option<ErrorSpan>,
    /// Hint for fixing the error
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hint: Option<String>,
}

/// Health check response
#[derive(Debug, Serialize, ToSchema)]
pub struct HealthResponse {
    /// Service status
    #[schema(example = "healthy")]
    pub status: String,
    /// Engine version
    #[schema(example = "0.1.0")]
    pub version: String,
    /// Number of fonts loaded
    #[schema(example = 38)]
    pub fonts_loaded: usize,
    /// Uptime in seconds
    #[schema(example = 3600)]
    pub uptime_seconds: u64,
}

/// JSON response for image render output.
#[derive(Debug, Serialize, ToSchema)]
pub struct ImageRenderResponse {
    /// Base64-encoded image pages.
    pub pages: Vec<ImagePage>,
    /// Image format used for all returned pages.
    pub format: String,
}

/// One rendered page image.
#[derive(Debug, Serialize, ToSchema)]
pub struct ImagePage {
    /// One-based page index in the source document.
    pub index: usize,
    /// Base64-encoded image bytes.
    pub data: String,
}
