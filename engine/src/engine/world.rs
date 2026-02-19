use std::collections::HashMap;
use std::sync::Arc;

use time::{OffsetDateTime, UtcOffset};
use typst::diag::{FileError, FileResult};
use typst::foundations::{Bytes, Datetime, Dict, IntoValue, Value};
use typst::syntax::package::PackageSpec;
use typst::syntax::{FileId, Source, VirtualPath};
use typst::text::{Font, FontBook};
use typst::utils::LazyHash;
use typst::{Library, World};

use crate::engine::fonts::FontLoader;
use crate::error::EngineError;
use crate::models::request::RenderRequest;

/// Virtual filesystem for Typst compilation.
/// All content comes from the request payload - no real filesystem access.
#[derive(Debug)]
pub struct DocuForgeWorld {
    library: LazyHash<Library>,
    book: LazyHash<FontBook>,
    fonts: Arc<FontLoader>,
    main_id: FileId,
    sources: HashMap<FileId, Source>,
    assets: HashMap<String, Bytes>,
}

impl DocuForgeWorld {
    /// Create a new World from a render request.
    ///
    /// # Arguments
    /// * `request` - The render request containing template files and data
    /// * `fonts` - Shared font loader with system fonts
    /// * `assets` - Pre-resolved binary assets (images, custom fonts)
    pub fn new(
        request: &RenderRequest,
        fonts: Arc<FontLoader>,
        assets: HashMap<String, bytes::Bytes>,
    ) -> Result<Self, EngineError> {
        Self::new_from_parts(
            &request.template.main,
            &request.template.files,
            request.data.as_ref(),
            fonts,
            assets,
        )
    }

    /// Create a world from pre-validated template parts and request data.
    pub fn new_from_parts(
        template_main: &str,
        template_files: &HashMap<String, String>,
        data: Option<&serde_json::Value>,
        fonts: Arc<FontLoader>,
        assets: HashMap<String, bytes::Bytes>,
    ) -> Result<Self, EngineError> {
        // Build sys.inputs dict from request data
        let inputs = build_inputs(data);
        let library = LazyHash::new(Library::builder().with_inputs(inputs).build());

        let book = LazyHash::new(fonts.font_book().clone());

        // Main file ID
        let main_path = VirtualPath::new(template_main);
        let main_id = FileId::new(None, main_path);

        // Build source map from template files
        let mut sources = HashMap::new();
        for (name, content) in template_files {
            if !is_valid_path(name) {
                return Err(EngineError::InvalidRequest(format!(
                    "Invalid file path: {}",
                    name
                )));
            }

            let path = VirtualPath::new(name);
            let file_id = FileId::new(None, path);
            let source = Source::new(file_id, content.clone());
            sources.insert(file_id, source);
        }

        // Verify main file exists
        if !sources.contains_key(&main_id) {
            return Err(EngineError::InvalidRequest(format!(
                "Main file '{}' not found in template files",
                template_main
            )));
        }

        // Convert bytes::Bytes into Typst Bytes for the virtual filesystem.
        let assets = assets
            .into_iter()
            .map(|(k, v)| (k, Bytes::from(v.to_vec())))
            .collect();

        Ok(Self {
            library,
            book,
            fonts,
            main_id,
            sources,
            assets,
        })
    }
}

impl World for DocuForgeWorld {
    fn library(&self) -> &LazyHash<Library> {
        &self.library
    }

    fn book(&self) -> &LazyHash<FontBook> {
        &self.book
    }

    fn main(&self) -> FileId {
        self.main_id
    }

    fn source(&self, id: FileId) -> FileResult<Source> {
        let path = id.vpath().as_rootless_path();
        let path_str = path.to_string_lossy();

        // Security: reject path traversal
        if !is_valid_path(&path_str) {
            return Err(FileError::AccessDenied);
        }

        self.sources
            .get(&id)
            .cloned()
            .ok_or(FileError::NotFound(path.to_path_buf()))
    }

    fn file(&self, id: FileId) -> FileResult<Bytes> {
        let path = id.vpath().as_rootless_path();
        let path_str = path.to_string_lossy();

        // Security: reject path traversal
        if !is_valid_path(&path_str) {
            return Err(FileError::AccessDenied);
        }

        // Look up in assets by filename
        self.assets
            .get(path_str.as_ref())
            .cloned()
            .ok_or_else(|| FileError::NotFound(path.to_path_buf()))
    }

    fn font(&self, index: usize) -> Option<Font> {
        self.fonts.font(index)
    }

    fn today(&self, offset: Option<i64>) -> Option<Datetime> {
        let now = OffsetDateTime::now_utc();

        let now = if let Some(hours) = offset {
            let offset = UtcOffset::from_hms(hours as i8, 0, 0).ok()?;
            now.to_offset(offset)
        } else {
            now
        };

        Datetime::from_ymd(now.year(), now.month() as u8, now.day())
    }

    fn packages(&self) -> &[(PackageSpec, Option<typst::diag::EcoString>)] {
        // No external packages supported - all content must be in the request
        &[]
    }
}

/// Build sys.inputs dictionary from request data.
fn build_inputs(data: Option<&serde_json::Value>) -> Dict {
    let Some(data) = data else {
        return Dict::new();
    };

    json_to_dict(data)
}

/// Convert a serde_json Value to a Typst Dict.
fn json_to_dict(value: &serde_json::Value) -> Dict {
    let serde_json::Value::Object(map) = value else {
        return Dict::new();
    };

    let mut dict = Dict::new();
    for (key, val) in map {
        dict.insert(key.as_str().into(), json_to_value(val));
    }
    dict
}

/// Convert a serde_json Value to a Typst Value.
fn json_to_value(value: &serde_json::Value) -> Value {
    match value {
        serde_json::Value::Null => Value::None,
        serde_json::Value::Bool(b) => (*b).into_value(),
        serde_json::Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                i.into_value()
            } else if let Some(f) = n.as_f64() {
                f.into_value()
            } else {
                Value::None
            }
        }
        serde_json::Value::String(s) => s.as_str().into_value(),
        serde_json::Value::Array(arr) => {
            let items: Vec<Value> = arr.iter().map(json_to_value).collect();
            items.into_value()
        }
        serde_json::Value::Object(_) => json_to_dict(value).into_value(),
    }
}

/// Validate that a path doesn't contain traversal attacks.
/// Rejects:
/// - Paths starting with /
/// - Paths containing .. in any component
/// - Empty paths
fn is_valid_path(path: &str) -> bool {
    // No empty paths
    if path.is_empty() {
        return false;
    }

    // No absolute paths
    if path.starts_with('/') || path.starts_with('\\') {
        return false;
    }

    // Check each path component for ".."
    for component in path.split(&['/', '\\'][..]) {
        if component == ".." {
            return false;
        }
    }

    true
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::request::Template;
    use serde_json::json;

    fn empty_fonts() -> Arc<FontLoader> {
        Arc::new(FontLoader::empty())
    }

    fn simple_request(main: &str, content: &str) -> RenderRequest {
        let mut files = HashMap::new();
        files.insert(main.to_string(), content.to_string());

        RenderRequest {
            template: Template {
                main: main.to_string(),
                files,
            },
            data: None,
            assets: None,
            options: None,
        }
    }

    #[test]
    fn test_is_valid_path() {
        assert!(is_valid_path("main.typ"));
        assert!(is_valid_path("src/lib.typ"));
        assert!(is_valid_path("deep/nested/file.typ"));

        assert!(!is_valid_path("/etc/passwd"));
        assert!(!is_valid_path("../secret.typ"));
        assert!(!is_valid_path("foo/../bar.typ"));
        assert!(!is_valid_path(".."));
        assert!(!is_valid_path(""));
    }

    #[test]
    fn test_world_creation_simple() {
        let request = simple_request("main.typ", "Hello, World!");
        let world = DocuForgeWorld::new(&request, empty_fonts(), HashMap::new());
        assert!(world.is_ok());
    }

    #[test]
    fn test_world_main_file_missing() {
        let mut files = HashMap::new();
        files.insert("other.typ".to_string(), "content".to_string());

        let request = RenderRequest {
            template: Template {
                main: "main.typ".to_string(),
                files,
            },
            data: None,
            assets: None,
            options: None,
        };

        let result = DocuForgeWorld::new(&request, empty_fonts(), HashMap::new());
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(matches!(err, EngineError::InvalidRequest(_)));
    }

    #[test]
    fn test_world_rejects_path_traversal_in_files() {
        let mut files = HashMap::new();
        files.insert("../secret.typ".to_string(), "evil".to_string());
        files.insert("main.typ".to_string(), "ok".to_string());

        let request = RenderRequest {
            template: Template {
                main: "main.typ".to_string(),
                files,
            },
            data: None,
            assets: None,
            options: None,
        };

        let result = DocuForgeWorld::new(&request, empty_fonts(), HashMap::new());
        assert!(result.is_err());
    }

    #[test]
    fn test_source_lookup() {
        let request = simple_request("main.typ", "Hello!");
        let world = DocuForgeWorld::new(&request, empty_fonts(), HashMap::new()).unwrap();

        let source = world.source(world.main());
        assert!(source.is_ok());
        assert_eq!(source.unwrap().text(), "Hello!");
    }

    #[test]
    fn test_source_not_found() {
        let request = simple_request("main.typ", "Hello!");
        let world = DocuForgeWorld::new(&request, empty_fonts(), HashMap::new()).unwrap();

        let missing_id = FileId::new(None, VirtualPath::new("missing.typ"));
        let result = world.source(missing_id);
        assert!(result.is_err());
    }

    #[test]
    fn test_file_lookup_asset() {
        let request = simple_request("main.typ", "Hello!");
        let mut assets = HashMap::new();
        assets.insert(
            "logo.png".to_string(),
            bytes::Bytes::from_static(b"\x89PNG"),
        );

        let world = DocuForgeWorld::new(&request, empty_fonts(), assets).unwrap();

        let file_id = FileId::new(None, VirtualPath::new("logo.png"));
        let result = world.file(file_id);
        assert!(result.is_ok());
        assert!(result.unwrap().starts_with(b"\x89PNG"));
    }

    #[test]
    fn test_file_not_found() {
        let request = simple_request("main.typ", "Hello!");
        let world = DocuForgeWorld::new(&request, empty_fonts(), HashMap::new()).unwrap();

        let file_id = FileId::new(None, VirtualPath::new("missing.png"));
        let result = world.file(file_id);
        assert!(result.is_err());
    }

    #[test]
    fn test_json_to_value_string() {
        let val = json_to_value(&json!("hello"));
        assert_eq!(val, "hello".into_value());
    }

    #[test]
    fn test_json_to_value_number() {
        let val = json_to_value(&json!(42));
        assert_eq!(val, 42i64.into_value());
    }

    #[test]
    fn test_json_to_value_bool() {
        let val = json_to_value(&json!(true));
        assert_eq!(val, true.into_value());
    }

    #[test]
    fn test_json_to_value_array() {
        let val = json_to_value(&json!([1, 2, 3]));
        let expected = vec![1i64.into_value(), 2i64.into_value(), 3i64.into_value()].into_value();
        assert_eq!(val, expected);
    }

    #[test]
    fn test_json_to_dict() {
        let obj = json!({"name": "Alice", "age": 30});
        let dict = json_to_dict(&obj);
        assert_eq!(dict.get("name").ok().cloned(), Some("Alice".into_value()));
        assert_eq!(dict.get("age").ok().cloned(), Some(30i64.into_value()));
    }

    #[test]
    fn test_today_returns_datetime() {
        let request = simple_request("main.typ", "Hello!");
        let world = DocuForgeWorld::new(&request, empty_fonts(), HashMap::new()).unwrap();

        let today = world.today(None);
        assert!(today.is_some());
    }
}
