use axum::{
    extract::State,
    http::header,
    response::{IntoResponse, Response},
    Json,
};

use crate::error::EngineError;
use crate::models::request::RenderRequest;
use crate::models::response::ErrorResponse;
use crate::server::AppState;

/// Render a Typst template to PDF
#[utoipa::path(
    post,
    path = "/render",
    request_body = RenderRequest,
    responses(
        (status = 200, description = "PDF generated successfully", content_type = "application/pdf"),
        (status = 400, description = "Template compilation failed", body = ErrorResponse),
        (status = 422, description = "Invalid request (e.g., missing main file)", body = ErrorResponse),
        (status = 408, description = "Render timeout exceeded", body = ErrorResponse),
        (status = 502, description = "Failed to fetch external asset", body = ErrorResponse)
    ),
    tag = "Render"
)]
pub async fn render(
    State(state): State<AppState>,
    Json(request): Json<RenderRequest>,
) -> Result<impl IntoResponse, EngineError> {
    // Get timeout from request options or use config default
    let timeout_ms = request
        .options
        .as_ref()
        .and_then(|o| o.timeout_ms)
        .unwrap_or(state.config.render_timeout_ms);

    // Compile the template
    let pdf_bytes = state.compiler.compile(&request, timeout_ms).await?;

    // Return PDF with appropriate headers
    let response = Response::builder()
        .header(header::CONTENT_TYPE, "application/pdf")
        .header(
            header::CONTENT_DISPOSITION,
            "inline; filename=\"document.pdf\"",
        )
        .body(axum::body::Body::from(pdf_bytes))
        .map_err(|e| EngineError::Internal(format!("Failed to build response: {}", e)))?;

    Ok(response)
}
