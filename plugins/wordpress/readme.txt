=== DocuForge PDF Generator ===
Contributors: docuforge
Tags: pdf, document, generator, typst, template
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 8.0
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Generate professional PDFs from Typst templates using the DocuForge API. Includes a Gutenberg block, shortcode, and REST API integration.

== Description ==

DocuForge PDF Generator connects your WordPress site to the [DocuForge](https://docuforge.dev) PDF generation service. Create beautiful, professional documents from Typst templates with dynamic data from your WordPress content.

**Features:**

* **Gutenberg Block** - Drop a DocuForge PDF block into any post or page with a visual template selector and live preview.
* **Shortcode** - Use `[docuforge]` shortcodes for flexible PDF embedding anywhere shortcodes are supported.
* **Dynamic Data** - Automatically pull post titles, meta fields, author info, and more into your templates using placeholder syntax.
* **REST API** - Full REST API integration at `/wp-json/docuforge/v1/` for headless and custom integrations.
* **Caching** - Built-in transient-based caching to minimize API calls and improve performance.
* **Encrypted Storage** - API keys are encrypted at rest using AES-256-CBC.
* **Template Browser** - Browse and manage your DocuForge templates directly from the WordPress admin.

**Shortcode Usage:**

`[docuforge template_id="tpl_invoice" data_name="John Doe" data_amount="99.00" output="embed"]`

**Dynamic Values:**

* `{post:title}` - Current post title
* `{post:id}` - Current post ID
* `{post:date}` - Current post date
* `{post:author}` - Current post author
* `{post_meta:field_name}` - Any post meta field
* `{site:name}` - Site name
* `{site:url}` - Site URL
* `{user:display_name}` - Current user display name
* `{user:email}` - Current user email

== Installation ==

1. Upload the `docuforge` folder to `/wp-content/plugins/`.
2. Activate the plugin through the 'Plugins' menu in WordPress.
3. Go to **Settings > DocuForge** and enter your API key.
4. Click **Test Connection** to verify your configuration.
5. Start embedding PDFs using the Gutenberg block or shortcode.

**Getting an API Key:**

1. Sign up at [docuforge.dev](https://docuforge.dev).
2. Navigate to your dashboard and create an API key.
3. Copy the key and paste it into the plugin settings.

== Frequently Asked Questions ==

= Where do I get an API key? =

Sign up for a DocuForge account at [docuforge.dev](https://docuforge.dev) and generate an API key from your dashboard.

= Is my API key stored securely? =

Yes. API keys are encrypted using AES-256-CBC with your WordPress AUTH_KEY before being stored in the database. They are never stored in plaintext.

= Can I use dynamic post data in templates? =

Yes. Use placeholder syntax like `{post:title}`, `{post_meta:custom_field}`, `{user:display_name}`, and more. These are resolved at render time.

= How does caching work? =

Rendered PDFs are cached using WordPress transients. The default cache duration is 300 seconds (5 minutes). You can adjust this in **Settings > DocuForge** or set it to 0 to disable caching.

= Can I use this with a self-hosted DocuForge instance? =

Yes. Change the API URL in **Settings > DocuForge** to point to your self-hosted instance.

= What permissions are required? =

* **Settings page**: `manage_options` (Administrators)
* **Template browser**: `edit_posts` (Editors and above)
* **REST API templates/render**: `edit_posts`
* **REST API usage**: `manage_options`

= Does this work with the block editor? =

Yes. The plugin includes a full Gutenberg block with template selection, data field configuration, and live preview capabilities.

== Screenshots ==

1. Settings page with API configuration and connection test.
2. Template browser showing available templates with copy-to-clipboard shortcode snippets.
3. Gutenberg block editor with template selector and data fields.
4. Embedded PDF on the front end.

== Changelog ==

= 1.0.0 =
* Initial release.
* DocuForge API client with full endpoint support.
* Gutenberg block with template selector and live preview.
* Shortcode with dynamic value resolution and caching.
* REST API proxy routes.
* Admin settings with encrypted API key storage.
* Template browser with shortcode copy functionality.
* Connection test with usage statistics display.

== Upgrade Notice ==

= 1.0.0 =
Initial release of DocuForge PDF Generator for WordPress.
