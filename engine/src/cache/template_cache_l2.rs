use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use redis::Commands;
use serde::{Deserialize, Serialize};

use crate::cache::template_cache::CachedTemplate;

const L2_TEMPLATE_SCHEMA_VERSION: u8 = 1;

#[derive(Debug, Clone)]
pub struct TemplateCacheL2 {
    redis_client: Arc<redis::Client>,
    prefix: String,
    ttl_sec: u64,
    max_entry_bytes: usize,
    connect_timeout: Duration,
}

#[derive(Debug, Serialize, Deserialize)]
struct L2TemplatePayload {
    schema_version: u8,
    hash: String,
    main: String,
    files: HashMap<String, String>,
}

impl TemplateCacheL2 {
    pub fn new(
        redis_url: &str,
        prefix: String,
        ttl_sec: u64,
        connect_timeout_ms: u64,
        max_entry_bytes: usize,
    ) -> Result<Self, redis::RedisError> {
        let redis_client = redis::Client::open(redis_url)?;
        Ok(Self {
            redis_client: Arc::new(redis_client),
            prefix,
            ttl_sec: ttl_sec.max(1),
            max_entry_bytes: max_entry_bytes.max(1),
            connect_timeout: Duration::from_millis(connect_timeout_ms.max(1)),
        })
    }

    pub async fn get(
        &self,
        template_fingerprint: &str,
    ) -> Result<Option<Arc<CachedTemplate>>, String> {
        let client = Arc::clone(&self.redis_client);
        let key = self.key(template_fingerprint);
        let timeout = self.connect_timeout;

        tokio::task::spawn_blocking(move || {
            let mut connection = Self::connect(&client, timeout)?;

            let data: Option<Vec<u8>> = connection
                .get(key)
                .map_err(|e| format!("redis GET failed: {e}"))?;

            let Some(data) = data else {
                return Ok(None);
            };

            let payload: L2TemplatePayload =
                serde_json::from_slice(&data).map_err(|e| format!("invalid redis payload: {e}"))?;

            if payload.schema_version != L2_TEMPLATE_SCHEMA_VERSION {
                return Ok(None);
            }

            Ok(Some(Arc::new(CachedTemplate {
                hash: payload.hash,
                main: Arc::from(payload.main),
                files: Arc::new(payload.files),
            })))
        })
        .await
        .map_err(|e| format!("redis task join failed: {e}"))?
    }

    pub async fn set(
        &self,
        template_fingerprint: &str,
        cached_template: &CachedTemplate,
    ) -> Result<bool, String> {
        let Some(payload_bytes) = self.serialize_payload(cached_template)? else {
            return Ok(false);
        };

        let client = Arc::clone(&self.redis_client);
        let key = self.key(template_fingerprint);
        let ttl_sec = self.ttl_sec;
        let timeout = self.connect_timeout;

        tokio::task::spawn_blocking(move || {
            let mut connection = Self::connect(&client, timeout)?;

            connection
                .set_ex::<_, _, ()>(key, payload_bytes, ttl_sec)
                .map_err(|e| format!("redis SETEX failed: {e}"))?;

            Ok(true)
        })
        .await
        .map_err(|e| format!("redis task join failed: {e}"))?
    }

    fn connect(client: &redis::Client, timeout: Duration) -> Result<redis::Connection, String> {
        let connection = client
            .get_connection_with_timeout(timeout)
            .map_err(|e| format!("redis connect failed: {e}"))?;

        connection
            .set_read_timeout(Some(timeout))
            .map_err(|e| format!("redis set_read_timeout failed: {e}"))?;
        connection
            .set_write_timeout(Some(timeout))
            .map_err(|e| format!("redis set_write_timeout failed: {e}"))?;

        Ok(connection)
    }

    fn key(&self, template_fingerprint: &str) -> String {
        format!("{}{}", self.prefix, template_fingerprint)
    }

    fn serialize_payload(
        &self,
        cached_template: &CachedTemplate,
    ) -> Result<Option<Vec<u8>>, String> {
        let payload = L2TemplatePayload {
            schema_version: L2_TEMPLATE_SCHEMA_VERSION,
            hash: cached_template.hash.clone(),
            main: cached_template.main.to_string(),
            files: cached_template.files.as_ref().clone(),
        };

        let serialized =
            serde_json::to_vec(&payload).map_err(|e| format!("serialize payload failed: {e}"))?;

        if serialized.len() > self.max_entry_bytes {
            return Ok(None);
        }

        Ok(Some(serialized))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::TcpListener;
    use std::process::{Child, Command, Stdio};
    use std::thread;
    use std::time::Duration;

    fn cached_template() -> CachedTemplate {
        CachedTemplate {
            hash: "abc".to_string(),
            main: Arc::from("main.typ"),
            files: Arc::new(HashMap::from([(
                "main.typ".to_string(),
                "Hello".to_string(),
            )])),
        }
    }

    #[test]
    fn key_uses_prefix_and_fingerprint() {
        let cache = TemplateCacheL2::new(
            "redis://127.0.0.1:6379",
            "tpl:v2:".to_string(),
            60,
            500,
            1024,
        )
        .unwrap();
        assert_eq!(cache.key("abcd"), "tpl:v2:abcd");
    }

    #[test]
    fn serialization_round_trip_shape() {
        let cache = TemplateCacheL2::new(
            "redis://127.0.0.1:6379",
            "tpl:v2:".to_string(),
            60,
            500,
            1024,
        )
        .unwrap();

        let template = cached_template();
        let payload = cache.serialize_payload(&template).unwrap().unwrap();
        let decoded: L2TemplatePayload = serde_json::from_slice(&payload).unwrap();

        assert_eq!(decoded.schema_version, 1);
        assert_eq!(decoded.hash, "abc");
        assert_eq!(decoded.main, "main.typ");
        assert_eq!(decoded.files.get("main.typ"), Some(&"Hello".to_string()));
    }

    #[test]
    fn oversize_payload_is_not_cacheable() {
        let cache =
            TemplateCacheL2::new("redis://127.0.0.1:6379", "tpl:v2:".to_string(), 60, 500, 10)
                .unwrap();

        let template = cached_template();
        let payload = cache.serialize_payload(&template).unwrap();
        assert!(payload.is_none());
    }

    struct RedisTestServer {
        child: Child,
        url: String,
    }

    impl RedisTestServer {
        fn spawn() -> Option<Self> {
            let port = reserve_port();
            let mut command = Command::new("redis-server");
            command
                .arg("--bind")
                .arg("127.0.0.1")
                .arg("--port")
                .arg(port.to_string())
                .arg("--save")
                .arg("")
                .arg("--appendonly")
                .arg("no")
                .arg("--daemonize")
                .arg("no")
                .stdout(Stdio::null())
                .stderr(Stdio::null());

            let child = command.spawn().ok()?;
            let server = Self {
                child,
                url: format!("redis://127.0.0.1:{port}"),
            };

            if server.wait_ready() {
                Some(server)
            } else {
                None
            }
        }

        fn wait_ready(&self) -> bool {
            for _ in 0..40 {
                let client = match redis::Client::open(self.url.as_str()) {
                    Ok(client) => client,
                    Err(_) => {
                        thread::sleep(Duration::from_millis(25));
                        continue;
                    }
                };

                if let Ok(mut connection) = client.get_connection() {
                    let ping: redis::RedisResult<String> =
                        redis::cmd("PING").query(&mut connection);
                    if matches!(ping.as_deref(), Ok("PONG")) {
                        return true;
                    }
                }

                thread::sleep(Duration::from_millis(25));
            }

            false
        }
    }

    impl Drop for RedisTestServer {
        fn drop(&mut self) {
            let _ = self.child.kill();
            let _ = self.child.wait();
        }
    }

    fn reserve_port() -> u16 {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind port");
        let port = listener.local_addr().expect("addr").port();
        drop(listener);
        port
    }

    #[tokio::test]
    async fn redis_round_trip_set_and_get() {
        let Some(redis_server) = RedisTestServer::spawn() else {
            eprintln!("redis-server unavailable; skipping redis_round_trip_set_and_get");
            return;
        };

        let cache = TemplateCacheL2::new(
            redis_server.url.as_str(),
            "tpl:v2:".to_string(),
            60,
            500,
            1024,
        )
        .unwrap();

        let template = cached_template();
        let stored = cache.set("fingerprint-123", &template).await.unwrap();
        assert!(stored);

        let loaded = cache.get("fingerprint-123").await.unwrap().unwrap();
        assert_eq!(loaded.hash, template.hash);
        assert_eq!(loaded.main.as_ref(), "main.typ");
        assert_eq!(loaded.files.get("main.typ"), Some(&"Hello".to_string()));
    }

    #[tokio::test]
    async fn redis_entry_expires_after_ttl() {
        let Some(redis_server) = RedisTestServer::spawn() else {
            eprintln!("redis-server unavailable; skipping redis_entry_expires_after_ttl");
            return;
        };

        let cache = TemplateCacheL2::new(
            redis_server.url.as_str(),
            "tpl:v2:".to_string(),
            1,
            500,
            1024,
        )
        .unwrap();

        let template = cached_template();
        let stored = cache.set("fingerprint-ttl", &template).await.unwrap();
        assert!(stored);

        thread::sleep(Duration::from_millis(1300));
        let loaded = cache.get("fingerprint-ttl").await.unwrap();
        assert!(loaded.is_none());
    }
}
