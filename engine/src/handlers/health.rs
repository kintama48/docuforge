use axum::{extract::State, response::IntoResponse, Json};

use crate::models::response::HealthResponse;
use crate::server::AppState;

pub async fn health(State(state): State<AppState>) -> impl IntoResponse {
    let uptime = state.start_time.elapsed().as_secs();

    Json(HealthResponse {
        status: "healthy".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        fonts_loaded: state.fonts_loaded,
        uptime_seconds: uptime,
    })
}
