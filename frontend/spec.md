# DocuForge Frontend Console — Build Specification

**Component:** Developer Console (SPA)
**Stack:** Next.js + TypeScript + Vite + TailwindCSS + Shadcn/UI
**State:** TanStack Query (server) + Zustand (editor)
**Deployment:** Cloudflare Pages (static)
**Version:** 1.0 — Full-Featured Console for Developer Users

---

## 0. Context For The Agent

You are building the frontend console for DocuForge — a Typst-based PDF generation API. The API layer (`docuforge-api`) is already built and running at `http://localhost:3000`. It handles auth, templates, assets, billing, AI, and rendering. Your job is to build the developer-facing web application that consumes this API.

The frontend is an **IDE-lite**. Developers spend 90% of their time in a Monaco editor writing Typst templates, previewing PDFs in real-time, and managing assets. The remaining 10% is dashboard (template gallery, usage stats, API key management, billing).

### Who Uses This

Primary: SaaS founders and backend engineers who need PDF generation in their apps. They're comfortable with code, prefer dark mode, use keyboard shortcuts, and expect high information density. They don't want a drag-and-drop builder — they want a code editor with a live preview.

### API Base URL

Development: `http://localhost:3000`
Production: `https://api.docuforge.app` (configured via environment variable)

### API Authentication

All dashboard endpoints use JWT in an `Authorization: Bearer <token>` header. The JWT is obtained from `/v1/auth/login` or `/v1/auth/register`. Store it in `localStorage`. On 401 response, redirect to login.

---

## 1. Project Structure

```
docuforge-console/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── components.json              # Shadcn/UI config
├── .env.example
├── .env.local
├── index.html
│
├── public/
│   ├── favicon.svg
│   └── og-image.png
│
├── src/
│   ├── main.tsx                 # React root + providers
│   ├── App.tsx                  # Router + layout
│   │
│   ├── config/
│   │   └── env.ts               # Environment variables
│   │
│   ├── lib/
│   │   ├── api.ts               # Fetch wrapper with auth interceptor
│   │   ├── api-types.ts         # TypeScript types matching API responses
│   │   ├── utils.ts             # cn(), formatDate(), formatBytes(), etc.
│   │   ├── constants.ts         # Plan limits, file types, key prefixes
│   │   └── typst.ts             # Typst Monaco language definition
│   │
│   ├── stores/
│   │   ├── auth.ts              # Zustand: user, token, login/logout
│   │   └── editor.ts            # Zustand: source, files, data, dirty state, active tab
│   │
│   ├── hooks/
│   │   ├── use-auth.ts          # Auth queries + mutations (register, login)
│   │   ├── use-templates.ts     # Template CRUD + versioning queries
│   │   ├── use-render.ts        # Preview render mutation with debounce
│   │   ├── use-assets.ts        # Asset upload, list, delete
│   │   ├── use-usage.ts         # Usage stats query
│   │   ├── use-billing.ts       # Checkout session mutation
│   │   ├── use-api-keys.ts      # Key CRUD queries
│   │   ├── use-ai.ts            # AI edit/generate mutation
│   │   ├── use-keyboard.ts      # Global keyboard shortcut handler
│   │   └── use-debounce.ts      # Debounce utility hook
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx
│   │   ├── editor/
│   │   │   └── EditorPage.tsx
│   │   ├── settings/
│   │   │   └── SettingsPage.tsx
│   │   ├── onboarding/
│   │   │   └── OnboardingPage.tsx
│   │   └── not-found/
│   │       └── NotFoundPage.tsx
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx         # Authenticated layout wrapper
│   │   │   ├── Sidebar.tsx          # Left nav (Dashboard, Templates, Settings)
│   │   │   ├── TopBar.tsx           # Header with user menu + plan badge
│   │   │   └── MobileNav.tsx        # Responsive hamburger nav
│   │   │
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── ProtectedRoute.tsx   # Redirect to login if no token
│   │   │
│   │   ├── dashboard/
│   │   │   ├── TemplateGrid.tsx     # Grid of template cards
│   │   │   ├── TemplateCard.tsx     # Individual card (thumbnail, name, version)
│   │   │   ├── CreateTemplateDialog.tsx  # New template modal
│   │   │   ├── UsageCard.tsx        # Renders used / limit with progress bar
│   │   │   ├── QuickStartCard.tsx   # "Your API Key" + quick curl example
│   │   │   └── OfficialTemplateGallery.tsx  # Browse + fork official templates
│   │   │
│   │   ├── editor/
│   │   │   ├── EditorLayout.tsx     # Three-pane resizable container
│   │   │   ├── MonacoEditor.tsx     # Typst code editor
│   │   │   ├── FileExplorer.tsx     # Multi-file support (main.typ, utils.typ)
│   │   │   ├── PdfPreview.tsx       # PDF viewer (iframe or PDF.js)
│   │   │   ├── DataEditor.tsx       # JSON data input (Monaco JSON mode)
│   │   │   ├── AssetPanel.tsx       # Upload + list assets with drag-drop
│   │   │   ├── DiagnosticsPanel.tsx # Compilation errors with line numbers
│   │   │   ├── VersionHistory.tsx   # Dropdown of published versions
│   │   │   ├── EditorToolbar.tsx    # Publish, download PDF, settings
│   │   │   ├── EditorStatusBar.tsx  # Bottom bar: Draft/Published, cursor pos, render time
│   │   │   └── CommandPalette.tsx   # Ctrl+K modal (search templates, insert snippets)
│   │   │
│   │   ├── ai/
│   │   │   ├── AiDrawer.tsx         # Collapsible AI chat panel
│   │   │   ├── AiPromptInput.tsx    # Text input with send button
│   │   │   ├── AiResponseView.tsx   # Shows generated/modified code with "Apply" button
│   │   │   ├── AiCreditsIndicator.tsx  # "5/5 credits remaining"
│   │   │   └── AiImageUpload.tsx    # Upload screenshot → generate template
│   │   │
│   │   ├── settings/
│   │   │   ├── ApiKeySection.tsx    # List, create, revoke keys
│   │   │   ├── ApiKeyRow.tsx        # Single key row with copy + revoke
│   │   │   ├── PlanSection.tsx      # Current plan + upgrade button
│   │   │   ├── UsageSection.tsx     # Monthly usage chart
│   │   │   └── ProfileSection.tsx   # Email display (future: change password)
│   │   │
│   │   ├── onboarding/
│   │   │   ├── TemplatePickerStep.tsx  # "Pick a starter template"
│   │   │   ├── ApiKeyRevealStep.tsx    # Show API key with copy button
│   │   │   └── QuickStartStep.tsx      # Curl example to render their first PDF
│   │   │
│   │   └── ui/                      # Shadcn/UI components (auto-generated)
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       ├── skeleton.tsx
│   │       ├── tabs.tsx
│   │       ├── toast.tsx
│   │       ├── toaster.tsx
│   │       ├── tooltip.tsx
│   │       ├── badge.tsx
│   │       ├── progress.tsx
│   │       ├── command.tsx           # For command palette
│   │       ├── sheet.tsx             # For mobile nav + AI drawer
│   │       ├── alert-dialog.tsx      # For destructive confirms
│   │       └── resizable.tsx         # For editor panes
│   │
│   ├── styles/
│   │   └── globals.css              # Tailwind directives + custom vars
│   │
│   └── tests/
│       ├── setup.ts                 # Vitest setup with MSW
│       ├── helpers/
│       │   ├── render.tsx           # Custom render with providers
│       │   ├── msw-handlers.ts      # Mock API handlers
│       │   └── fixtures.ts          # Test data
│       │
│       ├── unit/
│       │   ├── api.test.ts          # Fetch wrapper tests
│       │   ├── auth-store.test.ts   # Zustand store logic
│       │   ├── editor-store.test.ts
│       │   ├── use-debounce.test.ts
│       │   └── utils.test.ts
│       │
│       ├── component/
│       │   ├── LoginForm.test.tsx
│       │   ├── RegisterForm.test.tsx
│       │   ├── TemplateCard.test.tsx
│       │   ├── TemplateGrid.test.tsx
│       │   ├── UsageCard.test.tsx
│       │   ├── ApiKeySection.test.tsx
│       │   ├── AssetPanel.test.tsx
│       │   ├── DiagnosticsPanel.test.tsx
│       │   ├── VersionHistory.test.tsx
│       │   ├── AiDrawer.test.tsx
│       │   ├── CommandPalette.test.tsx
│       │   ├── PdfPreview.test.tsx
│       │   └── EditorToolbar.test.tsx
│       │
│       └── integration/
│           ├── auth-flow.test.tsx
│           ├── template-crud.test.tsx
│           ├── editor-render.test.tsx
│           ├── asset-upload.test.tsx
│           ├── billing-flow.test.tsx
│           └── onboarding-flow.test.tsx
│
├── e2e/                             # Playwright (optional, Phase 2)
│   ├── playwright.config.ts
│   ├── auth.spec.ts
│   ├── editor.spec.ts
│   └── dashboard.spec.ts
│
└── scripts/
    └── generate-typst-grammar.ts    # Build Typst syntax tokenizer
```

---

## 2. Dependencies

### Runtime

| Package | Purpose |
|---------|---------|
| `react` + `react-dom` | UI framework |
| `react-router-dom` | Client-side routing |
| `@tanstack/react-query` | Server state management + caching |
| `zustand` | Client state (editor, auth) |
| `@monaco-editor/react` | Code editor (VS Code engine) |
| `monaco-editor` | Core editor (peer dep) |
| `react-resizable-panels` | Three-pane resizable layout |
| `tailwindcss` + `@tailwindcss/typography` | Styling |
| `class-variance-authority` | Shadcn variant helper |
| `clsx` + `tailwind-merge` | Class merging (`cn()`) |
| `@phosphor-icons/react` | Icons |
| `zod` | Form validation schemas |
| `react-hook-form` + `@hookform/resolvers` | Form handling |
| `sonner` | Toast notifications |
| `cmdk` | Command palette |
| `date-fns` | Date formatting |
| `react-dropzone` | Drag-and-drop file upload |

### Dev

| Package | Purpose |
|---------|---------|
| `vite` | Build tool |
| `vitest` + `@testing-library/react` + `@testing-library/jest-dom` | Unit/component testing |
| `msw` | Mock Service Worker for API mocking |
| `@types/react` + `@types/react-dom` | Type defs |
| `typescript` | Compiler |
| `eslint` + `@typescript-eslint/*` | Linting |
| `prettier` + `prettier-plugin-tailwindcss` | Formatting |

**NOTE:** Do NOT install axios. Use native `fetch`. Do NOT install redux, mobx, or jotai. Use Zustand + TanStack Query only. Do NOT install styled-components or emotion. Use Tailwind only.

---

## 3. Configuration

### `.env.example`

```env
VITE_API_URL=http://localhost:3000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_APP_NAME=DocuForge
VITE_APP_URL=http://localhost:5173
```

### `src/config/env.ts`

```typescript
export const env = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  stripeKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
  appName: import.meta.env.VITE_APP_NAME || 'DocuForge',
  appUrl: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
  isDev: import.meta.env.DEV,
} as const;
```

---

## 4. API Client Layer

### `src/lib/api.ts`

A thin fetch wrapper that handles authentication and error normalization.

```typescript
// Conceptual — the agent implements this
class ApiClient {
  private baseUrl: string;
  private getToken: () => string | null;

  // Every request includes:
  //   Authorization: Bearer <token>  (if token exists)
  //   Content-Type: application/json  (for non-GET)

  async get<T>(path: string): Promise<T>;
  async post<T>(path: string, body?: unknown): Promise<T>;
  async put<T>(path: string, body?: unknown): Promise<T>;
  async delete<T>(path: string): Promise<T>;

  // Special: returns raw Response for binary PDF
  async postRaw(path: string, body: unknown): Promise<Response>;
}
```

**Error Handling:**
- On `401`: Clear token from store, redirect to `/login`
- On `402`: Show upgrade prompt toast
- On `422`: Return field-level validation errors
- On `429`: Show "Rate limited — try again in X seconds" toast
- On `5xx`: Show "Something went wrong" toast with retry option

**The API returns errors in this shape:**
```json
{
  "error": "machine_readable_code",
  "message": "Human-readable description",
  "details": {}
}
```

### `src/lib/api-types.ts`

TypeScript types matching every API response. These are the source of truth for the frontend.

```typescript
// Auth
type User = { id: string; email: string; plan: 'free' | 'starter' | 'pro' };
type LoginResponse = { token: string; user: User };
type RegisterResponse = { token: string; user: User; api_key: { raw_key: string; prefix: string; name: string; note: string } };

// Templates
type Template = {
  id: string;
  name: string;
  description: string | null;
  is_official: boolean;
  live_version: TemplateVersion | null;
  created_at: number;
  updated_at: number;
};
type TemplateVersion = {
  id: string;
  version_number: number;
  source: string;
  files: Record<string, string> | null;
  defaults: Record<string, unknown> | null;
  commit_message: string | null;
  created_at: number;
};
type TemplateDetail = Template & {
  live_version: TemplateVersion;
  versions: Array<Omit<TemplateVersion, 'source' | 'files' | 'defaults'>>;
};

// Assets
type Asset = {
  id: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  hash: string;
  created_at: number;
};

// Usage
type UsageResponse = {
  plan: string;
  renders: { used: number; limit: number; remaining: number };
  period: { start: string; end: string };
};

// API Keys
type ApiKey = {
  id: string;
  prefix: string;
  name: string;
  last_used_at: number | null;
  created_at: number;
};

// AI
type AiEditResponse = {
  code: string;
  tokens_used: number;
};

// Errors
type ApiError = {
  error: string;
  message: string;
  details?: Record<string, unknown>;
};
```

---

## 5. State Management

### 5.1 Auth Store (`stores/auth.ts`)

Zustand store for authentication state. Persists to `localStorage`.

```
State:
  token: string | null
  user: User | null

Actions:
  login(token, user)      → Set token + user, save to localStorage
  logout()                → Clear token + user, clear localStorage, redirect to /login
  updateUser(user)        → Update user (after plan change)
  isAuthenticated()       → Boolean derived from token existence
```

**On app load:** Read token from `localStorage`. If present, validate by calling `GET /v1/usage` (lightweight check). If 401, clear and redirect.

### 5.2 Editor Store (`stores/editor.ts`)

Zustand store for all editor state. This is NOT persisted — it resets when navigating away.

```
State:
  templateId: string | null          # Currently open template
  templateName: string               # Display name
  source: string                     # Main file content
  files: Record<string, string>      # Additional files (e.g., { "utils.typ": "..." })
  activeFile: string                 # Currently open file tab ("main.typ" or key from files)
  data: Record<string, unknown>      # Test JSON data
  dataString: string                 # Raw JSON string in the data editor
  isDirty: boolean                   # Has unsaved changes
  lastSavedSource: string            # Source at last save (for dirty detection)
  publishedVersion: number | null    # Current live version number
  renderStatus: 'idle' | 'rendering' | 'success' | 'error'
  renderError: { message: string; file: string; line: number; column: number } | null
  renderDuration: number | null      # ms from last render
  pdfBlob: Blob | null               # Current rendered PDF
  pdfUrl: string | null              # Object URL for PDF display

Actions:
  loadTemplate(template: TemplateDetail)   → Populate all fields from API response
  setSource(source: string)                → Update source, set isDirty
  setActiveFile(filename: string)          → Switch editor tab
  addFile(filename: string)                → Add new file to files map
  removeFile(filename: string)             → Remove file from map
  setFileContent(filename: string, content: string) → Update file content
  setData(jsonString: string)              → Parse and update data + dataString
  setPdfResult(blob: Blob, duration: number)  → Set pdfBlob, create URL, set status
  setRenderError(error)                    → Set error, clear PDF
  markClean()                              → Set isDirty = false, update lastSavedSource
  reset()                                  → Clear all state
```

---

## 6. TanStack Query Hooks

Every API interaction goes through TanStack Query for automatic caching, refetching, loading states, and error handling.

### 6.1 Auth Hooks (`hooks/use-auth.ts`)

| Hook | Type | Key | Endpoint |
|------|------|-----|----------|
| `useLogin()` | mutation | — | `POST /v1/auth/login` |
| `useRegister()` | mutation | — | `POST /v1/auth/register` |

**`useLogin()` onSuccess:** Call `authStore.login(token, user)`, then `navigate('/dashboard')`.
**`useRegister()` onSuccess:** Call `authStore.login(token, user)`, show API key in onboarding flow, then `navigate('/onboarding')`.

### 6.2 Template Hooks (`hooks/use-templates.ts`)

| Hook | Type | Key | Endpoint |
|------|------|-----|----------|
| `useTemplates(includeOfficial?)` | query | `['templates', { includeOfficial }]` | `GET /v1/templates` |
| `useTemplate(id)` | query | `['template', id]` | `GET /v1/templates/:id` |
| `useCreateTemplate()` | mutation | — | `POST /v1/templates` |
| `usePublishVersion(id)` | mutation | — | `POST /v1/templates/:id/publish` |
| `useForkTemplate(id)` | mutation | — | `POST /v1/templates/:id/fork` |
| `useDeleteTemplate(id)` | mutation | — | `DELETE /v1/templates/:id` |

**`useCreateTemplate()` onSuccess:** Invalidate `['templates']`, navigate to `/editor/:id`.
**`usePublishVersion()` onSuccess:** Invalidate `['template', id]`, `['templates']`, show "Published v{N}" toast, update editor store.
**`useDeleteTemplate()` onSuccess:** Invalidate `['templates']`, navigate to `/dashboard`.

### 6.3 Render Hook (`hooks/use-render.ts`)

| Hook | Type | Key | Endpoint |
|------|------|-----|----------|
| `usePreviewRender()` | mutation | — | `POST /v1/render/preview` |

**Behavior:**
1. Called by the editor on Ctrl+S or after 800ms debounce
2. Sends `{ source, files, data }` from editor store
3. Uses `api.postRaw()` to get binary response
4. On success: Read `X-Render-Duration` header, create Blob, update editor store
5. On 400 (compilation error): Parse error body, update `renderError` in editor store, do NOT clear existing PDF (keep last good render visible)
6. On error: Show toast

**AbortController:** Each new render request aborts the previous in-flight request.

### 6.4 Asset Hooks (`hooks/use-assets.ts`)

| Hook | Type | Key | Endpoint |
|------|------|-----|----------|
| `useAssets()` | query | `['assets']` | `GET /v1/assets` |
| `useRequestUploadUrl()` | mutation | — | `POST /v1/assets/upload-url` |
| `useConfirmUpload()` | mutation | — | `POST /v1/assets` |
| `useDeleteAsset(id)` | mutation | — | `DELETE /v1/assets/:id` |

**Upload Flow (3-step):**
1. Call `useRequestUploadUrl()` with `{ filename, content_type, size_bytes }` → get `{ upload_url, asset_id }`
2. `PUT` the file directly to R2 using the presigned URL (raw fetch, NOT through api client)
3. Call `useConfirmUpload()` with `{ asset_id, name, hash }` → asset registered

The upload hook should handle all 3 steps in sequence. Calculate SHA-256 hash client-side using `crypto.subtle.digest()`.

### 6.5 Usage Hook (`hooks/use-usage.ts`)

| Hook | Type | Key | Endpoint |
|------|------|-----|----------|
| `useUsage()` | query | `['usage']` | `GET /v1/usage` |

**Config:** `refetchInterval: 60_000` (refresh every minute), `staleTime: 30_000`.

### 6.6 API Key Hooks (`hooks/use-api-keys.ts`)

| Hook | Type | Key | Endpoint |
|------|------|-----|----------|
| `useApiKeys()` | query | `['api-keys']` | `GET /v1/auth/keys` |
| `useCreateApiKey()` | mutation | — | `POST /v1/auth/keys` |
| `useRevokeApiKey()` | mutation | — | `DELETE /v1/auth/keys/:id` |

**`useCreateApiKey()` onSuccess:** Invalidate `['api-keys']`, show raw key in a **non-dismissable** dialog with a copy button and warning: "Save this key — it will not be shown again."

### 6.7 Billing Hook (`hooks/use-billing.ts`)

| Hook | Type | Key | Endpoint |
|------|------|-----|----------|
| `useCreateCheckout()` | mutation | — | `POST /v1/billing/checkout` |

**`onSuccess`:** Redirect to `checkout_url` (full page redirect, Stripe handles the rest). On return (Stripe redirects back to `/settings?upgraded=true`), refetch `['usage']` and update auth store user.

### 6.8 AI Hook (`hooks/use-ai.ts`)

| Hook | Type | Key | Endpoint |
|------|------|-----|----------|
| `useAiEdit()` | mutation | — | `POST /v1/ai/edit` |

**Behavior:**
1. Sends `{ prompt, current_code, asset_names }` from editor context
2. On success: Show returned `code` in a diff view inside the AI drawer
3. User clicks "Apply" → update editor store source
4. User clicks "Discard" → close diff view
5. On 429: Show "AI credits exhausted — resets in X minutes"

---

## 7. Routing

```
/login              → LoginPage (public)
/register           → RegisterPage (public)
/onboarding         → OnboardingPage (protected, shown once after register)
/dashboard          → DashboardPage (protected, default landing)
/editor/:id         → EditorPage (protected)
/settings           → SettingsPage (protected)
/*                  → NotFoundPage
```

### Route Guards

`ProtectedRoute` component wraps all authenticated pages:
1. Check `authStore.isAuthenticated()`
2. If no token: redirect to `/login` with `?redirect=` param
3. If token exists: render children
4. On login success: redirect to stored `?redirect` URL or `/dashboard`

---

## 8. Page Specifications

### 8.1 Login Page

**Layout:** Centered card on neutral background. DocuForge logo at top.

**Form Fields:**
- Email (text input, autofocus)
- Password (password input)
- "Sign In" button (disabled while submitting, shows spinner)
- "Don't have an account? Sign up" link → `/register`

**Error States:**
- Invalid credentials → show "Invalid email or password" below form
- Network error → show "Unable to connect. Please try again." toast

**Keyboard:** Enter submits form.

### 8.2 Register Page

**Layout:** Same as login.

**Form Fields:**
- Email
- Password (min 8 chars, show inline validation)
- Confirm Password (must match)
- "Create Account" button

**On Success:** Redirect to `/onboarding` (not `/dashboard`). The onboarding flow handles showing the API key.

**Error States:**
- Email taken → "An account with this email already exists"

### 8.3 Onboarding Page

**Layout:** Full-screen flow, 3 steps with progress indicator at top.

**Step 1: "Choose a Starter Template"**
- Grid of 5 official templates (Invoice, Receipt, Shipping Label, Report, Certificate)
- Each shows a thumbnail preview, name, and "Use This" button
- "Use This" → forks the template to user's account
- "Skip — Start from Scratch" link at bottom

**Step 2: "Your API Key"**
- Shows the raw API key from registration in a large monospace box
- Copy button with "Copied!" feedback
- Warning: "Save this key somewhere safe. You won't see it again."
- "I've saved my key" button to proceed

**Step 3: "Make Your First Request"**
- Shows a curl command pre-filled with user's API key and forked template ID
- "Copy" button
- "Open Editor" button → navigates to `/editor/:forkedTemplateId`
- "Go to Dashboard" link

### 8.4 Dashboard Page

**Layout:** AppShell with sidebar. Main content area with grid layout.

**Top Section: Quick Stats Row**
- UsageCard: circular progress ring or bar showing "342 / 500 renders used". If > 80%, show yellow warning. If at limit, show red with "Upgrade" button.
- QuickStartCard: Shows masked API key prefix (`docu_live_a1b2c3...`) with copy button and a 3-line curl example.

**Main Section: "My Templates"**
- Grid of TemplateCards (2-3 columns depending on viewport)
- Each card shows: template name, description (truncated), version number badge, last updated date, and a small PDF thumbnail (rendered on first load or static placeholder)
- Click card → navigate to `/editor/:id`
- "Create Template" button (top-right) opens CreateTemplateDialog

**Below Templates: "Official Templates"**
- Horizontal scrollable row (or separate tab) of official DocuForge templates
- Each shows thumbnail, name, "Fork" button
- Fork → creates copy in user's account, navigates to editor

**CreateTemplateDialog:**
- Name (required, unique)
- Description (optional)
- "Start from" dropdown: Blank, or select from official templates
- "Create" button → `POST /v1/templates`, navigate to editor

**Empty State:** When user has no templates: large centered illustration with "Create your first template" CTA and a prominent link to the official gallery.

### 8.5 Editor Page (Core Feature)

This is the heart of the application. It loads when navigating to `/editor/:id`.

#### 8.5.1 Layout

Three-pane resizable layout using `react-resizable-panels`:

```
┌───────────────────────────────────────────────────────────┐
│ EditorToolbar                                             │
│ [← Dashboard]  My Invoice v3 (Draft)  [Publish] [⋮ More] │
├──────────┬────────────────────────┬───────────────────────┤
│ Sidebar  │  Code Editor           │  Preview              │
│ (15%)    │  (45%)                 │  (40%)                │
│          │                        │                       │
│ ▸ Files  │  main.typ              │  ┌─────────────────┐  │
│   main…  │  ─────────             │  │                 │  │
│   utils… │  #set page(paper: "a4")│  │   [PDF RENDER]  │  │
│          │  #set text(font: "In.. │  │                 │  │
│ ▸ Assets │  = Invoice             │  │                 │  │
│   logo…  │  #table(               │  └─────────────────┘  │
│   font…  │    columns: 3,         │                       │
│          │    ..items             │  [PDF] [Data] [Diag]  │
│ ▸ Snippets│                       │                       │
│          │                        │  ┌─────────────────┐  │
├──────────┤                        │  │ Test Data (JSON) │  │
│ 🤖 AI    │                        │  │ {"invoice_id":.. │  │
│ [Ask AI] │                        │  └─────────────────┘  │
├──────────┴────────────────────────┴───────────────────────┤
│ StatusBar: Draft · Ln 12, Col 5 · Rendered in 35ms       │
└───────────────────────────────────────────────────────────┘
```

#### 8.5.2 Editor Toolbar (top bar)

Left section:
- Back arrow → `/dashboard`
- Template name (editable inline on click)
- Version badge: "Published v3" (green) or "Draft — Unsaved Changes" (yellow)

Right section:
- **"Publish"** button (primary) — opens confirm dialog:
  - Commit message input (optional)
  - "Publish as v{N+1}" button
  - Disabled if no changes since last publish
- **"Download PDF"** button — downloads current preview PDF
- **"More" dropdown:**
  - "Fork Template" — creates copy
  - "View Version History" — opens VersionHistory panel
  - "Template Settings" — rename, description, delete
  - "Keyboard Shortcuts" — show shortcuts modal

#### 8.5.3 Left Sidebar

Three collapsible sections:

**Files**
- Lists all files in the template (`main.typ` + additional files from `files` map)
- Click to switch `activeFile` in editor
- "+" button to add new file (modal: enter filename, must end in `.typ`)
- Right-click (or icon) → rename, delete (cannot delete `main.typ`)
- `main.typ` is always first and non-deletable

**Assets**
- Lists all user assets with icons (🖼️ for images, 🔤 for fonts)
- Shows filename + size
- Click on image asset → inserts `#image("logo.png")` at cursor in editor
- Click on font asset → inserts `#set text(font: "FontName")` at cursor
- "Upload" button opens file picker
- Drag-and-drop zone (uses `react-dropzone`)
- Upload flow: request presigned URL → upload to R2 → confirm → refetch list → show toast
- Delete button per asset (with confirmation)

**Snippets**
- Hardcoded list of common Typst code snippets:
  - "Page Setup" → `#set page(paper: "a4", margin: (x: 2cm, y: 2.5cm))`
  - "Table" → basic table scaffold
  - "Image" → `#image("filename.png", width: 50%)`
  - "Header/Footer" → page header/footer setup
  - "For Loop" → `#for item in items [...]`
  - "Date" → `#datetime.today().display()`
- Click to insert at cursor

#### 8.5.4 Code Editor (center pane)

**Component:** `@monaco-editor/react`

**Configuration:**
- Language: custom `typst` language (see Section 9)
- Theme: dark (custom DocuForge theme, see Section 9)
- Options:
  ```
  fontSize: 14
  fontFamily: "JetBrains Mono, Fira Code, monospace"
  minimap: { enabled: false }
  lineNumbers: "on"
  wordWrap: "on"
  renderWhitespace: "selection"
  bracketPairColorization: { enabled: true }
  scrollBeyondLastLine: false
  tabSize: 2
  automaticLayout: true
  ```
- On change: update `editorStore.setSource()` or `setFileContent()` depending on active file
- Show tab bar when multiple files exist (like VS Code tabs)

**Error Decorations:**
When `renderError` exists in the store:
1. Add red squiggly underline on the error line/column
2. Add gutter icon (red circle)
3. Show error message in hover tooltip
4. Scroll to error line automatically

#### 8.5.5 Right Pane (Preview + Data + Diagnostics)

Tabbed interface with three tabs:

**Tab 1: "Preview" (default)**
- Displays rendered PDF
- Implementation: `<iframe src={pdfUrl} />` where `pdfUrl` is an Object URL from the Blob
- While rendering: show subtle overlay spinner (do NOT blank the PDF — keep last good render visible underneath)
- On first load (no PDF yet): show "Press Ctrl+S or edit code to see preview" placeholder
- Retain scroll position between renders by tracking iframe scroll before replacing URL

**Tab 2: "Data"**
- Monaco editor in JSON mode
- Contains the test data object that gets sent with every preview render
- On load: populated from `template.live_version.defaults` (or empty `{}`)
- On change: debounce 500ms, update `editorStore.setData()`, trigger re-render
- Validation: if JSON is malformed, show red border and error message below editor. Do NOT send render request with invalid JSON.

**Tab 3: "Diagnostics"**
- Shows compilation errors in a structured list:
  ```
  ✕ main.typ:5:12 — unknown variable: 'itms' (did you mean 'items'?)
  ```
- Click an error → jump to that line in the editor
- When no errors: show green "✓ No errors" message
- Also shows last render time: "Last render: 35ms"

#### 8.5.6 AI Drawer

**Trigger:** "🤖 AI" button in the left sidebar bottom, or `Ctrl+Shift+A`
**Type:** Slide-out drawer from the right (Shadcn Sheet), or collapsible bottom panel

**Components:**
- AiCreditsIndicator at top: "3/5 credits remaining this hour" with progress bar. If 0, input is disabled with "Credits reset in X minutes" message.
- AiPromptInput: text area with placeholder "Describe what you want to change..."
- "Include selection" checkbox — if checked, sends `editor.getSelection()` as context. If unchecked, sends full source.
- "Send" button (or Enter to submit)
- AiResponseView: when response arrives, shows a side-by-side diff of current code vs. AI-suggested code (use Monaco's built-in diff editor for this)
- "Apply" button → replaces editor source with AI code, closes diff view
- "Discard" button → closes diff view, keeps original
- History: show last 3 AI interactions in the drawer (prompt + truncated response)

**Image Upload Flow (Vision → Template):**
- "Upload screenshot" button below prompt input
- Accept `.png`, `.jpg`, `.jpeg` only
- Sends to `POST /v1/ai/generate` with image as base64
- Response: generated Typst code
- Shows in response view with "Apply" button

#### 8.5.7 Version History Panel

**Trigger:** "Version History" in the More dropdown, or `Ctrl+Shift+H`
**Type:** Side panel overlay on the right pane

**Content:**
- List of versions, newest first:
  ```
  v3 (Current) — "Updated logo size" — Jan 25, 2024
  v2 — "Added footer" — Jan 24, 2024
  v1 — "Initial version" — Jan 23, 2024
  ```
- Click a version → loads that version's source into the editor in **read-only mode**
- Banner at top: "Viewing v2 (read-only)" with two buttons:
  - "Revert to this version" → Publishes this old source as a new version (v4 with v2's content)
  - "Return to latest" → loads live version, re-enables editing

#### 8.5.8 Command Palette

**Trigger:** `Ctrl+K` or `Cmd+K`
**Component:** cmdk-based modal

**Commands:**
- "Go to Dashboard" → navigate
- "Go to Settings" → navigate
- Search templates by name → navigate to editor
- Insert Snippet: "Page Setup", "Table", etc.
- "Publish Version" → trigger publish flow
- "Download PDF" → trigger download
- "Open AI Assistant" → open AI drawer
- "Toggle Preview" → show/hide right pane

#### 8.5.9 Status Bar (bottom)

Single row at bottom of editor page:

Left: Draft status ("Published v3" or "Draft — unsaved")
Center: Cursor position ("Ln 12, Col 5")
Right: Last render time ("Rendered in 35ms") or error indicator ("✕ 1 error")

#### 8.5.10 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` / `Cmd+S` | Save and render preview |
| `Ctrl+K` / `Cmd+K` | Open command palette |
| `Ctrl+Shift+P` | Publish version (opens confirm dialog) |
| `Ctrl+Shift+A` | Toggle AI drawer |
| `Ctrl+Shift+H` | Toggle version history |
| `Ctrl+Shift+D` | Toggle data editor tab |
| `Ctrl+\` | Toggle left sidebar |
| `Escape` | Close any open panel/dialog |

**Implementation:** Use a global `useKeyboard()` hook that registers `keydown` listeners. Prevent default browser behavior for all registered shortcuts. Only active when on the editor page.

#### 8.5.11 Auto-Save & Render Behavior

The editor supports two render triggers:

**Manual (Ctrl+S):**
1. Immediately trigger render
2. Cancel any pending debounced render
3. Show "Rendering..." status

**Auto (debounced):**
1. On every source change, reset an 800ms debounce timer
2. After 800ms of inactivity, trigger render
3. Configurable: users can disable auto-render in the More dropdown

**Render Pipeline:**
1. Check if data JSON is valid. If not, skip render, show data error.
2. Build payload: `{ source, files, data }` from editor store
3. Abort previous in-flight request (AbortController)
4. Set `renderStatus: 'rendering'`
5. Call `POST /v1/render/preview`
6. On 200: read blob + duration header, update store, set status 'success'
7. On 400: parse error, set `renderError`, set status 'error', keep last PDF
8. On other error: toast, set status 'error'

### 8.6 Settings Page

**Layout:** AppShell with sidebar. Main content in a single scrollable column.

#### Section 1: Profile
- Email display (read-only for now)
- Plan badge: "Free Plan", "Starter Plan", or "Pro Plan"
- If free: "Upgrade" button
- If paid: "Manage Subscription" link (Stripe portal)

#### Section 2: Usage
- UsageCard component (same as dashboard)
- Additionally show a simple bar chart of daily render counts for the current month (using data from usage endpoint or a future endpoint)
- "Plan Limits" table:
  ```
  Feature          Free     Starter    Pro
  Monthly Renders  500      10,000     50,000
  AI Credits/hr    5        20         50
  Templates        10       Unlimited  Unlimited
  Assets           50MB     500MB      2GB
  ```

#### Section 3: API Keys
- Table with columns: Name, Key Prefix, Last Used, Created, Actions
- Each row shows: "Production Server", `docu_live_a1b2c3...`, "2 hours ago", "Jan 15, 2024", [Revoke]
- "Create New Key" button → modal:
  - Name input (required)
  - "Create" button
  - On success: show raw key in **non-dismissable** dialog with copy button
- "Revoke" button → confirm dialog: "This action cannot be undone. Any applications using this key will immediately lose access." → revoke

#### Section 4: Quick Start Guide
- Tab-based code examples:
  ```
  [curl] [Node.js] [Python] [Go]
  ```
- Each tab shows a complete working example of calling `POST /v1/render` with the user's API key prefix (`docu_live_...`) as a placeholder
- "Copy" button per example

---

## 9. Monaco Typst Language Support

### 9.1 Language Registration

Register a custom `typst` language with Monaco:

**Tokenizer Rules (Monarch syntax):**
```
# Comments
// single line → comment
/* block */ → comment

# Keywords
#set, #let, #show, #import, #include, #if, #else, #for, #while, #return → keyword

# Built-in Functions
#table, #image, #text, #page, #align, #grid, #stack, #columns, #rect, #circle,
#line, #heading, #link, #emph, #strong, #underline, #strike, #super, #sub,
#raw, #quote, #cite, #ref, #figure, #counter, #state, #datetime, #sys → builtin

# Markup
= heading → markup.heading
*bold* → markup.bold
_italic_ → markup.italic
`code` → markup.code

# Strings
"..." → string

# Numbers
42, 3.14, 1em, 2cm, 50%, 12pt → number

# Math mode
$...$ → math

# Special
sys.inputs → special variable (highlight differently)
```

### 9.2 Custom Theme: "DocuForge Dark"

```
editor.background:          #0f1117
editor.foreground:          #c9d1d9
keyword:                    #ff7b72
builtin:                    #79c0ff
string:                     #a5d6ff
number:                     #ffa657
comment:                    #6e7681
markup.heading:             #d2a8ff
markup.bold:                #ffffff bold
markup.italic:              #ffffff italic
special (sys.inputs):       #ffa657 bold
```

### 9.3 Auto-completion

Provide basic completions for:
- All `#` keywords
- Common function signatures (e.g., `#image("", width: )`)
- `sys.inputs.` followed by keys from the current data JSON
- Asset names (from `useAssets()` query)

---

## 10. Design System

### 10.1 Color Palette

**Dark Mode (default and only mode for MVP):**
```
Background:       #0a0a0b (page bg)
Surface:          #111113 (cards, panels)
Surface-2:        #1a1a1f (elevated elements)
Border:           #27272a (subtle borders)
Border-hover:     #3f3f46 (hover states)
Text-primary:     #fafafa
Text-secondary:   #a1a1aa
Text-muted:       #71717a
Accent:           #3b82f6 (blue — buttons, links)
Accent-hover:     #2563eb
Success:          #22c55e
Warning:          #eab308
Error:            #ef4444
```

### 10.2 Typography

- Headings: `Inter` (600 weight)
- Body: `Inter` (400 weight)
- Code/Editor: `JetBrains Mono` (400 weight)
- Sizes: 14px base, scale with Tailwind defaults

### 10.3 Component Style Notes

- Buttons: rounded-md, subtle hover transitions (150ms)
- Cards: border-1 on Surface, no drop shadows (flat design)
- Inputs: Surface-2 background, subtle border, focus ring with Accent
- Modals: centered, backdrop blur-sm, max-w-md or max-w-lg
- Toasts: bottom-right, auto-dismiss 5s, with undo/action when applicable
- Badges: pill-shaped, small text, colored per status (green=published, yellow=draft, red=error)

---

## 11. Performance Requirements

| Metric | Target | How |
|--------|--------|-----|
| LCP (dashboard) | < 1.2s | Code splitting, lazy load editor page |
| LCP (editor) | < 2.0s | Monaco lazy loaded, skeleton while loading |
| Ctrl+S → PDF visible | < 500ms | Assuming <100ms network, ~50ms engine render |
| Bundle size (initial) | < 200KB gzipped | Split Monaco into separate chunk |
| Bundle size (editor) | < 800KB gzipped | Monaco is large but lazy loaded |

### Code Splitting Strategy

```typescript
// In router — lazy load heavy pages
const EditorPage = lazy(() => import('./pages/editor/EditorPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));

// Monaco is loaded only when EditorPage mounts
// Dashboard loads fast because it doesn't include the editor
```

### Render Pipeline Optimization

- Preview requests use `AbortController` to cancel stale requests
- PDF Blob is reused via Object URL (revoked on next render)
- Keep last good PDF visible during re-render (no blank flash)
- Data editor changes also debounced (500ms) before triggering render
- Asset list cached with `staleTime: 5 minutes`

---

## 12. Test Specification

### 12.1 Test Stack

- **Unit/Component:** Vitest + Testing Library + MSW
- **E2E:** Playwright (Phase 2, optional for MVP)

### 12.2 Test Setup (`tests/setup.ts`)

1. Configure MSW with handlers for all API endpoints
2. Provide custom `render()` that wraps with QueryClientProvider, BrowserRouter, and auth store
3. Use `@testing-library/jest-dom` matchers

### 12.3 MSW Handlers (`tests/helpers/msw-handlers.ts`)

Mock all API endpoints with realistic responses:

```
POST /v1/auth/login → { token: "test-jwt", user: { id: "usr_test", email: "test@test.com", plan: "free" } }
POST /v1/auth/register → { token: "test-jwt", user: {...}, api_key: { raw_key: "docu_live_test...", ... } }
GET /v1/templates → { templates: [...fixtures], pagination: { page: 1, limit: 20, total: 3 } }
GET /v1/templates/:id → { template: { ...fixture with versions } }
POST /v1/render/preview → Binary PDF blob (28-byte minimal PDF)
GET /v1/usage → { plan: "free", renders: { used: 42, limit: 500, remaining: 458 }, ... }
GET /v1/auth/keys → { keys: [...fixtures] }
GET /v1/assets → { assets: [...fixtures] }
POST /v1/ai/edit → { code: "modified typst code", tokens_used: 200 }
```

### 12.4 Unit Tests

#### `api.test.ts`
| Test | Description |
|------|-------------|
| `adds auth header when token exists` | Token in header |
| `omits auth header when no token` | No header |
| `redirects to login on 401` | Auth store cleared + redirect |
| `shows toast on 429` | Rate limit handled |
| `parses JSON error responses` | Error shape correct |
| `returns raw response for postRaw` | Binary PDF handling |

#### `auth-store.test.ts`
| Test | Description |
|------|-------------|
| `login sets token and user` | State updated |
| `logout clears everything` | State + localStorage cleared |
| `persists to localStorage` | Survives reload |
| `reads from localStorage on init` | Hydration works |
| `isAuthenticated reflects token` | Derived state |

#### `editor-store.test.ts`
| Test | Description |
|------|-------------|
| `loadTemplate populates all fields` | Source, files, data, version |
| `setSource marks dirty` | isDirty = true |
| `setSource does not mark dirty if same` | No false dirty |
| `addFile creates entry` | Files map updated |
| `removeFile deletes entry` | File gone |
| `setData parses valid JSON` | Data object updated |
| `setData rejects invalid JSON` | Error state set |
| `setPdfResult creates object URL` | Blob + URL set |
| `reset clears everything` | Back to initial |
| `markClean resets dirty flag` | isDirty = false |

#### `use-debounce.test.ts`
| Test | Description |
|------|-------------|
| `debounces rapid calls` | Only last value used |
| `fires after delay` | Value appears after timeout |
| `cancels on unmount` | No memory leak |

#### `utils.test.ts`
| Test | Description |
|------|-------------|
| `formatDate formats timestamps` | Correct output |
| `formatBytes handles KB/MB/GB` | Human readable |
| `cn merges classes correctly` | Tailwind merge works |

### 12.5 Component Tests

#### `LoginForm.test.tsx`
| Test | Description |
|------|-------------|
| `renders email and password fields` | Visible inputs |
| `disables button during submission` | Loading state |
| `shows error on invalid credentials` | Error message visible |
| `redirects on success` | Navigation called |
| `validates required fields` | Inline errors |

#### `RegisterForm.test.tsx`
| Test | Description |
|------|-------------|
| `validates password length` | Min 8 chars error |
| `validates password match` | Mismatch error |
| `validates email format` | Invalid email error |
| `shows duplicate email error` | 409 handled |
| `redirects to onboarding on success` | Navigation called |

#### `TemplateCard.test.tsx`
| Test | Description |
|------|-------------|
| `renders template name and version` | Content visible |
| `shows description truncated` | Long text cut |
| `navigates to editor on click` | Link works |
| `shows "Official" badge for system templates` | Badge visible |

#### `TemplateGrid.test.tsx`
| Test | Description |
|------|-------------|
| `renders all templates` | Correct count |
| `shows empty state when no templates` | CTA visible |
| `shows create button` | Button present |
| `shows loading skeletons` | While fetching |

#### `UsageCard.test.tsx`
| Test | Description |
|------|-------------|
| `shows usage fraction` | "342 / 500" visible |
| `shows warning at 80%` | Yellow state |
| `shows error at 100%` | Red + upgrade CTA |
| `shows upgrade button for free users` | Button present |
| `hides upgrade button for pro users` | Button absent |

#### `ApiKeySection.test.tsx`
| Test | Description |
|------|-------------|
| `lists all keys` | Correct count |
| `shows masked prefix` | Only prefix visible |
| `shows last used time` | Relative time |
| `create key shows raw key dialog` | Non-dismissable modal |
| `revoke shows confirmation` | Confirm dialog |
| `revoked key disappears from list` | Removed |

#### `AssetPanel.test.tsx`
| Test | Description |
|------|-------------|
| `lists user assets` | Files shown |
| `shows file type icons` | Image vs font |
| `clicking image inserts Typst` | Callback fired with correct snippet |
| `clicking font inserts Typst` | Callback fired |
| `upload button works` | File picker opens |
| `delete shows confirmation` | Confirm dialog |
| `shows drag-drop zone` | Drop area visible |

#### `DiagnosticsPanel.test.tsx`
| Test | Description |
|------|-------------|
| `shows errors with file/line info` | Error list visible |
| `clicking error scrolls editor` | Callback fired |
| `shows green "no errors" when clean` | Success state |
| `shows last render time` | Duration visible |

#### `VersionHistory.test.tsx`
| Test | Description |
|------|-------------|
| `lists versions newest first` | Correct order |
| `shows commit messages` | Messages visible |
| `current version marked` | Badge on latest |
| `clicking version loads source` | Callback fired |
| `read-only banner shows` | Banner visible |
| `revert creates new version` | Mutation fired |

#### `AiDrawer.test.tsx`
| Test | Description |
|------|-------------|
| `shows credits remaining` | Count visible |
| `disables input at 0 credits` | Input disabled |
| `sends prompt with code context` | Mutation payload correct |
| `shows diff view on response` | Diff editor visible |
| `Apply updates editor source` | Store updated |
| `Discard closes diff` | Diff gone |

#### `CommandPalette.test.tsx`
| Test | Description |
|------|-------------|
| `opens on Ctrl+K` | Modal visible |
| `filters commands on type` | Search works |
| `executes selected command` | Callback fired |
| `closes on Escape` | Modal gone |
| `closes on command execution` | Auto-close |

#### `PdfPreview.test.tsx`
| Test | Description |
|------|-------------|
| `renders iframe with blob URL` | iframe src set |
| `shows placeholder when no PDF` | Instruction text |
| `shows spinner while rendering` | Overlay visible |
| `keeps last PDF during re-render` | Old iframe persists |

#### `EditorToolbar.test.tsx`
| Test | Description |
|------|-------------|
| `shows template name` | Name visible |
| `shows version badge` | "Published v3" visible |
| `shows draft badge when dirty` | "Draft" visible |
| `publish button opens dialog` | Dialog visible |
| `publish disabled when not dirty` | Button disabled |
| `download triggers PDF save` | Download initiated |

### 12.6 Integration Tests

#### `auth-flow.test.tsx`
```
1. Render LoginPage
2. Fill email + password
3. Submit
4. Assert redirect to /dashboard
5. Assert auth store has token
6. Navigate to /settings → page loads (authenticated)
7. Click logout → redirect to /login
```

#### `template-crud.test.tsx`
```
1. Render DashboardPage with 2 templates
2. Click "Create Template"
3. Fill name + create
4. Assert redirect to /editor/:newId
5. Navigate back to dashboard → 3 templates visible
6. Delete a template → 2 templates
```

#### `editor-render.test.tsx`
```
1. Render EditorPage with template loaded
2. Assert Monaco editor shows source
3. Type changes in editor
4. Press Ctrl+S
5. Assert render request sent with correct payload
6. Assert PDF preview updates
7. Assert status bar shows render time
```

#### `asset-upload.test.tsx`
```
1. Render EditorPage
2. Open Asset panel
3. Trigger file upload
4. Assert presigned URL requested
5. Assert file uploaded to URL
6. Assert confirm endpoint called
7. Assert asset appears in list
8. Click asset → assert Typst snippet inserted in editor
```

#### `billing-flow.test.tsx`
```
1. Render SettingsPage with free plan
2. Assert usage shows "42 / 500"
3. Click "Upgrade"
4. Assert checkout endpoint called
5. Assert redirect to Stripe URL
```

#### `onboarding-flow.test.tsx`
```
1. Register new user
2. Assert redirect to /onboarding
3. Step 1: click "Use This" on Invoice template
4. Assert fork template mutation called
5. Step 2: assert API key displayed
6. Click copy → assert clipboard
7. Step 3: assert curl command visible
8. Click "Open Editor" → navigate to editor
```

### 12.7 Test Commands

```bash
# Run all tests
npm run test

# Run in watch mode
npm run test -- --watch

# Run specific file
npm run test -- tests/component/LoginForm.test.tsx

# Run with coverage
npm run test -- --coverage

# Run only unit tests
npm run test -- tests/unit/

# Run only component tests
npm run test -- tests/component/

# Run only integration tests
npm run test -- tests/integration/
```

---

## 13. Build & Deployment

### Vite Config

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco': ['monaco-editor', '@monaco-editor/react'],
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'query': ['@tanstack/react-query'],
        }
      }
    }
  }
});
```

### Cloudflare Pages

`_redirects` file for SPA:
```
/*    /index.html   200
```

### Build Command

```bash
npm run build   # → dist/
```

---

## 14. Implementation Order

The agent must build in this exact sequence. Each phase must be functional before proceeding.

### Phase 1: Foundation (Day 1-2)
1. **Project scaffold** — Vite + React + TypeScript + Tailwind
2. **Shadcn/UI setup** — `npx shadcn@latest init`, install all listed components
3. **Config** — env.ts, constants.ts, utils.ts
4. **API client** — fetch wrapper with auth interceptor + error handling
5. **API types** — all TypeScript interfaces
6. **Auth store** — Zustand with localStorage persistence
7. **TanStack Query setup** — QueryClient + provider in main.tsx

### Phase 2: Auth + Routing (Day 2-3)
8. **Router setup** — all routes with lazy loading
9. **ProtectedRoute** — redirect guard
10. **AppShell layout** — sidebar + topbar + mobile nav
11. **LoginPage** — form + mutation + redirect
12. **RegisterPage** — form + mutation + redirect
13. **Auth tests** — unit + component + integration

### Phase 3: Dashboard (Day 3-4)
14. **DashboardPage** — layout with grid
15. **TemplateCard + TemplateGrid** — list user templates
16. **UsageCard** — usage display
17. **QuickStartCard** — API key + curl example
18. **CreateTemplateDialog** — create flow
19. **OfficialTemplateGallery** — browse + fork
20. **Empty state** — when no templates
21. **Dashboard tests** — component tests

### Phase 4: Editor Core (Day 4-6)
22. **Typst language registration** — tokenizer + theme
23. **EditorLayout** — three-pane resizable
24. **MonacoEditor** — with Typst syntax + error decorations
25. **Editor store** — full implementation
26. **Render hook** — with debounce + abort
27. **PdfPreview** — iframe + blob URL
28. **DataEditor** — JSON Monaco editor
29. **DiagnosticsPanel** — error list
30. **EditorToolbar** — publish, download, more menu
31. **EditorStatusBar** — draft/published, cursor, render time
32. **Keyboard shortcuts** — all registered
33. **Auto-save + render pipeline** — debounce + manual trigger
34. **Editor tests** — component + integration

### Phase 5: Editor Features (Day 6-8)
35. **FileExplorer** — multi-file support with tabs
36. **AssetPanel** — upload, list, insert, delete
37. **VersionHistory** — browse, view, revert
38. **CommandPalette** — cmdk integration
39. **Snippets panel** — hardcoded snippet list
40. **Feature tests** — component tests

### Phase 6: AI + Settings + Onboarding (Day 8-10)
41. **AiDrawer** — prompt input, response diff, apply/discard
42. **AiCreditsIndicator** — credits display
43. **AiImageUpload** — screenshot → template
44. **SettingsPage** — all sections
45. **ApiKeySection** — create, list, revoke with raw key dialog
46. **PlanSection** — plan display + Stripe checkout redirect
47. **OnboardingPage** — 3-step flow
48. **All remaining tests** — integration tests
49. **Performance** — code splitting verification, bundle analysis
50. **Polish** — loading states, error boundaries, 404 page

---

## 15. Verification Checklist

Before this phase is complete:

- [ ] `npm run dev` — app starts without errors
- [ ] `npm run build` — builds without errors, initial chunk < 200KB gzipped
- [ ] `npm run test` — all tests pass
- [ ] Register a new user → see onboarding flow
- [ ] Pick a starter template → forked to account
- [ ] See API key → copy works
- [ ] Navigate to dashboard → templates visible
- [ ] Create new template → redirected to editor
- [ ] Type Typst code → syntax highlighted
- [ ] Press Ctrl+S → PDF appears in preview within 500ms
- [ ] Invalid Typst → red squiggly on error line + diagnostics panel shows error
- [ ] Edit data JSON → PDF re-renders with new data
- [ ] Upload an image asset → appears in asset panel
- [ ] Click image asset → `#image("name.png")` inserted in editor
- [ ] Publish version → version number increments, toast confirms
- [ ] View version history → old versions listed
- [ ] Click old version → read-only mode, revert button works
- [ ] Open AI drawer → send prompt → see code diff → apply works
- [ ] Ctrl+K → command palette opens, search works
- [ ] Settings → API keys listed, create new key shows raw key
- [ ] Settings → click Upgrade → redirect to Stripe checkout
- [ ] 401 from any endpoint → redirected to login
- [ ] Mobile viewport → responsive layout, hamburger nav works
