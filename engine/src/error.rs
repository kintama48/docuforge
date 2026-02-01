use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use thiserror::Error;
use crate::models::response::{ErrorResponse, ErrorSpan};

#[derive(Debug, Error)]
pub enum EngineError {
    #[error("Invalid request: {0}")]
    InvalidRequest(String),

    #[error("Compilation failed: {message}")]
    CompilationFailed {
        message: String,
        span: Option<ErrorSpan>,
        hint: Option<String>,
    },

    #[error("Asset fetch failed: {0}")]
    AssetFetchFailed(String),

    #[error("Render timeout: exceeded {0}ms limit")]
    Timeout(u64),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl IntoResponse for EngineError {
    fn into_response(self) -> Response {
        let (status, error_code, message, span, hint) = match &self {
            EngineError::InvalidRequest(msg) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                "invalid_request",
                msg.clone(),
                None,
                None,
            ),
            EngineError::CompilationFailed {
                message,
                span,
                hint,
            } => (
                StatusCode::BAD_REQUEST,
                "compilation_failed",
                message.clone(),
                span.clone(),
                hint.clone(),
            ),
            EngineError::AssetFetchFailed(msg) => (
                StatusCode::BAD_GATEWAY,
                "asset_fetch_failed",
                msg.clone(),
                None,
                None,
            ),
            EngineError::Timeout(ms) => (
                StatusCode::REQUEST_TIMEOUT,
                "timeout",
                format!("Render exceeded {}ms limit", ms),
                None,
                None,
            ),
            EngineError::Internal(msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "internal_error",
                msg.clone(),
                None,
                None,
            ),
        };

        let body = ErrorResponse {
            error: error_code.to_string(),
            message,
            span,
            hint,
        };

        (status, Json(body)).into_response()
    }
}
