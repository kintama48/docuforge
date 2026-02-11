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
    pub sentry_dsn: Option<String>,
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
            sentry_dsn: env::var("SENTRY_DSN").ok(),
        }
    }

    #[must_use]
    pub fn bind_addr(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }

    #[must_use]
    pub fn max_body_size_bytes(&self) -> usize {
        self.max_body_size_mb * 1024 * 1024
    }

    #[must_use]
    pub fn asset_cache_size_bytes(&self) -> u64 {
        (self.asset_cache_size_mb * 1024 * 1024) as u64
    }
}

// ENG-M1 fix: Remove duplicate Default impl.
// from_env() already provides defaults via unwrap_or; having a separate Default
// with duplicated values risks silent bugs if the two diverge.
// Use Config::from_env() for all construction (it handles missing env vars).

#[cfg(test)]
mod tests {
    use super::Config;
    use std::env;
    use std::sync::Mutex;

    static ENV_LOCK: Mutex<()> = Mutex::new(());

    fn with_env(vars: &[(&str, Option<&str>)], f: impl FnOnce()) {
        let _guard = ENV_LOCK.lock().unwrap();
        let mut originals = Vec::new();
        for (key, value) in vars {
            originals.push((*key, env::var(*key).ok()));
            match value {
                Some(val) => env::set_var(*key, val),
                None => env::remove_var(*key),
            }
        }
        f();
        for (key, value) in originals {
            match value {
                Some(val) => env::set_var(key, val),
                None => env::remove_var(key),
            }
        }
    }

    #[test]
    fn test_config_defaults() {
        with_env(
            &[
                ("HOST", None),
                ("PORT", None),
                ("FONT_DIR", None),
                ("RENDER_TIMEOUT_MS", None),
                ("MAX_BODY_SIZE_MB", None),
                ("ASSET_CACHE_SIZE_MB", None),
                ("LOG_LEVEL", None),
                ("LOG_FORMAT", None),
                ("SENTRY_DSN", None),
            ],
            || {
                let config = Config::from_env();
                assert_eq!(config.host, "127.0.0.1");
                assert_eq!(config.port, 3001);
                assert_eq!(config.font_dir, "./assets/fonts");
                assert_eq!(config.render_timeout_ms, 5000);
                assert_eq!(config.max_body_size_mb, 50);
                assert_eq!(config.asset_cache_size_mb, 100);
                assert_eq!(config.log_level, "info");
                assert_eq!(config.log_format, "pretty");
                assert!(config.sentry_dsn.is_none());
            },
        );
    }

    #[test]
    fn test_config_overrides_and_helpers() {
        with_env(
            &[
                ("HOST", Some("0.0.0.0")),
                ("PORT", Some("4000")),
                ("FONT_DIR", Some("/tmp/fonts")),
                ("RENDER_TIMEOUT_MS", Some("1234")),
                ("MAX_BODY_SIZE_MB", Some("10")),
                ("ASSET_CACHE_SIZE_MB", Some("5")),
                ("LOG_LEVEL", Some("debug")),
                ("LOG_FORMAT", Some("json")),
                ("SENTRY_DSN", Some("https://key@sentry.io/123")),
            ],
            || {
                let config = Config::from_env();
                assert_eq!(config.host, "0.0.0.0");
                assert_eq!(config.port, 4000);
                assert_eq!(config.font_dir, "/tmp/fonts");
                assert_eq!(config.render_timeout_ms, 1234);
                assert_eq!(config.max_body_size_mb, 10);
                assert_eq!(config.asset_cache_size_mb, 5);
                assert_eq!(config.log_level, "debug");
                assert_eq!(config.log_format, "json");
                assert_eq!(config.sentry_dsn.as_deref(), Some("https://key@sentry.io/123"));
                assert_eq!(config.bind_addr(), "0.0.0.0:4000");
                assert_eq!(config.max_body_size_bytes(), 10 * 1024 * 1024);
                assert_eq!(config.asset_cache_size_bytes(), 5 * 1024 * 1024);
            },
        );
    }
}
