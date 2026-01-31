# Phase 2: Rust Engine Specification

## Document Purpose

This specification provides everything your Claude Code agent needs to scaffold and implement the `docuforge-engine` Rust service. No code is included—only requirements, structure, and behavior definitions.

---

## 1. Project Identity

| Attribute | Value |
|-----------|-------|
| Crate Name | `docuforge-engine` |
| Type | Binary (long-running HTTP daemon) |
| Rust Edition | 2021 |
| MSRV | 1.75+ (for async trait stability) |
| License | MIT or your preference |

---

## 2. Directory Structure

```
docuforge-engine/
├── Cargo.toml
├── Cargo.lock
├── README.md
├── .gitignore
├── .env.example
├── assets/
│   └── fonts/
│       └── .gitkeep           # Fonts loaded at startup
├── src/
│   ├── main.rs                # Entry point, server bootstrap
│   ├── config.rs              # Environment/config loading
│   ├── server.rs              # Axum router setup
│   ├── handlers/
│   │   ├── mod.rs
│   │   ├── render.rs          # POST /render handler
│   │   └── health.rs          # GET /health handler
│   ├── engine/
│   │   ├── mod.rs
│   │   ├── world.rs           # Custom Typst World implementation
│   │   ├── compiler.rs        # Compilation orchestration
│   │   └── fonts.rs           # Font loading and FontBook management
│   ├── cache/
│   │   ├── mod.rs
│   │   ├── asset_cache.rs     # Hybrid RAM/Disk asset cache
│   │   └── font_cache.rs      # Thread-safe font registry
│   ├── models/
│   │   ├── mod.rs
│   │   ├── request.rs         # RenderRequest struct
│   │   ├── response.rs        # Success/Error response types
│   │   └── asset.rs           # Asset metadata struct
│   └── error.rs               # Custom error types
├── tests/
│   └── integration/
│       └── render_tests.rs    # End-to-end render tests
└── docker/
    └── Dockerfile             # Production container build
```

---

## 3. Dependencies Specification

### Core Dependencies

| Crate | Version | Purpose |
|-------|---------|---------|
| `axum` | 0.7.x | HTTP framework |
| `tokio` | 1.x (full features) | Async runtime |
| `tower-http` | 0.5.x | Middleware (timeout, body limits) |
| `serde` | 1.x (with derive) | Serialization |
| `serde_json` | 1.x | JSON parsing |
| `typst` | 0.12.x | **Pin exactly** - Core compiler |
| `typst-pdf` | 0.12.x | **Pin exactly** - PDF export |
| `comemo` | 0.4.x | Typst's memoization (required) |

### Supporting Dependencies

| Crate | Purpose |
|-------|---------|
| `base64` | Decode inline images from request |
| `reqwest` | Fetch remote assets (with rustls) |
| `sha2` | Hash assets for cache keys |
| `time` | Deterministic timestamps for Typst |
| `tracing` + `tracing-subscriber` | Structured logging |
| `dotenvy` | Load .env files |
| `thiserror` | Error type derivation |
| `parking_lot` | Faster RwLock than std |

### Dev Dependencies

| Crate | Purpose |
|-------|---------|
| `tokio-test` | Async test utilities |
| `tower` | Test service utilities |

---

## 4. Configuration Schema

The service reads configuration from environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HOST` | No | `127.0.0.1` | Bind address |
| `PORT` | No | `3001` | Bind port |
| `FONT_DIR` | No | `./assets/fonts` | Directory to scan for fonts on startup |
| `CACHE_DIR` | No | `/tmp/docuforge-cache` | Disk cache location |
| `RENDER_TIMEOUT_MS` | No | `2000` | Max render time before kill |
| `MAX_BODY_SIZE_MB` | No | `10` | Request body limit |
| `LOG_LEVEL` | No | `info` | Tracing filter level |
| `LOG_FORMAT` | No | `pretty` | `pretty` or `json` |

---

## 5. API Specification

### 5.1 Health Check

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Path | `/health` |
| Purpose | Liveness/readiness probe |

**Response (200 OK):**
```
Content-Type: application/json

{
  "status": "healthy",
  "fonts_loaded": 42,
  "cached_assets": 15,
  "uptime_seconds": 3600
}
```

### 5.2 Render PDF

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Path | `/render` |
| Content-Type | `application/json` |
| Max Body | 10MB |

**Request Schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `main_file` | string | Yes | Entry point filename (e.g., `"main.typ"`) |
| `files` | object | Yes | Map of filename → content (UTF-8 strings) |
| `inputs` | object | No | Key-value pairs injected as Typst `sys.inputs` |
| `assets` | array | No | External assets to fetch/cache |

**Asset Object Schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Filename referenced in Typst (e.g., `"logo.png"`) |
| `url` | string | Yes | Presigned URL to fetch from |
| `hash` | string | Yes | SHA-256 hex string for cache key |

**Success Response (200 OK):**
```
Content-Type: application/pdf
Content-Disposition: inline

<binary PDF bytes>
```

**Error Response (400 Bad Request):**
```
Content-Type: application/json

{
  "error": "compilation_failed",
  "message": "Unknown variable 'tital'",
  "span": {
    "file": "main.typ",
    "line": 10,
    "column": 5
  }
}
```

**Error Response (408 Request Timeout):**
```
{
  "error": "timeout",
  "message": "Render exceeded 2000ms limit"
}
```

**Error Response (422 Unprocessable Entity):**
```
{
  "error": "invalid_request",
  "message": "Missing required field: main_file"
}
```

---

## 6. Core Components Specification

### 6.1 Font Loader (`engine/fonts.rs`)

**Startup Behavior:**
1. Scan `FONT_DIR` recursively for `.ttf`, `.otf`, `.ttc` files
2. Parse each font file, extract font family/weight/style metadata
3. Build a `FontBook` (Typst's font registry structure)
4. Store in a thread-safe container (`Arc<RwLock<FontBook>>`)
5. Log count of loaded fonts
6. **Panic if directory is empty or unreadable** (fail-fast)

**Required System Fonts:**
- The agent should include instructions to download at minimum:
  - Inter (variable weight)
  - Roboto (regular, bold, italic)
  - JetBrains Mono (for code)

### 6.2 Asset Cache (`cache/asset_cache.rs`)

**Two-Tier Caching Strategy:**

| Tier | Location | Key | Eviction |
|------|----------|-----|----------|
| L1 (Hot) | RAM | SHA-256 hash | LRU, max 100MB |
| L2 (Warm) | Disk (`CACHE_DIR`) | `{hash}.bin` | None (manual cleanup) |

**Lookup Flow:**
1. Check L1 (RAM) by hash → return if found
2. Check L2 (Disk) by hash → load to L1, return if found
3. Fetch from URL → save to L2 → load to L1 → return
4. On fetch failure → return error (do not cache failures)

**Thread Safety:**
- L1 cache must use `Arc<RwLock<HashMap>>` or a concurrent cache crate
- Multiple requests for the same uncached asset should coalesce (only one fetch)

### 6.3 DocuForge World (`engine/world.rs`)

**Purpose:** Implement Typst's `World` trait to provide a virtual filesystem.

**Trait Methods to Implement:**

| Method | Behavior |
|--------|----------|
| `library()` | Return standard Typst library |
| `book()` | Return reference to the `FontBook` |
| `main()` | Return the `main_file` from request |
| `source(id)` | Look up file content from the `files` map |
| `file(id)` | Look up binary content (images) from `files` or `assets` cache |
| `font(index)` | Return font data by index |
| `today(offset)` | Return deterministic date (use `time` crate) |

**Security Rules:**
- `source()` and `file()` must **only** return content from the request payload or cached assets
- Any path traversal attempt (e.g., `../`, absolute paths) must return "file not found"
- Never access the real filesystem during compilation

### 6.4 Compiler Orchestrator (`engine/compiler.rs`)

**Responsibilities:**
1. Construct a `DocuForgeWorld` from the request
2. Call `typst::compile(&world)` with timeout wrapper
3. On success: call `typst_pdf::pdf()` to export
4. On failure: extract and format error spans
5. Return result to handler

**Timeout Implementation:**
- Use `tokio::time::timeout` around the compile call
- If exceeded, abort and return 408
- Consider using `spawn_blocking` since Typst compilation is CPU-bound

---

## 7. Error Handling Specification

### Error Categories

| Category | HTTP Status | When |
|----------|-------------|------|
| `invalid_request` | 422 | Malformed JSON, missing fields |
| `compilation_failed` | 400 | Typst syntax/semantic errors |
| `asset_fetch_failed` | 502 | Cannot download external asset |
| `timeout` | 408 | Render exceeded time limit |
| `internal` | 500 | Unexpected panics, system errors |

### Error Response Structure

All errors must return JSON with:
- `error`: Machine-readable error code (snake_case)
- `message`: Human-readable description
- `span` (optional): File location for compilation errors
- `details` (optional): Additional context

---

## 8. Logging Specification

### Required Log Events

| Event | Level | Fields |
|-------|-------|--------|
| Server startup | INFO | host, port, fonts_loaded |
| Request received | DEBUG | request_id, main_file |
| Cache hit (L1) | DEBUG | asset_hash, tier="ram" |
| Cache hit (L2) | DEBUG | asset_hash, tier="disk" |
| Cache miss (fetch) | INFO | asset_hash, url, duration_ms |
| Compilation start | DEBUG | request_id, file_count |
| Compilation success | INFO | request_id, duration_ms, page_count |
| Compilation error | WARN | request_id, error_message, span |
| Timeout | WARN | request_id, limit_ms |

### Log Format

- Development: Human-readable (`tracing_subscriber::fmt::format::Pretty`)
- Production: JSON lines for log aggregation

---

## 9. Testing Requirements

### Unit Tests

| Module | Test Cases |
|--------|------------|
| `config` | Default values, env override, validation |
| `asset_cache` | L1 hit, L2 hit, cold fetch, concurrent access |
| `world` | File lookup, path traversal rejection, missing file |
| `fonts` | Load directory, empty directory panic |

### Integration Tests

| Test | Description |
|------|-------------|
| `render_simple` | POST minimal Typst, expect PDF bytes |
| `render_with_data` | POST with `inputs`, verify data substitution |
| `render_with_image` | POST with base64 image in `files` |
| `render_missing_var` | POST with undefined variable, expect 400 |
| `render_timeout` | POST infinite loop code, expect 408 |
| `health_check` | GET /health, verify JSON structure |

### Test Fixtures

Create sample Typst files in `tests/fixtures/`:
- `minimal.typ` - Single line: `Hello, World!`
- `invoice.typ` - Uses `sys.inputs` for data
- `with_image.typ` - References `#image("logo.png")`
- `infinite_loop.typ` - `#while true {}` for timeout testing

---

## 10. Docker Specification

### Build Strategy

- **Multi-stage build**: Rust builder → minimal runtime
- **Base image**: `rust:1.75-slim` for build, `debian:bookworm-slim` for runtime
- **Static linking**: Not required (use dynamic linking with glibc)

### Runtime Requirements

| Requirement | Value |
|-------------|-------|
| Non-root user | Create `docuforge` user (UID 1000) |
| Working directory | `/app` |
| Font directory | `/app/assets/fonts` (copy from build) |
| Cache directory | `/tmp/docuforge-cache` (tmpfs recommended) |
| Exposed port | 3001 |

### Health Check

```
HEALTHCHECK CMD curl -f http://localhost:3001/health || exit 1
```

### Environment Defaults in Container

- `HOST=0.0.0.0` (allow external connections within Docker network)
- `LOG_FORMAT=json`

---

## 11. Security Constraints

| Constraint | Implementation |
|------------|----------------|
| No filesystem access | World trait rejects all paths not in request |
| No network access | Typst code cannot make HTTP requests |
| CPU limit | Timeout kills long-running compiles |
| Memory limit | Set via Docker `--memory` flag |
| No shell execution | Typst has no shell/exec commands |
| Input validation | Reject payloads > MAX_BODY_SIZE |

---

## 12. Performance Targets

| Metric | Target | How to Verify |
|--------|--------|---------------|
| Startup time | < 500ms | Log timestamp delta |
| Cold render (no assets) | < 50ms | Integration test timing |
| Warm render (cached) | < 30ms | Integration test timing |
| Memory baseline | < 100MB RSS | `docker stats` |
| Memory under load | < 200MB RSS | Load test with 10 concurrent |
| Throughput | 50 req/sec | `wrk` or `hey` benchmark |

---

## 13. Agent Instructions Summary

Provide these key directives to Claude Code:

1. **Initialize the project** with `cargo new docuforge-engine`

2. **Set up dependencies** in Cargo.toml with exact versions pinned for `typst` and `typst-pdf`

3. **Create the module structure** as specified in Section 2

4. **Implement in this order:**
   - Config loading (environment variables)
   - Font loader (startup initialization)
   - Asset cache (two-tier with LRU)
   - DocuForge World (Typst trait implementation)
   - Compiler orchestrator (with timeout)
   - HTTP handlers (health, render)
   - Server bootstrap (main.rs)

5. **Add logging** with tracing from the start

6. **Write tests** alongside implementation

7. **Create Dockerfile** last, after local testing works

8. **Download fonts** - Agent should fetch Inter, Roboto, JetBrains Mono to `assets/fonts/`

---

## 14. Verification Checklist

Before considering this phase complete:

- [ ] `cargo build --release` succeeds
- [ ] `cargo test` passes all tests
- [ ] Server starts and logs font count
- [ ] `curl localhost:3001/health` returns JSON
- [ ] `curl -X POST localhost:3001/render -d '{"main_file":"main.typ","files":{"main.typ":"Hello"}}' --output test.pdf` produces valid PDF
- [ ] PDF opens correctly in Preview/browser
- [ ] Timeout test returns 408, not hang
- [ ] Docker image builds and runs
- [ ] Memory stays under 200MB during basic load

---

You're absolutely right. The engine should be dead simple: **Template + Data + Assets → PDF**. Nothing more.

Let me revise the spec with comprehensive testing and a clearer "dumb pipe" philosophy.

---

# Phase 2: Rust Engine Specification (Revised)

## Document Purpose

This specification provides everything your Claude Code agent needs to build `docuforge-engine` — a **single-purpose PDF rendering service**. It receives everything it needs in one request and returns a PDF. No state, no complexity.

---

## 1. Design Philosophy

### The "Dumb Pipe" Principle

```
┌─────────────────────────────────────────────────────────┐
│                     ONE REQUEST                         │
│                                                         │
│  Template (Typst source)                                │
│  + Data (JSON for variable substitution)                │
│  + Assets (fonts, images as base64 or URLs)             │
│  + Options (page size, timeout, etc.)                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│               docuforge-engine                          │
│                                                         │
│  • No database                                          │
│  • No authentication                                    │
│  • No template storage                                  │
│  • No user management                                   │
│  • Just compilation                                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                     ONE RESPONSE                        │
│                                                         │
│  Success: Raw PDF bytes                                 │
│  Failure: Structured error with line/column            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### What This Engine Does NOT Do

- ❌ Store templates
- ❌ Manage users or API keys
- ❌ Track usage or billing
- ❌ Queue jobs asynchronously
- ❌ Cache compiled PDFs
- ❌ Validate business logic

### What This Engine DOES Do

- ✅ Accept Typst source + JSON data + assets in one request
- ✅ Compile to PDF
- ✅ Return PDF bytes or structured error
- ✅ Enforce timeout to prevent infinite loops
- ✅ Cache fonts and assets in memory for performance (internal optimization only)

---

## 2. Project Identity

| Attribute | Value |
|-----------|-------|
| Crate Name | `docuforge-engine` |
| Type | Binary (HTTP daemon) |
| Rust Edition | 2021 |
| MSRV | 1.75+ |

---

## 3. Directory Structure

```
docuforge-engine/
├── Cargo.toml
├── Cargo.lock
├── README.md
├── .gitignore
├── .env.example
├── assets/
│   └── fonts/                    # System fonts loaded at startup
│       ├── Inter-Regular.ttf
│       ├── Inter-Bold.ttf
│       ├── Roboto-Regular.ttf
│       ├── Roboto-Bold.ttf
│       ├── Roboto-Italic.ttf
│       └── JetBrainsMono-Regular.ttf
├── src/
│   ├── main.rs                   # Entry point
│   ├── config.rs                 # Environment config
│   ├── server.rs                 # Axum router
│   ├── handlers/
│   │   ├── mod.rs
│   │   ├── render.rs             # POST /render
│   │   └── health.rs             # GET /health
│   ├── engine/
│   │   ├── mod.rs
│   │   ├── world.rs              # Typst World trait implementation
│   │   ├── compiler.rs           # Compile orchestration + timeout
│   │   └── fonts.rs              # Font loading
│   ├── cache/
│   │   ├── mod.rs
│   │   └── asset_cache.rs        # In-memory asset cache (LRU)
│   ├── models/
│   │   ├── mod.rs
│   │   ├── request.rs            # RenderRequest
│   │   └── response.rs           # RenderResponse, RenderError
│   └── error.rs                  # Error types
├── tests/
│   ├── unit/
│   │   ├── mod.rs
│   │   ├── config_test.rs
│   │   ├── world_test.rs
│   │   ├── compiler_test.rs
│   │   ├── fonts_test.rs
│   │   └── asset_cache_test.rs
│   ├── integration/
│   │   ├── mod.rs
│   │   ├── health_test.rs
│   │   ├── render_simple_test.rs
│   │   ├── render_with_data_test.rs
│   │   ├── render_with_image_test.rs
│   │   ├── render_with_font_test.rs
│   │   ├── render_multifile_test.rs
│   │   ├── render_error_test.rs
│   │   └── render_timeout_test.rs
│   └── fixtures/
│       ├── templates/
│       │   ├── minimal.typ
│       │   ├── hello_name.typ
│       │   ├── invoice.typ
│       │   ├── with_image.typ
│       │   ├── with_custom_font.typ
│       │   ├── multifile_main.typ
│       │   ├── multifile_header.typ
│       │   ├── syntax_error.typ
│       │   ├── missing_variable.typ
│       │   └── infinite_loop.typ
│       ├── data/
│       │   ├── empty.json
│       │   ├── simple.json
│       │   └── invoice_data.json
│       ├── images/
│       │   ├── logo.png
│       │   └── signature.png
│       └── fonts/
│           └── CustomFont.ttf
└── docker/
    └── Dockerfile
```

---

## 4. Dependencies

### Core

| Crate | Version | Purpose |
|-------|---------|---------|
| `axum` | 0.7.x | HTTP framework |
| `tokio` | 1.x (full) | Async runtime |
| `tower-http` | 0.5.x | Middleware (timeout, body limit, cors) |
| `serde` | 1.x (derive) | Serialization |
| `serde_json` | 1.x | JSON parsing |
| `typst` | **0.12.x** | Core compiler (PIN THIS) |
| `typst-pdf` | **0.12.x** | PDF export (PIN THIS) |
| `comemo` | 0.4.x | Memoization (required by Typst) |

### Supporting

| Crate | Purpose |
|-------|---------|
| `base64` | Decode inline assets |
| `sha2` | Hash assets for cache keys |
| `time` | Deterministic timestamps |
| `tracing` + `tracing-subscriber` | Structured logging |
| `dotenvy` | Load .env |
| `thiserror` | Error derivation |
| `parking_lot` | Fast RwLock |
| `moka` | Concurrent LRU cache |
| `reqwest` (rustls) | Fetch remote assets |
| `bytes` | Efficient byte handling |

### Dev/Test

| Crate | Purpose |
|-------|---------|
| `tokio-test` | Async test utilities |
| `axum-test` | HTTP handler testing |
| `tower` | Service testing |
| `pretty_assertions` | Better test diffs |
| `tempfile` | Temporary test files |
| `wiremock` | Mock HTTP servers for asset fetching |

---

## 5. Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HOST` | No | `127.0.0.1` | Bind address |
| `PORT` | No | `3001` | Bind port |
| `FONT_DIR` | No | `./assets/fonts` | System fonts directory |
| `RENDER_TIMEOUT_MS` | No | `5000` | Max render time |
| `MAX_BODY_SIZE_MB` | No | `50` | Request body limit |
| `ASSET_CACHE_SIZE_MB` | No | `100` | In-memory asset cache |
| `LOG_LEVEL` | No | `info` | Tracing level |
| `LOG_FORMAT` | No | `pretty` | `pretty` or `json` |

---

## 6. API Specification

### 6.1 Health Check

```
GET /health
```

**Response (200):**
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "fonts_loaded": 6,
  "uptime_seconds": 3600
}
```

### 6.2 Render PDF

```
POST /render
Content-Type: application/json
```

**Request Schema:**

```json
{
  "template": {
    "main": "main.typ",
    "files": {
      "main.typ": "#import \"header.typ\": *\n\nHello, #sys.inputs.name!",
      "header.typ": "#let company = \"Acme Inc\""
    }
  },
  "data": {
    "name": "World",
    "invoice_id": "INV-001",
    "items": [
      { "description": "Widget", "price": 9.99 }
    ]
  },
  "assets": [
    {
      "name": "logo.png",
      "content": "base64-encoded-string-here"
    },
    {
      "name": "signature.png", 
      "url": "https://cdn.example.com/sig.png",
      "hash": "sha256-abc123"
    },
    {
      "name": "CustomFont.ttf",
      "content": "base64-encoded-font"
    }
  ],
  "options": {
    "timeout_ms": 3000,
    "pdf_standard": "1.7"
  }
}
```

**Field Definitions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `template.main` | string | Yes | Entry point filename |
| `template.files` | object | Yes | Map of filename → Typst source |
| `data` | object | No | Injected as `sys.inputs` in Typst |
| `assets` | array | No | Images and fonts |
| `assets[].name` | string | Yes | Filename referenced in Typst |
| `assets[].content` | string | No* | Base64-encoded content |
| `assets[].url` | string | No* | URL to fetch from |
| `assets[].hash` | string | No | SHA-256 for cache lookup |
| `options.timeout_ms` | number | No | Override default timeout |
| `options.pdf_standard` | string | No | "1.4", "1.5", "1.6", "1.7", "2.0" |

*Either `content` or `url` must be provided for each asset.

**Success Response (200):**
```
Content-Type: application/pdf
Content-Disposition: inline; filename="document.pdf"

<binary PDF bytes>
```

**Error Responses:**

| Status | Error Code | When |
|--------|------------|------|
| 400 | `compilation_failed` | Typst syntax/semantic error |
| 408 | `timeout` | Render exceeded time limit |
| 422 | `invalid_request` | Malformed JSON, missing fields |
| 502 | `asset_fetch_failed` | Cannot download remote asset |
| 500 | `internal_error` | Unexpected failure |

**Error Response Body:**
```json
{
  "error": "compilation_failed",
  "message": "Unknown variable 'nmae'",
  "span": {
    "file": "main.typ",
    "line": 5,
    "column": 12
  },
  "hint": "Did you mean 'name'?"
}
```

---

## 7. Test Specification

### 7.1 Test Philosophy

- **Every public function has unit tests**
- **Every endpoint has integration tests**
- **Every error path is tested**
- **Tests are the documentation**

### 7.2 Unit Tests

#### `config_test.rs`

| Test | Description |
|------|-------------|
| `test_default_config` | All defaults are sane |
| `test_env_override` | Environment variables override defaults |
| `test_invalid_port` | Non-numeric port fails gracefully |
| `test_invalid_timeout` | Zero/negative timeout rejected |

#### `fonts_test.rs`

| Test | Description |
|------|-------------|
| `test_load_fonts_from_directory` | Loads all .ttf/.otf files |
| `test_empty_font_directory_panics` | Fails fast if no fonts |
| `test_corrupt_font_skipped` | Bad font files don't crash |
| `test_font_book_contains_expected` | Inter, Roboto, JetBrains present |
| `test_font_lookup_by_family` | Can retrieve font by name |

#### `asset_cache_test.rs`

| Test | Description |
|------|-------------|
| `test_cache_hit` | Returns cached asset |
| `test_cache_miss` | Returns None for unknown |
| `test_cache_eviction` | LRU eviction works |
| `test_concurrent_access` | Multiple threads safe |
| `test_insert_same_hash_twice` | Deduplication works |

#### `world_test.rs`

| Test | Description |
|------|-------------|
| `test_source_lookup` | Returns file from map |
| `test_source_not_found` | Returns error for missing |
| `test_file_lookup_image` | Returns binary for image |
| `test_file_lookup_font` | Returns binary for font |
| `test_path_traversal_rejected` | `../` paths fail |
| `test_absolute_path_rejected` | `/etc/passwd` fails |
| `test_sys_inputs_injected` | Data available in Typst |

#### `compiler_test.rs`

| Test | Description |
|------|-------------|
| `test_compile_minimal` | "Hello" → PDF bytes |
| `test_compile_with_inputs` | Data substitution works |
| `test_compile_multifile` | Imports work |
| `test_compile_syntax_error` | Returns structured error |
| `test_compile_missing_var` | Returns error with span |
| `test_compile_timeout` | Infinite loop aborts |

### 7.3 Integration Tests

Each test starts a real HTTP server and makes actual requests.

#### `health_test.rs`

| Test | Description |
|------|-------------|
| `test_health_returns_200` | Endpoint responds |
| `test_health_json_structure` | All fields present |
| `test_health_fonts_count` | Fonts loaded correctly |

#### `render_simple_test.rs`

| Test | Description |
|------|-------------|
| `test_render_hello_world` | Minimal template → PDF |
| `test_pdf_is_valid` | Output starts with `%PDF-` |
| `test_pdf_is_not_empty` | More than 0 bytes |
| `test_content_type_header` | Returns `application/pdf` |

**Curl equivalent:**
```bash
curl -X POST http://localhost:3001/render \
  -H "Content-Type: application/json" \
  -d '{
    "template": {
      "main": "main.typ",
      "files": {
        "main.typ": "Hello, World!"
      }
    }
  }' \
  --output hello.pdf
```

#### `render_with_data_test.rs`

| Test | Description |
|------|-------------|
| `test_render_with_simple_data` | String substitution |
| `test_render_with_nested_data` | Object access works |
| `test_render_with_array_data` | Loop over items |
| `test_render_with_empty_data` | Empty object OK |
| `test_render_data_types` | Numbers, booleans work |

**Curl equivalent:**
```bash
curl -X POST http://localhost:3001/render \
  -H "Content-Type: application/json" \
  -d '{
    "template": {
      "main": "main.typ",
      "files": {
        "main.typ": "Hello, #sys.inputs.name! You have #sys.inputs.points points."
      }
    },
    "data": {
      "name": "Alice",
      "points": 42
    }
  }' \
  --output greeting.pdf
```

#### `render_with_image_test.rs`

| Test | Description |
|------|-------------|
| `test_render_with_base64_image` | Inline image works |
| `test_render_with_remote_image` | URL fetch works |
| `test_render_with_cached_image` | Hash lookup works |
| `test_image_not_found` | Missing asset → error |
| `test_invalid_image_format` | Corrupt image → error |

**Curl equivalent:**
```bash
# With base64 image
curl -X POST http://localhost:3001/render \
  -H "Content-Type: application/json" \
  -d '{
    "template": {
      "main": "main.typ",
      "files": {
        "main.typ": "#image(\"logo.png\", width: 50%)"
      }
    },
    "assets": [
      {
        "name": "logo.png",
        "content": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
      }
    ]
  }' \
  --output with_logo.pdf
```

#### `render_with_font_test.rs`

| Test | Description |
|------|-------------|
| `test_render_with_system_font` | Inter, Roboto work |
| `test_render_with_custom_font` | Uploaded font works |
| `test_font_fallback` | Missing font → default |
| `test_font_styles` | Bold, italic variants |

**Curl equivalent:**
```bash
curl -X POST http://localhost:3001/render \
  -H "Content-Type: application/json" \
  -d '{
    "template": {
      "main": "main.typ",
      "files": {
        "main.typ": "#set text(font: \"CustomFont\")\nHello in custom font!"
      }
    },
    "assets": [
      {
        "name": "CustomFont.ttf",
        "content": "<base64-encoded-ttf>"
      }
    ]
  }' \
  --output custom_font.pdf
```

#### `render_multifile_test.rs`

| Test | Description |
|------|-------------|
| `test_render_with_import` | `#import` works |
| `test_render_with_include` | `#include` works |
| `test_render_nested_imports` | Multi-level imports |
| `test_circular_import_error` | Detected and reported |
| `test_missing_import_error` | Clear error message |

**Curl equivalent:**
```bash
curl -X POST http://localhost:3001/render \
  -H "Content-Type: application/json" \
  -d '{
    "template": {
      "main": "main.typ",
      "files": {
        "main.typ": "#import \"utils.typ\": format_currency\n\nTotal: #format_currency(99.99)",
        "utils.typ": "#let format_currency(amount) = [$#amount]"
      }
    }
  }' \
  --output multifile.pdf
```

#### `render_error_test.rs`

| Test | Description |
|------|-------------|
| `test_syntax_error_returns_400` | Status code correct |
| `test_syntax_error_has_span` | Line/column in response |
| `test_missing_variable_error` | Helpful message |
| `test_type_error` | Type mismatch reported |
| `test_missing_main_file` | Clear error |
| `test_empty_files_map` | Rejected with message |
| `test_malformed_json` | 422 returned |

**Curl equivalent:**
```bash
curl -X POST http://localhost:3001/render \
  -H "Content-Type: application/json" \
  -d '{
    "template": {
      "main": "main.typ",
      "files": {
        "main.typ": "Hello #sys.inputs.nmae"
      }
    },
    "data": {
      "name": "World"
    }
  }'
# Returns 400 with error details
```

#### `render_timeout_test.rs`

| Test | Description |
|------|-------------|
| `test_infinite_loop_times_out` | 408 returned |
| `test_custom_timeout_respected` | Options override works |
| `test_fast_render_succeeds` | Normal templates OK |
| `test_timeout_error_message` | Clear explanation |

**Curl equivalent:**
```bash
curl -X POST http://localhost:3001/render \
  -H "Content-Type: application/json" \
  -d '{
    "template": {
      "main": "main.typ",
      "files": {
        "main.typ": "#while true {}"
      }
    },
    "options": {
      "timeout_ms": 1000
    }
  }'
# Returns 408 after 1 second
```

### 7.4 Test Fixtures

#### `fixtures/templates/minimal.typ`
```typst
Hello, World!
```

#### `fixtures/templates/hello_name.typ`
```typst
Hello, #sys.inputs.name!
```

#### `fixtures/templates/invoice.typ`
```typst
#set page(paper: "a4")
#set text(font: "Inter")

= Invoice \##sys.inputs.invoice_id

#for item in sys.inputs.items [
  - #item.description: $#item.price
]

*Total: $#sys.inputs.total*
```

#### `fixtures/templates/with_image.typ`
```typst
#align(center)[
  #image("logo.png", width: 50%)
]

Company letterhead with logo.
```

#### `fixtures/templates/infinite_loop.typ`
```typst
#let x = 0
#while true {
  x = x + 1
}
```

#### `fixtures/templates/syntax_error.typ`
```typst
Hello #sys.inputs.name
This line has an unclosed #[bracket
```

#### `fixtures/templates/missing_variable.typ`
```typst
Hello, #sys.inputs.nmae!  // Typo: should be "name"
```

#### `fixtures/data/invoice_data.json`
```json
{
  "invoice_id": "INV-2024-001",
  "items": [
    { "description": "Widget A", "price": 29.99 },
    { "description": "Widget B", "price": 49.99 }
  ],
  "total": 79.98
}
```

### 7.5 Test Commands

```bash
# Run all tests
cargo test

# Run unit tests only
cargo test --lib

# Run integration tests only
cargo test --test '*'

# Run specific test file
cargo test --test render_simple_test

# Run with output
cargo test -- --nocapture

# Run with coverage (requires cargo-tarpaulin)
cargo tarpaulin --out Html
```

### 7.6 CI Test Matrix

The agent should create a GitHub Actions workflow that tests:

| OS | Rust Version | Test Type |
|----|--------------|-----------|
| ubuntu-latest | stable | All |
| ubuntu-latest | 1.75.0 | All |
| macos-latest | stable | All |

---

## 8. End-to-End Validation

When the engine is complete, these curl commands must work:

### Test 1: Minimal PDF
```bash
curl -X POST http://localhost:3001/render \
  -H "Content-Type: application/json" \
  -d '{"template":{"main":"m.typ","files":{"m.typ":"Hello"}}}' \
  -o test1.pdf && file test1.pdf | grep -q "PDF"
```

### Test 2: With Data
```bash
curl -X POST http://localhost:3001/render \
  -H "Content-Type: application/json" \
  -d '{"template":{"main":"m.typ","files":{"m.typ":"Hi #sys.inputs.name"}},"data":{"name":"Claude"}}' \
  -o test2.pdf && pdftotext test2.pdf - | grep -q "Claude"
```

### Test 3: With Image
```bash
# Create 1x1 red PNG as base64
IMG=$(echo 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==' )

curl -X POST http://localhost:3001/render \
  -H "Content-Type: application/json" \
  -d "{\"template\":{\"main\":\"m.typ\",\"files\":{\"m.typ\":\"#image(\\\"i.png\\\")\"}},\"assets\":[{\"name\":\"i.png\",\"content\":\"$IMG\"}]}" \
  -o test3.pdf && file test3.pdf | grep -q "PDF"
```

### Test 4: Compilation Error
```bash
curl -X POST http://localhost:3001/render \
  -H "Content-Type: application/json" \
  -d '{"template":{"main":"m.typ","files":{"m.typ":"#sys.inputs.oops"}}}' \
  -w "\n%{http_code}" | tail -1 | grep -q "400"
```

### Test 5: Timeout
```bash
curl -X POST http://localhost:3001/render \
  -H "Content-Type: application/json" \
  -d '{"template":{"main":"m.typ","files":{"m.typ":"#while true {}"}},"options":{"timeout_ms":500}}' \
  -w "\n%{http_code}" --max-time 5 | tail -1 | grep -q "408"
```

---

## 9. Implementation Order

The agent should build in this sequence:

1. **Project scaffold** — Cargo.toml, directory structure
2. **Config module** — Environment loading + tests
3. **Models** — Request/Response structs
4. **Error types** — All error variants
5. **Font loader** — Load from directory + tests
6. **Asset cache** — LRU cache + tests
7. **World implementation** — Typst trait + tests
8. **Compiler** — Compile with timeout + tests
9. **Health handler** — Simple endpoint + tests
10. **Render handler** — Full pipeline + tests
11. **Server bootstrap** — Wire it all together
12. **Integration tests** — All curl scenarios
13. **Dockerfile** — Production container

---

## 10. Verification Checklist

Before this phase is complete:

- [ ] `cargo build --release` succeeds
- [ ] `cargo test` — all tests pass
- [ ] `cargo clippy` — no warnings
- [ ] `cargo fmt --check` — code formatted
- [ ] Health endpoint returns JSON
- [ ] All 5 curl validation commands pass
- [ ] Timeout test completes (doesn't hang)
- [ ] Error responses have line/column info
- [ ] Docker image builds and runs
- [ ] Memory under 200MB at idle

---

## 11. What This Spec Does NOT Cover

These are handled by the API service (Node/Bun layer):

- Authentication / API keys
- Template storage / database
- Usage tracking / billing
- Rate limiting
- Request logging with user context
- Template validation before storage

The Rust engine is intentionally dumb. The Node layer is the brain.

---

Ready to proceed? Let me know if you want any clarification before handing this to Claude Code.