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
        // Report server-side errors to Sentry (no-op if Sentry is not initialized)
        if matches!(self, EngineError::Internal(_) | EngineError::AssetFetchFailed(_)) {
            sentry::capture_error(&self);
        }

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_invalid_request_response() {
        let response = EngineError::InvalidRequest("bad".to_string()).into_response();
        assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
    }

    #[test]
    fn test_compilation_failed_response() {
        let response = EngineError::CompilationFailed {
            message: "syntax".to_string(),
            span: Some(ErrorSpan {
                file: "main.typ".to_string(),
                line: 1,
                column: 2,
            }),
            hint: Some("check syntax".to_string()),
        }
        .into_response();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    #[test]
    fn test_asset_fetch_failed_response() {
        let response = EngineError::AssetFetchFailed("404".to_string()).into_response();
        assert_eq!(response.status(), StatusCode::BAD_GATEWAY);
    }

    #[test]
    fn test_timeout_response() {
        let response = EngineError::Timeout(123).into_response();
        assert_eq!(response.status(), StatusCode::REQUEST_TIMEOUT);
    }

    #[test]
    fn test_internal_response() {
        let response = EngineError::Internal("boom".to_string()).into_response();
        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
    }
}
