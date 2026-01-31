use std::net::IpAddr;
use std::sync::Arc;

use base64::Engine as _;
use bytes::Bytes;
use moka::sync::Cache;
use sha2::{Digest, Sha256};
use tracing::{debug, info, warn};
use url::Url;

use crate::error::EngineError;
use crate::models::request::Asset;

/// Maximum size for a single fetched asset (50MB)
const MAX_ASSET_SIZE: u64 = 50 * 1024 * 1024;

/// Thread-safe LRU cache for assets (images, fonts).
/// Uses moka for concurrent access with configurable max size.
#[derive(Clone)]
pub struct AssetCache {
    cache: Arc<Cache<String, Bytes>>,
    client: reqwest::Client,
}

impl AssetCache {
    /// Create a new asset cache with the given max size in bytes.
    pub fn new(max_size_bytes: u64) -> Self {
        let cache = Cache::builder()
            .max_capacity(max_size_bytes)
            .weigher(|_key: &String, value: &Bytes| -> u32 {
                // Weight by byte size, capped at u32::MAX
                value.len().min(u32::MAX as usize) as u32
            })
            .build();

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            cache: Arc::new(cache),
            client,
        }
    }

    /// Get an asset by its hash.
    pub fn get(&self, hash: &str) -> Option<Bytes> {
        let result = self.cache.get(hash);
        if result.is_some() {
            debug!(hash = hash, "Cache hit");
        }
        result
    }

    /// Insert an asset with the given hash.
    pub fn insert(&self, hash: &str, data: Bytes) {
        self.cache.insert(hash.to_string(), data);
        debug!(hash = hash, "Cached asset");
    }

    /// Get an asset from cache, or fetch it from URL if not cached.
    /// The asset must have either `content` (base64) or `url` set.
    pub async fn get_or_fetch(&self, asset: &Asset) -> Result<Bytes, EngineError> {
        // If we have a hash, try the cache first
        if let Some(hash) = &asset.hash {
            if let Some(data) = self.get(hash) {
                return Ok(data);
            }
        }

        // Load from content or URL
        let data = if let Some(content) = &asset.content {
            self.decode_base64(content)?
        } else if let Some(url) = &asset.url {
            self.fetch_url(url).await?
        } else {
            return Err(EngineError::InvalidRequest(format!(
                "Asset '{}' has neither content nor url",
                asset.name
            )));
        };

        // Compute hash if not provided, then cache
        let hash = asset
            .hash
            .clone()
            .unwrap_or_else(|| Self::compute_hash(&data));
        self.insert(&hash, data.clone());

        Ok(data)
    }

    /// Decode base64 content.
    pub fn decode_base64(&self, content: &str) -> Result<Bytes, EngineError> {
        base64::engine::general_purpose::STANDARD
            .decode(content)
            .map(Bytes::from)
            .map_err(|e| EngineError::InvalidRequest(format!("Invalid base64 content: {}", e)))
    }

    /// Fetch content from a URL.
    /// Validates URL to prevent SSRF attacks and enforces size limits.
    async fn fetch_url(&self, url: &str) -> Result<Bytes, EngineError> {
        // Validate URL before fetching (SSRF protection)
        Self::validate_url(url)?;

        info!(url = url, "Fetching remote asset");

        let response = self
            .client
            .get(url)
            .send()
            .await
            .map_err(|e| EngineError::AssetFetchFailed(format!("Request failed: {}", e)))?;

        if !response.status().is_success() {
            return Err(EngineError::AssetFetchFailed(format!(
                "HTTP {} from {}",
                response.status(),
                url
            )));
        }

        // Check content-length header to reject oversized responses early
        if let Some(content_length) = response.content_length() {
            if content_length > MAX_ASSET_SIZE {
                return Err(EngineError::InvalidRequest(format!(
                    "Asset too large: {} bytes (max {} bytes)",
                    content_length, MAX_ASSET_SIZE
                )));
            }
        }

        let bytes = response
            .bytes()
            .await
            .map_err(|e| EngineError::AssetFetchFailed(format!("Failed to read body: {}", e)))?;

        // Double-check actual size (in case content-length was missing or wrong)
        if bytes.len() as u64 > MAX_ASSET_SIZE {
            return Err(EngineError::InvalidRequest(format!(
                "Asset too large: {} bytes (max {} bytes)",
                bytes.len(),
                MAX_ASSET_SIZE
            )));
        }

        Ok(bytes)
    }

    /// Validate URL to prevent SSRF attacks.
    /// Blocks internal IPs, localhost, and non-HTTP(S) schemes.
    fn validate_url(url: &str) -> Result<(), EngineError> {
        let parsed = Url::parse(url)
            .map_err(|_| EngineError::InvalidRequest(format!("Invalid URL: {}", url)))?;

        // Only allow HTTP and HTTPS
        match parsed.scheme() {
            "http" | "https" => {}
            scheme => {
                return Err(EngineError::InvalidRequest(format!(
                    "URL scheme '{}' not allowed, only http/https",
                    scheme
                )));
            }
        }

        // Get the host
        let host = parsed
            .host_str()
            .ok_or_else(|| EngineError::InvalidRequest("URL has no host".to_string()))?;

        // Block localhost variants
        if host == "localhost" || host == "127.0.0.1" || host == "::1" || host == "[::1]" {
            warn!(url = url, "Blocked SSRF attempt to localhost");
            return Err(EngineError::InvalidRequest(
                "URLs to localhost are not allowed".to_string(),
            ));
        }

        // Try to parse as IP address and block private ranges
        if let Ok(ip) = host.parse::<IpAddr>() {
            if Self::is_private_ip(&ip) {
                warn!(url = url, ip = %ip, "Blocked SSRF attempt to private IP");
                return Err(EngineError::InvalidRequest(
                    "URLs to private IP addresses are not allowed".to_string(),
                ));
            }
        }

        Ok(())
    }

    /// Check if an IP address is in a private/internal range.
    fn is_private_ip(ip: &IpAddr) -> bool {
        match ip {
            IpAddr::V4(ipv4) => {
                ipv4.is_private()           // 10.x.x.x, 172.16-31.x.x, 192.168.x.x
                    || ipv4.is_loopback()   // 127.x.x.x
                    || ipv4.is_link_local() // 169.254.x.x (AWS metadata, etc.)
                    || ipv4.is_broadcast()
                    || ipv4.is_unspecified()
                    // Cloud metadata IP
                    || ipv4.octets() == [169, 254, 169, 254]
            }
            IpAddr::V6(ipv6) => {
                ipv6.is_loopback() || ipv6.is_unspecified()
                // Note: is_unique_local() and is_unicast_link_local() are unstable
            }
        }
    }

    /// Compute SHA-256 hash of data.
    fn compute_hash(data: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data);
        format!("{:x}", hasher.finalize())
    }

    /// Get the number of cached items.
    pub fn len(&self) -> u64 {
        self.cache.entry_count()
    }

    /// Check if cache is empty.
    pub fn is_empty(&self) -> bool {
        self.cache.entry_count() == 0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_cache() {
        let cache = AssetCache::new(100 * 1024 * 1024);
        assert!(cache.is_empty());
    }

    #[test]
    fn test_insert_and_get() {
        let cache = AssetCache::new(100 * 1024 * 1024);
        let data = Bytes::from("test data");

        cache.insert("test-hash", data.clone());

        let retrieved = cache.get("test-hash");
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap(), data);
    }

    #[test]
    fn test_get_missing() {
        let cache = AssetCache::new(100 * 1024 * 1024);
        assert!(cache.get("nonexistent").is_none());
    }

    #[test]
    fn test_decode_base64_valid() {
        let cache = AssetCache::new(100 * 1024 * 1024);
        // "hello" in base64
        let result = cache.decode_base64("aGVsbG8=");
        assert!(result.is_ok());
        assert_eq!(result.unwrap().as_ref(), b"hello");
    }

    #[test]
    fn test_decode_base64_invalid() {
        let cache = AssetCache::new(100 * 1024 * 1024);
        let result = cache.decode_base64("not valid base64!!!");
        assert!(result.is_err());
    }

    #[test]
    fn test_compute_hash() {
        let data = b"test data";
        let hash = AssetCache::compute_hash(data);
        // SHA-256 of "test data"
        assert_eq!(
            hash,
            "916f0027a575074ce72a331777c3478d6513f786a591bd892da1a577bf2335f9"
        );
    }

    #[tokio::test]
    async fn test_get_or_fetch_with_base64_content() {
        let cache = AssetCache::new(100 * 1024 * 1024);
        let asset = Asset {
            name: "test.png".to_string(),
            content: Some("aGVsbG8=".to_string()), // "hello"
            url: None,
            hash: Some("test-hash".to_string()),
        };

        let result = cache.get_or_fetch(&asset).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap().as_ref(), b"hello");

        // Should be cached now
        assert!(cache.get("test-hash").is_some());
    }

    #[tokio::test]
    async fn test_get_or_fetch_from_cache() {
        let cache = AssetCache::new(100 * 1024 * 1024);
        let data = Bytes::from("cached data");
        cache.insert("cached-hash", data.clone());

        let asset = Asset {
            name: "test.png".to_string(),
            content: None,
            url: Some("http://example.com/should-not-fetch".to_string()),
            hash: Some("cached-hash".to_string()),
        };

        // Should return cached data without fetching
        let result = cache.get_or_fetch(&asset).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), data);
    }

    #[tokio::test]
    async fn test_get_or_fetch_missing_content_and_url() {
        let cache = AssetCache::new(100 * 1024 * 1024);
        let asset = Asset {
            name: "test.png".to_string(),
            content: None,
            url: None,
            hash: None,
        };

        let result = cache.get_or_fetch(&asset).await;
        assert!(result.is_err());
    }
}
