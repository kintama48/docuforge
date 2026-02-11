use std::path::Path;
use std::sync::Arc;

#[cfg(not(test))]
use tokio::net::TcpListener;
#[cfg(not(test))]
use tokio::signal;
use tracing::{info, Level};
use tracing_subscriber::fmt::format::FmtSpan;
use tracing_subscriber::EnvFilter;

use docuforge_engine::cache::AssetCache;
use docuforge_engine::config::Config;
use docuforge_engine::engine::{Compiler, FontLoader};
use docuforge_engine::server::{create_router, AppState};

#[cfg(not(test))]
#[tokio::main]
async fn main() {
    // Load configuration
    let config = Config::from_env();

    // Initialize Sentry (must be before tracing so the guard lives for the program's lifetime)
    let _sentry_guard = config.sentry_dsn.as_ref().map(|dsn| {
        sentry::init((dsn.as_str(), sentry::ClientOptions {
            release: sentry::release_name!(),
            environment: Some(
                std::env::var("SENTRY_ENVIRONMENT")
                    .unwrap_or_else(|_| "production".into())
                    .into(),
            ),
            traces_sample_rate: 0.1,
            ..Default::default()
        }))
    });

    // Initialize tracing
    init_tracing(&config);

    let (app, fonts_loaded) = build_app(&config);

    // Bind to address
    let addr = config.bind_addr();
    let listener = TcpListener::bind(&addr).await.unwrap_or_else(|e| {
        panic!("Failed to bind to {addr}: {e}");
    });

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
        .expect("Axum server exited with error");
}

fn build_app(config: &Config) -> (axum::Router, usize) {
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

    (app, fonts_loaded)
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
            let _ = tracing_subscriber::fmt()
                .with_env_filter(filter)
                .json()
                .try_init();
        }
        _ => {
            let _ = tracing_subscriber::fmt()
                .with_env_filter(filter)
                .with_span_events(FmtSpan::CLOSE)
                .try_init();
        }
    }
}

#[cfg(not(test))]
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

    shutdown_signal_with(ctrl_c, terminate).await;
}

async fn shutdown_signal_with<C, T>(ctrl_c: C, terminate: T)
where
    C: std::future::Future<Output = ()> + Send,
    T: std::future::Future<Output = ()> + Send,
{
    tokio::select! {
        _ = ctrl_c => { info!("Received Ctrl+C, shutting down"); }
        _ = terminate => { info!("Received SIGTERM, shutting down"); }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_build_app_with_missing_fonts_uses_empty() {
        let mut config = Config::from_env();
        config.font_dir = "/nonexistent/fonts".to_string();

        let (_app, fonts_loaded) = build_app(&config);
        assert_eq!(fonts_loaded, 0);
    }

    #[test]
    fn test_build_app_with_assets_fonts_loads() {
        let mut config = Config::from_env();
        let fonts_dir: PathBuf = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("assets")
            .join("fonts");
        config.font_dir = fonts_dir.to_string_lossy().to_string();

        let (_app, fonts_loaded) = build_app(&config);
        assert!(fonts_loaded > 0);
    }

    #[test]
    fn test_init_tracing_handles_formats() {
        let mut config = Config::from_env();
        config.log_level = "debug".to_string();

        config.log_format = "json".to_string();
        init_tracing(&config);

        config.log_format = "pretty".to_string();
        init_tracing(&config);
    }

    #[tokio::test]
    async fn test_shutdown_signal_with_ctrl_c() {
        shutdown_signal_with(async {}, std::future::pending::<()>()).await;
    }
}
