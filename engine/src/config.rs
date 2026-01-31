use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub font_dir: String,
    pub render_timeout_ms: u64,
    pub max_body_size_mb: usize,
    pub asset_cache_size_mb: usize,
    pub log_level: String,
    pub log_format: String,
}

impl Config {
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();

        Self {
            host: env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
            port: env::var("PORT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(3001),
            font_dir: env::var("FONT_DIR").unwrap_or_else(|_| "./assets/fonts".to_string()),
            render_timeout_ms: env::var("RENDER_TIMEOUT_MS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(5000),
            max_body_size_mb: env::var("MAX_BODY_SIZE_MB")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(50),
            asset_cache_size_mb: env::var("ASSET_CACHE_SIZE_MB")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(100),
            log_level: env::var("LOG_LEVEL").unwrap_or_else(|_| "info".to_string()),
            log_format: env::var("LOG_FORMAT").unwrap_or_else(|_| "pretty".to_string()),
        }
    }

    pub fn bind_addr(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }

    pub fn max_body_size_bytes(&self) -> usize {
        self.max_body_size_mb * 1024 * 1024
    }

    pub fn asset_cache_size_bytes(&self) -> u64 {
        (self.asset_cache_size_mb * 1024 * 1024) as u64
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 3001,
            font_dir: "./assets/fonts".to_string(),
            render_timeout_ms: 5000,
            max_body_size_mb: 50,
            asset_cache_size_mb: 100,
            log_level: "info".to_string(),
            log_format: "pretty".to_string(),
        }
    }
}
