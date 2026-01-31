use serde::Deserialize;
use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug, Deserialize)]
pub struct RenderRequest {
    pub template: Template,
    pub data: Option<Value>,
    pub assets: Option<Vec<Asset>>,
    pub options: Option<RenderOptions>,
}

#[derive(Debug, Deserialize)]
pub struct Template {
    pub main: String,
    pub files: HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
pub struct Asset {
    pub name: String,
    pub content: Option<String>,
    pub url: Option<String>,
    pub hash: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RenderOptions {
    pub timeout_ms: Option<u64>,
    pub pdf_standard: Option<String>,
}
