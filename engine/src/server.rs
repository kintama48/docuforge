use std::time::{Duration, Instant};

use axum::{
    routing::{get, post},
    Router,
};
use tower_http::limit::RequestBodyLimitLayer;
use tower_http::timeout::TimeoutLayer;

use crate::config::Config;
use crate::engine::compiler::Compiler;
use crate::handlers::{health, render};

#[derive(Clone)]
pub struct AppState {
    pub compiler: Compiler,
    pub config: Config,
    pub start_time: Instant,
    pub fonts_loaded: usize,
}

impl AppState {
    pub fn new(compiler: Compiler, config: Config, fonts_loaded: usize) -> Self {
        Self {
            compiler,
            config,
            start_time: Instant::now(),
            fonts_loaded,
        }
    }
}

pub fn create_router(state: AppState) -> Router {
    // Request timeout (separate from render timeout - this is for the whole HTTP request)
    let request_timeout = Duration::from_secs(120);

    Router::new()
        .route("/health", get(health))
        .route("/render", post(render))
        .layer(TimeoutLayer::new(request_timeout))
        .layer(RequestBodyLimitLayer::new(
            state.config.max_body_size_bytes(),
        ))
        .with_state(state)
}
