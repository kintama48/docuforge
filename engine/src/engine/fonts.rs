use std::path::Path;

use tracing::{debug, info, warn};
use typst::foundations::Bytes;
use typst::text::{Font, FontBook, FontInfo};

use crate::error::EngineError;

/// Holds loaded fonts and provides access to them for the Typst World trait.
#[derive(Clone, Debug)]
pub struct FontLoader {
    book: FontBook,
    fonts: Vec<Font>,
}

impl FontLoader {
    /// Load all fonts from a directory recursively.
    /// Scans for .ttf, .otf, and .ttc files.
    pub fn load_from_directory(path: &Path) -> Result<Self, EngineError> {
        if !path.exists() {
            return Err(EngineError::Internal(format!(
                "Font directory does not exist: {}",
                path.display()
            )));
        }

        if !path.is_dir() {
            return Err(EngineError::Internal(format!(
                "Font path is not a directory: {}",
                path.display()
            )));
        }

        let mut fonts = Vec::new();
        let mut infos = Vec::new();

        Self::scan_directory(path, &mut fonts, &mut infos)?;

        if fonts.is_empty() {
            return Err(EngineError::Internal(format!(
                "No fonts found in directory: {}",
                path.display()
            )));
        }

        info!(count = fonts.len(), "Fonts loaded");

        Ok(Self {
            book: FontBook::from_infos(infos),
            fonts,
        })
    }

    /// Create an empty font loader (for testing or when no fonts are needed).
    pub fn empty() -> Self {
        Self {
            book: FontBook::default(),
            fonts: Vec::new(),
        }
    }

    /// Get a reference to the font book.
    pub fn font_book(&self) -> &FontBook {
        &self.book
    }

    /// Get a font by index.
    pub fn font(&self, index: usize) -> Option<Font> {
        self.fonts.get(index).cloned()
    }

    /// Get the number of loaded fonts.
    pub fn len(&self) -> usize {
        self.fonts.len()
    }

    /// Check if no fonts are loaded.
    pub fn is_empty(&self) -> bool {
        self.fonts.is_empty()
    }

    /// Recursively scan a directory for font files.
    fn scan_directory(
        dir: &Path,
        fonts: &mut Vec<Font>,
        infos: &mut Vec<FontInfo>,
    ) -> Result<(), EngineError> {
        let entries = std::fs::read_dir(dir).map_err(|e| {
            EngineError::Internal(format!("Failed to read directory {}: {}", dir.display(), e))
        })?;

        for entry in entries {
            let entry = match entry {
                Ok(e) => e,
                Err(e) => {
                    warn!(error = %e, "Failed to read directory entry");
                    continue;
                }
            };

            let path = entry.path();

            if path.is_dir() {
                Self::scan_directory(&path, fonts, infos)?;
                continue;
            }

            if !Self::is_font_file(&path) {
                continue;
            }

            if let Err(e) = Self::load_font_file(&path, fonts, infos) {
                warn!(path = %path.display(), error = %e, "Failed to load font file");
            }
        }

        Ok(())
    }

    /// Check if a file has a font extension.
    fn is_font_file(path: &Path) -> bool {
        match path.extension().and_then(|e| e.to_str()) {
            Some(ext) => matches!(ext.to_lowercase().as_str(), "ttf" | "otf" | "ttc"),
            None => false,
        }
    }

    /// Load fonts from a single file. A file may contain multiple fonts (e.g., .ttc).
    fn load_font_file(
        path: &Path,
        fonts: &mut Vec<Font>,
        infos: &mut Vec<FontInfo>,
    ) -> Result<(), EngineError> {
        let data = std::fs::read(path).map_err(|e| {
            EngineError::Internal(format!(
                "Failed to read font file {}: {}",
                path.display(),
                e
            ))
        })?;

        let bytes = Bytes::from(data);
        let mut loaded = 0;

        for font in Font::iter(bytes) {
            infos.push(font.info().clone());
            fonts.push(font);
            loaded += 1;
        }

        if loaded > 0 {
            debug!(path = %path.display(), count = loaded, "Loaded font file");
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_empty_font_loader() {
        let loader = FontLoader::empty();
        assert!(loader.is_empty());
        assert_eq!(loader.len(), 0);
        assert!(loader.font(0).is_none());
    }

    #[test]
    fn test_load_from_nonexistent_directory() {
        let result = FontLoader::load_from_directory(Path::new("/nonexistent/path"));
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(matches!(err, EngineError::Internal(_)));
    }

    #[test]
    fn test_load_from_empty_directory() {
        let temp_dir = TempDir::new().unwrap();
        let result = FontLoader::load_from_directory(temp_dir.path());
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(matches!(err, EngineError::Internal(_)));
    }

    #[test]
    fn test_load_from_file_not_directory() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        std::fs::write(&file_path, "not a directory").unwrap();

        let result = FontLoader::load_from_directory(&file_path);
        assert!(result.is_err());
    }

    #[test]
    fn test_is_font_file() {
        assert!(FontLoader::is_font_file(Path::new("test.ttf")));
        assert!(FontLoader::is_font_file(Path::new("test.TTF")));
        assert!(FontLoader::is_font_file(Path::new("test.otf")));
        assert!(FontLoader::is_font_file(Path::new("test.OTF")));
        assert!(FontLoader::is_font_file(Path::new("test.ttc")));
        assert!(FontLoader::is_font_file(Path::new("test.TTC")));
        assert!(!FontLoader::is_font_file(Path::new("test.txt")));
        assert!(!FontLoader::is_font_file(Path::new("test")));
    }

    #[test]
    fn test_load_from_assets_directory() {
        let fonts_dir = Path::new("./assets/fonts");
        if !fonts_dir.exists() {
            return;
        }
        let loader = FontLoader::load_from_directory(fonts_dir).unwrap();
        assert!(!loader.is_empty());
        assert!(loader.len() > 0);
        assert!(loader.font(0).is_some());
    }

    #[test]
    fn test_scan_directory_and_load_font_file_with_dummy_font() {
        let temp_dir = TempDir::new().unwrap();
        let fake_font = temp_dir.path().join("fake.ttf");
        std::fs::write(&fake_font, b"not-a-real-font").unwrap();

        let mut fonts = Vec::new();
        let mut infos = Vec::new();
        let result = FontLoader::scan_directory(temp_dir.path(), &mut fonts, &mut infos);

        assert!(result.is_ok());
        assert!(fonts.is_empty());
        assert!(infos.is_empty());
    }

    #[test]
    fn test_scan_directory_returns_error_for_file_path() {
        let temp_dir = TempDir::new().unwrap();
        let not_a_dir = temp_dir.path().join("not-a-dir.ttf");
        std::fs::write(&not_a_dir, b"not-a-dir").unwrap();

        let mut fonts = Vec::new();
        let mut infos = Vec::new();
        let result = FontLoader::scan_directory(&not_a_dir, &mut fonts, &mut infos);

        assert!(result.is_err());
    }

    #[test]
    fn test_load_font_file_returns_error_for_missing_path() {
        let temp_dir = TempDir::new().unwrap();
        let missing = temp_dir.path().join("missing-font.ttf");

        let mut fonts = Vec::new();
        let mut infos = Vec::new();
        let result = FontLoader::load_font_file(&missing, &mut fonts, &mut infos);

        assert!(result.is_err());
    }
}
