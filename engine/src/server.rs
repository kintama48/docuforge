use std::time::{Duration, Instant};

use axum::{
    routing::{get, post},
    Router,
};
use tower_http::limit::RequestBodyLimitLayer;
use tower_http::timeout::TimeoutLayer;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use crate::config::Config;
use crate::engine::compiler::Compiler;
use crate::handlers::{health, render};
use crate::models::request::{Asset, RenderOptions, RenderRequest, Template};
use crate::models::response::{ErrorResponse, ErrorSpan, HealthResponse};

#[derive(OpenApi)]
#[openapi(
    info(
        title = "DocuForge Engine API",
        version = "0.1.0",
        description = "PDF generation engine powered by Typst. Compile Typst templates with dynamic data to produce PDF documents.",
        license(name = "MIT"),
    ),
    paths(
        crate::handlers::health::health,
        crate::handlers::render::render,
    ),
    components(
        schemas(
            RenderRequest,
            Template,
            Asset,
            RenderOptions,
            HealthResponse,
            ErrorResponse,
            ErrorSpan,
        )
    ),
    tags(
        (name = "Health", description = "Health check endpoints"),
        (name = "Render", description = "PDF rendering endpoints")
    )
)]
pub struct ApiDoc;

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
        .merge(SwaggerUi::new("/docs").url("/openapi.json", ApiDoc::openapi()))
        .route("/health", get(health))
        .route("/render", post(render))
        .layer(TimeoutLayer::new(request_timeout))
        .layer(RequestBodyLimitLayer::new(
            state.config.max_body_size_bytes(),
        ))
        .with_state(state)
}
