use std::collections::HashMap;
use std::sync::Arc;

use docuforge_engine::cache::AssetCache;
use docuforge_engine::engine::{DocuForgeWorld, FontLoader};
use docuforge_engine::error::EngineError;
use docuforge_engine::models::request::{Asset, RenderRequest, Template};
use typst::World;

#[tokio::test]
async fn asset_cache_base64_round_trip_integration() {
    let cache = AssetCache::new(1024 * 1024);
    assert!(cache.is_empty());
    assert_eq!(cache.len(), 0);

    let asset = Asset {
        name: "hello.txt".to_string(),
        content: Some("aGVsbG8=".to_string()),
        url: None,
        hash: Some("hello-hash".to_string()),
    };

    let bytes = cache.get_or_fetch(&asset).await.unwrap();
    assert_eq!(bytes.as_ref(), b"hello");
    let _ = cache.len();

    let cached = cache.get("hello-hash").expect("cached bytes");
    assert_eq!(cached, bytes);
}

#[tokio::test]
async fn asset_cache_rejects_invalid_url_integration() {
    let cache = AssetCache::new(1024 * 1024);
    let asset = Asset {
        name: "bad.png".to_string(),
        content: None,
        url: Some("ftp://example.com/file".to_string()),
        hash: None,
    };

    let result = cache.get_or_fetch(&asset).await;
    assert!(matches!(result, Err(EngineError::InvalidRequest(_))));
}

#[test]
fn font_loader_accessors_integration() {
    let loader = FontLoader::empty();
    assert!(loader.is_empty());
    assert_eq!(loader.len(), 0);
    let _ = loader.font_book();
    assert!(loader.font(0).is_none());
}

#[test]
fn world_accessors_integration() {
    let mut files = HashMap::new();
    files.insert("main.typ".to_string(), "Hello".to_string());

    let request = RenderRequest {
        template: Template {
            main: "main.typ".to_string(),
            files,
        },
        data: None,
        assets: None,
        options: None,
    };

    let fonts = Arc::new(FontLoader::empty());
    let world = DocuForgeWorld::new(&request, fonts, HashMap::new()).unwrap();

    assert!(world.packages().is_empty());
    assert!(world.font(0).is_none());
    let _ = world.book();
    let _ = world.library();
}
