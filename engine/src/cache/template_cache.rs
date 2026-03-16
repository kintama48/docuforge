use std::collections::HashMap;
use std::sync::Arc;

use moka::sync::Cache;
use sha2::{Digest, Sha256};

use crate::models::request::Template;

#[derive(Debug, Clone)]
pub struct CachedTemplate {
    pub hash: String,
    pub main: Arc<str>,
    pub files: Arc<HashMap<String, String>>,
}

#[derive(Clone)]
pub struct TemplateCache {
    cache: Arc<Cache<String, Arc<CachedTemplate>>>,
}

impl TemplateCache {
    pub fn new(max_entries: u64) -> Self {
        let cache = Cache::builder().max_capacity(max_entries).build();
        Self {
            cache: Arc::new(cache),
        }
    }

    pub fn get_or_insert(&self, template: &Template) -> Arc<CachedTemplate> {
        let hash = Self::compute_template_hash(template);

        if let Some(existing) = self.cache.get(&hash) {
            return existing;
        }

        let cached = Arc::new(CachedTemplate {
            hash: hash.clone(),
            main: Arc::from(template.main.as_str()),
            files: Arc::new(template.files.clone()),
        });

        self.cache.insert(hash, Arc::clone(&cached));
        cached
    }

    pub fn get_or_insert_with_state(&self, template: &Template) -> (Arc<CachedTemplate>, bool) {
        let hash = Self::compute_template_hash(template);

        if let Some(existing) = self.cache.get(&hash) {
            return (existing, true);
        }

        let cached = Arc::new(CachedTemplate {
            hash: hash.clone(),
            main: Arc::from(template.main.as_str()),
            files: Arc::new(template.files.clone()),
        });

        self.cache.insert(hash, Arc::clone(&cached));
        (cached, false)
    }

    pub fn insert_precomputed(&self, cached: Arc<CachedTemplate>) {
        self.cache.insert(cached.hash.clone(), cached);
    }

    pub fn len(&self) -> u64 {
        self.cache.entry_count()
    }

    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    fn compute_template_hash(template: &Template) -> String {
        let mut hasher = Sha256::new();
        hasher.update(template.main.as_bytes());

        let mut entries: Vec<(&str, &str)> = template
            .files
            .iter()
            .map(|(name, content)| (name.as_str(), content.as_str()))
            .collect();
        entries.sort_by(|a, b| a.0.cmp(b.0));

        for (name, content) in entries {
            hasher.update(name.as_bytes());
            hasher.update(b"\0");
            hasher.update(content.as_bytes());
            hasher.update(b"\0");
        }

        format!("{:x}", hasher.finalize())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn template(main: &str, files: &[(&str, &str)]) -> Template {
        let files = files
            .iter()
            .map(|(k, v)| ((*k).to_string(), (*v).to_string()))
            .collect();

        Template {
            main: main.to_string(),
            files,
        }
    }

    #[test]
    fn hash_stable_for_different_map_order() {
        let t1 = template("main.typ", &[("a.typ", "A"), ("b.typ", "B")]);
        let t2 = template("main.typ", &[("b.typ", "B"), ("a.typ", "A")]);

        let h1 = TemplateCache::compute_template_hash(&t1);
        let h2 = TemplateCache::compute_template_hash(&t2);

        assert_eq!(h1, h2);
    }

    #[test]
    fn cache_returns_same_entry_for_same_template() {
        let cache = TemplateCache::new(100);
        let tpl = template("main.typ", &[("main.typ", "Hello")]);

        let (first, first_hit) = cache.get_or_insert_with_state(&tpl);
        let (second, second_hit) = cache.get_or_insert_with_state(&tpl);

        assert!(!first_hit);
        assert!(second_hit);
        assert_eq!(first.hash, second.hash);
        assert!(Arc::ptr_eq(&first, &second));
    }

    #[test]
    fn hash_changes_when_template_content_changes() {
        let t1 = template("main.typ", &[("main.typ", "Hello")]);
        let t2 = template("main.typ", &[("main.typ", "Hello, world")]);

        let h1 = TemplateCache::compute_template_hash(&t1);
        let h2 = TemplateCache::compute_template_hash(&t2);

        assert_ne!(h1, h2);
    }

    #[test]
    fn insert_precomputed_adds_entry() {
        let cache = TemplateCache::new(100);
        let tpl = template("main.typ", &[("main.typ", "Hello")]);
        let first = cache.get_or_insert(&tpl);

        let second = Arc::new(CachedTemplate {
            hash: first.hash.clone(),
            main: Arc::from("main.typ"),
            files: Arc::new(HashMap::from([(
                "main.typ".to_string(),
                "Hello".to_string(),
            )])),
        });

        cache.insert_precomputed(Arc::clone(&second));
        let (fetched, hit) = cache.get_or_insert_with_state(&tpl);
        assert!(hit);
        assert!(Arc::ptr_eq(&fetched, &second));
    }
}
