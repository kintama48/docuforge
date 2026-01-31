use std::path::Path;
use std::sync::Arc;

use tokio::net::TcpListener;
use tokio::signal;
use tracing::{info, Level};
use tracing_subscriber::fmt::format::FmtSpan;
use tracing_subscriber::EnvFilter;

use docuforge_engine::cache::AssetCache;
use docuforge_engine::config::Config;
use docuforge_engine::engine::{Compiler, FontLoader};
use docuforge_engine::server::{create_router, AppState};

#[tokio::main]
async fn main() {
    // Load configuration
    let config = Config::from_env();

    // Initialize tracing
    init_tracing(&config);

    // Load fonts
    let fonts = match FontLoader::load_from_directory(Path::new(&config.font_dir)) {
        Ok(f) => Arc::new(f),
        Err(e) => {
            // Allow startup without fonts for development
            tracing::warn!("Font loading failed: {}. Using empty font set.", e);
            Arc::new(FontLoader::empty())
        }
    };
    let fonts_loaded = fonts.len();

    // Create asset cache
    let asset_cache = AssetCache::new(config.asset_cache_size_bytes());

    // Create compiler
    let compiler = Compiler::new(fonts, asset_cache);

    // Create app state
    let state = AppState::new(compiler, config.clone(), fonts_loaded);

    // Create router
    let app = create_router(state);

    // Bind to address
    let addr = config.bind_addr();
    let listener = TcpListener::bind(&addr).await.expect("Failed to bind");

    info!(
        host = %config.host,
        port = config.port,
        fonts_loaded = fonts_loaded,
        "Server starting"
    );

    // Start server with graceful shutdown
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("Server failed");
}

fn init_tracing(config: &Config) {
    let level = match config.log_level.to_lowercase().as_str() {
        "trace" => Level::TRACE,
        "debug" => Level::DEBUG,
        "info" => Level::INFO,
        "warn" => Level::WARN,
        "error" => Level::ERROR,
        _ => Level::INFO,
    };

    let filter = EnvFilter::from_default_env().add_directive(level.into());

    match config.log_format.as_str() {
        "json" => {
            tracing_subscriber::fmt()
                .with_env_filter(filter)
                .json()
                .init();
        }
        _ => {
            tracing_subscriber::fmt()
                .with_env_filter(filter)
                .with_span_events(FmtSpan::CLOSE)
                .init();
        }
    }
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => { info!("Received Ctrl+C, shutting down"); }
        _ = terminate => { info!("Received SIGTERM, shutting down"); }
    }
}
