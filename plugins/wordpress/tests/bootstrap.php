<?php
/**
 * PHPUnit bootstrap file for DocuForge WordPress plugin tests.
 *
 * Sets up all required WordPress function stubs so the plugin classes
 * can be loaded and tested without a full WordPress environment.
 */

// Composer autoloader (loads Mockery, PHPUnit).
require_once dirname( __DIR__ ) . '/vendor/autoload.php';

/*
|--------------------------------------------------------------------------
| Global test state arrays
|--------------------------------------------------------------------------
| Tests populate these arrays in setUp() and clear them in tearDown().
| The WordPress function stubs below read from these globals.
*/
$docuforge_test_options        = array();
$docuforge_test_http_responses = array();
$docuforge_test_transients     = array();
$docuforge_test_upload_dir     = null;

// Define WordPress constants that the plugin checks.
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', '/tmp/fake-wp/' );
}

if ( ! defined( 'AUTH_KEY' ) ) {
	define( 'AUTH_KEY', 'test-auth-key-for-phpunit-encryption-tests-abc123' );
}

if ( ! defined( 'DOCUFORGE_VERSION' ) ) {
	define( 'DOCUFORGE_VERSION', '1.0.0-test' );
}

if ( ! defined( 'DOCUFORGE_PLUGIN_DIR' ) ) {
	define( 'DOCUFORGE_PLUGIN_DIR', dirname( __DIR__ ) . '/' );
}

if ( ! defined( 'DOCUFORGE_PLUGIN_URL' ) ) {
	define( 'DOCUFORGE_PLUGIN_URL', 'https://example.com/wp-content/plugins/docuforge/' );
}

if ( ! defined( 'FS_CHMOD_FILE' ) ) {
	define( 'FS_CHMOD_FILE', 0644 );
}

/*
|--------------------------------------------------------------------------
| WP_Error stub class
|--------------------------------------------------------------------------
| Minimal WP_Error implementation for testing.
*/
if ( ! class_exists( 'WP_Error' ) ) {
	class WP_Error {
		protected string $code;
		protected string $message;
		protected mixed $data;
		protected array $errors          = array();
		protected array $error_messages  = array();
		protected array $error_data_map  = array();

		public function __construct( string $code = '', string $message = '', mixed $data = '' ) {
			$this->code    = $code;
			$this->message = $message;
			$this->data    = $data;

			if ( $code ) {
				$this->errors[ $code ][]        = $message;
				$this->error_messages[ $code ][] = $message;
				if ( '' !== $data ) {
					$this->error_data_map[ $code ] = $data;
				}
			}
		}

		public function get_error_code(): string {
			return $this->code;
		}

		public function get_error_message( string $code = '' ): string {
			if ( '' === $code ) {
				return $this->message;
			}
			return $this->error_messages[ $code ][0] ?? '';
		}

		public function get_error_data( string $code = '' ): mixed {
			if ( '' === $code ) {
				return $this->data;
			}
			return $this->error_data_map[ $code ] ?? null;
		}

		public function get_error_codes(): array {
			return array_keys( $this->errors );
		}

		public function get_error_messages( string $code = '' ): array {
			if ( '' === $code ) {
				$all = array();
				foreach ( $this->error_messages as $msgs ) {
					$all = array_merge( $all, $msgs );
				}
				return $all;
			}
			return $this->error_messages[ $code ] ?? array();
		}

		public function has_errors(): bool {
			return ! empty( $this->errors );
		}

		public function add( string $code, string $message, mixed $data = '' ): void {
			$this->errors[ $code ][]        = $message;
			$this->error_messages[ $code ][] = $message;
			if ( '' !== $data ) {
				$this->error_data_map[ $code ] = $data;
			}
		}
	}
}

/*
|--------------------------------------------------------------------------
| WP_REST_Server constants stub
|--------------------------------------------------------------------------
*/
if ( ! class_exists( 'WP_REST_Server' ) ) {
	class WP_REST_Server {
		const READABLE  = 'GET';
		const CREATABLE = 'POST';
		const EDITABLE  = 'PUT, PATCH';
		const DELETABLE = 'DELETE';
	}
}

/*
|--------------------------------------------------------------------------
| WP_REST_Request stub class
|--------------------------------------------------------------------------
*/
if ( ! class_exists( 'WP_REST_Request' ) ) {
	class WP_REST_Request {
		private array $params = array();

		public function __construct( string $method = 'GET', string $route = '' ) {}

		public function set_param( string $key, mixed $value ): void {
			$this->params[ $key ] = $value;
		}

		public function get_param( string $key ): mixed {
			return $this->params[ $key ] ?? null;
		}

		public function get_params(): array {
			return $this->params;
		}
	}
}

/*
|--------------------------------------------------------------------------
| WP_REST_Response stub class
|--------------------------------------------------------------------------
*/
if ( ! class_exists( 'WP_REST_Response' ) ) {
	class WP_REST_Response {
		public mixed $data;
		public int $status;
		private array $headers = array();

		public function __construct( mixed $data = null, int $status = 200, array $headers = array() ) {
			$this->data    = $data;
			$this->status  = $status;
			$this->headers = $headers;
		}

		public function get_data(): mixed {
			return $this->data;
		}

		public function get_status(): int {
			return $this->status;
		}

		public function header( string $key, string $value ): void {
			$this->headers[ $key ] = $value;
		}

		public function get_headers(): array {
			return $this->headers;
		}
	}
}

/*
|--------------------------------------------------------------------------
| WordPress function stubs
|--------------------------------------------------------------------------
| These are defined as real functions so they are available when the plugin
| source files are first loaded. Tests control their behavior by populating
| the global test state arrays defined above.
*/

// -- Options API --
if ( ! function_exists( 'get_option' ) ) {
	function get_option( string $option, mixed $default = false ): mixed {
		global $docuforge_test_options;
		if ( isset( $docuforge_test_options ) && array_key_exists( $option, $docuforge_test_options ) ) {
			return $docuforge_test_options[ $option ];
		}
		return $default;
	}
}

if ( ! function_exists( 'update_option' ) ) {
	function update_option( string $option, mixed $value, string|bool $autoload = 'yes' ): bool {
		return true;
	}
}

if ( ! function_exists( 'delete_option' ) ) {
	function delete_option( string $option ): bool {
		return true;
	}
}

if ( ! function_exists( 'add_option' ) ) {
	function add_option( string $option, mixed $value = '', string $deprecated = '', string|bool $autoload = 'yes' ): bool {
		return true;
	}
}

// -- Transients API --
if ( ! function_exists( 'get_transient' ) ) {
	function get_transient( string $transient ): mixed {
		global $docuforge_test_transients;
		if ( isset( $docuforge_test_transients ) && array_key_exists( $transient, $docuforge_test_transients ) ) {
			return $docuforge_test_transients[ $transient ];
		}
		return false;
	}
}

if ( ! function_exists( 'set_transient' ) ) {
	function set_transient( string $transient, mixed $value, int $expiration = 0 ): bool {
		global $docuforge_test_transients;
		$docuforge_test_transients[ $transient ] = $value;
		return true;
	}
}

if ( ! function_exists( 'delete_transient' ) ) {
	function delete_transient( string $transient ): bool {
		global $docuforge_test_transients;
		unset( $docuforge_test_transients[ $transient ] );
		return true;
	}
}

// -- HTTP API --
if ( ! function_exists( 'wp_remote_get' ) ) {
	function wp_remote_get( string $url, array $args = array() ): array|WP_Error {
		global $docuforge_test_http_responses;
		if ( ! empty( $docuforge_test_http_responses ) ) {
			return array_shift( $docuforge_test_http_responses );
		}
		return array();
	}
}

if ( ! function_exists( 'wp_remote_post' ) ) {
	function wp_remote_post( string $url, array $args = array() ): array|WP_Error {
		global $docuforge_test_http_responses;
		if ( ! empty( $docuforge_test_http_responses ) ) {
			return array_shift( $docuforge_test_http_responses );
		}
		return array();
	}
}

if ( ! function_exists( 'wp_remote_request' ) ) {
	function wp_remote_request( string $url, array $args = array() ): array|WP_Error {
		global $docuforge_test_http_responses;
		if ( ! empty( $docuforge_test_http_responses ) ) {
			return array_shift( $docuforge_test_http_responses );
		}
		return array();
	}
}

if ( ! function_exists( 'wp_remote_retrieve_response_code' ) ) {
	function wp_remote_retrieve_response_code( array $response ): int|string {
		return $response['response']['code'] ?? '';
	}
}

if ( ! function_exists( 'wp_remote_retrieve_body' ) ) {
	function wp_remote_retrieve_body( array $response ): string {
		return $response['body'] ?? '';
	}
}

if ( ! function_exists( 'wp_remote_retrieve_header' ) ) {
	function wp_remote_retrieve_header( array $response, string $header ): string {
		$header = strtolower( $header );
		return $response['headers'][ $header ] ?? '';
	}
}

if ( ! function_exists( 'wp_remote_retrieve_response_message' ) ) {
	function wp_remote_retrieve_response_message( array $response ): string {
		return $response['response']['message'] ?? '';
	}
}

// -- Encoding --
if ( ! function_exists( 'wp_json_encode' ) ) {
	function wp_json_encode( mixed $data, int $options = 0, int $depth = 512 ): string|false {
		return json_encode( $data, $options, $depth );
	}
}

// -- Sanitization --
if ( ! function_exists( 'sanitize_text_field' ) ) {
	function sanitize_text_field( string $str ): string {
		return trim( strip_tags( $str ) );
	}
}

if ( ! function_exists( 'sanitize_key' ) ) {
	function sanitize_key( string $key ): string {
		return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( $key ) );
	}
}

if ( ! function_exists( 'sanitize_file_name' ) ) {
	function sanitize_file_name( string $filename ): string {
		return preg_replace( '/[^a-zA-Z0-9_\-.]/', '', $filename );
	}
}

if ( ! function_exists( 'absint' ) ) {
	function absint( mixed $maybeint ): int {
		return abs( (int) $maybeint );
	}
}

// -- URL helpers --
if ( ! function_exists( 'add_query_arg' ) ) {
	function add_query_arg( ...$args ): string {
		if ( is_array( $args[0] ) ) {
			$query_args = $args[0];
			$url        = $args[1] ?? '';
		} else {
			$query_args = array( $args[0] => $args[1] );
			$url        = $args[2] ?? '';
		}

		$separator = str_contains( $url, '?' ) ? '&' : '?';
		return $url . $separator . http_build_query( $query_args );
	}
}

if ( ! function_exists( 'untrailingslashit' ) ) {
	function untrailingslashit( string $value ): string {
		return rtrim( $value, '/\\' );
	}
}

if ( ! function_exists( 'trailingslashit' ) ) {
	function trailingslashit( string $value ): string {
		return untrailingslashit( $value ) . '/';
	}
}

if ( ! function_exists( 'esc_url_raw' ) ) {
	function esc_url_raw( string $url ): string {
		return filter_var( $url, FILTER_SANITIZE_URL ) ?: '';
	}
}

// -- Error checking --
if ( ! function_exists( 'is_wp_error' ) ) {
	function is_wp_error( mixed $thing ): bool {
		return $thing instanceof WP_Error;
	}
}

// -- Escaping functions --
if ( ! function_exists( 'esc_html' ) ) {
	function esc_html( string $text ): string {
		return htmlspecialchars( $text, ENT_QUOTES, 'UTF-8' );
	}
}

if ( ! function_exists( 'esc_url' ) ) {
	function esc_url( string $url ): string {
		return filter_var( $url, FILTER_SANITIZE_URL ) ?: '';
	}
}

if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( string $text ): string {
		return htmlspecialchars( $text, ENT_QUOTES, 'UTF-8' );
	}
}

if ( ! function_exists( 'esc_attr__' ) ) {
	function esc_attr__( string $text, string $domain = 'default' ): string {
		return esc_attr( $text );
	}
}

if ( ! function_exists( 'esc_html__' ) ) {
	function esc_html__( string $text, string $domain = 'default' ): string {
		return esc_html( $text );
	}
}

if ( ! function_exists( 'esc_html_e' ) ) {
	function esc_html_e( string $text, string $domain = 'default' ): void {
		echo esc_html( $text );
	}
}

// -- i18n --
if ( ! function_exists( '__' ) ) {
	function __( string $text, string $domain = 'default' ): string {
		return $text;
	}
}

if ( ! function_exists( '_e' ) ) {
	function _e( string $text, string $domain = 'default' ): void {
		echo $text;
	}
}

// -- Hooks (no-op stubs) --
if ( ! function_exists( 'add_shortcode' ) ) {
	function add_shortcode( string $tag, callable $callback ): void {}
}

if ( ! function_exists( 'add_action' ) ) {
	function add_action( string $hook, callable $callback, int $priority = 10, int $accepted_args = 1 ): bool {
		return true;
	}
}

if ( ! function_exists( 'add_filter' ) ) {
	function add_filter( string $hook, callable $callback, int $priority = 10, int $accepted_args = 1 ): bool {
		return true;
	}
}

if ( ! function_exists( 'shortcode_atts' ) ) {
	function shortcode_atts( array $defaults, array|string $atts, string $shortcode = '' ): array {
		$atts = (array) $atts;
		$out  = array();
		foreach ( $defaults as $name => $default ) {
			if ( array_key_exists( $name, $atts ) ) {
				$out[ $name ] = $atts[ $name ];
			} else {
				$out[ $name ] = $default;
			}
		}
		// Include extra attributes not in defaults (data_ prefixed ones).
		foreach ( $atts as $name => $value ) {
			if ( ! array_key_exists( $name, $out ) ) {
				$out[ $name ] = $value;
			}
		}
		return $out;
	}
}

// -- Post functions --
if ( ! function_exists( 'get_post' ) ) {
	function get_post( mixed $post = null, string $output = 'OBJECT', string $filter = 'raw' ): mixed {
		global $docuforge_test_post;
		return $docuforge_test_post ?? null;
	}
}

if ( ! function_exists( 'get_post_meta' ) ) {
	function get_post_meta( int $post_id, string $key = '', bool $single = false ): mixed {
		global $docuforge_test_post_meta;
		if ( $single ) {
			return $docuforge_test_post_meta[ $key ] ?? '';
		}
		return $docuforge_test_post_meta[ $key ] ?? array();
	}
}

if ( ! function_exists( 'get_the_title' ) ) {
	function get_the_title( mixed $post = null ): string {
		if ( is_object( $post ) && isset( $post->post_title ) ) {
			return $post->post_title;
		}
		return '';
	}
}

if ( ! function_exists( 'get_the_date' ) ) {
	function get_the_date( string $format = '', mixed $post = null ): string {
		return '2025-06-15';
	}
}

if ( ! function_exists( 'get_the_author_meta' ) ) {
	function get_the_author_meta( string $field, int $user_id = 0 ): string {
		return 'Test Author';
	}
}

if ( ! function_exists( 'get_permalink' ) ) {
	function get_permalink( mixed $post = null ): string {
		return 'https://example.com/test-post/';
	}
}

if ( ! function_exists( 'get_bloginfo' ) ) {
	function get_bloginfo( string $show = '' ): string {
		return match ( $show ) {
			'name' => 'Test Site',
			'url'  => 'https://example.com',
			default => '',
		};
	}
}

if ( ! function_exists( 'home_url' ) ) {
	function home_url( string $path = '' ): string {
		return 'https://example.com' . $path;
	}
}

if ( ! function_exists( 'admin_url' ) ) {
	function admin_url( string $path = '' ): string {
		return 'https://example.com/wp-admin/' . $path;
	}
}

// -- User functions --
if ( ! function_exists( 'wp_get_current_user' ) ) {
	function wp_get_current_user(): object {
		return (object) array(
			'ID'           => 0,
			'display_name' => '',
			'user_email'   => '',
		);
	}
}

if ( ! function_exists( 'current_user_can' ) ) {
	function current_user_can( string $capability, ...$args ): bool {
		global $docuforge_test_user_caps;
		return $docuforge_test_user_caps[ $capability ] ?? false;
	}
}

// -- Upload directory --
if ( ! function_exists( 'wp_upload_dir' ) ) {
	function wp_upload_dir(): array {
		global $docuforge_test_upload_dir;
		if ( isset( $docuforge_test_upload_dir ) && is_array( $docuforge_test_upload_dir ) ) {
			return $docuforge_test_upload_dir;
		}
		return array(
			'basedir' => '/tmp/fake-wp/wp-content/uploads',
			'baseurl' => 'https://example.com/wp-content/uploads',
			'path'    => '/tmp/fake-wp/wp-content/uploads/' . date( 'Y/m' ),
			'url'     => 'https://example.com/wp-content/uploads/' . date( 'Y/m' ),
		);
	}
}

if ( ! function_exists( 'wp_mkdir_p' ) ) {
	function wp_mkdir_p( string $target ): bool {
		if ( ! is_dir( $target ) ) {
			return mkdir( $target, 0755, true );
		}
		return true;
	}
}

// -- Misc admin/ajax stubs --
if ( ! function_exists( 'register_setting' ) ) {
	function register_setting( string $option_group, string $option_name, array $args = array() ): void {}
}

if ( ! function_exists( 'add_settings_section' ) ) {
	function add_settings_section( string $id, string $title, callable $callback, string $page, array $args = array() ): void {}
}

if ( ! function_exists( 'add_settings_field' ) ) {
	function add_settings_field( string $id, string $title, callable $callback, string $page, string $section = 'default', array $args = array() ): void {}
}

if ( ! function_exists( 'add_options_page' ) ) {
	function add_options_page( string $page_title, string $menu_title, string $capability, string $menu_slug, callable $callback, int $position = null ): string {
		return 'settings_page_' . $menu_slug;
	}
}

if ( ! function_exists( 'add_management_page' ) ) {
	function add_management_page( string $page_title, string $menu_title, string $capability, string $menu_slug, callable $callback, int $position = null ): string {
		return 'tools_page_' . $menu_slug;
	}
}

if ( ! function_exists( 'register_rest_route' ) ) {
	function register_rest_route( string $namespace, string $route, array $args = array(), bool $override = false ): bool {
		return true;
	}
}

if ( ! function_exists( 'register_block_type' ) ) {
	function register_block_type( string $block_type, array $args = array() ): void {}
}

if ( ! function_exists( 'wp_enqueue_script' ) ) {
	function wp_enqueue_script( string $handle, string $src = '', array $deps = array(), string|bool|null $ver = false, bool $in_footer = false ): void {}
}

if ( ! function_exists( 'wp_enqueue_style' ) ) {
	function wp_enqueue_style( string $handle, string $src = '', array $deps = array(), string|bool|null $ver = false, string $media = 'all' ): void {}
}

if ( ! function_exists( 'wp_localize_script' ) ) {
	function wp_localize_script( string $handle, string $object_name, array $l10n ): bool {
		return true;
	}
}

if ( ! function_exists( 'wp_create_nonce' ) ) {
	function wp_create_nonce( string $action = '' ): string {
		return 'fake-nonce-' . md5( $action );
	}
}

if ( ! function_exists( 'check_ajax_referer' ) ) {
	function check_ajax_referer( string $action, string $query_arg = '', bool $stop = true ): int|false {
		return 1;
	}
}

if ( ! function_exists( 'wp_send_json_success' ) ) {
	function wp_send_json_success( mixed $data = null, int $status_code = null ): void {}
}

if ( ! function_exists( 'wp_send_json_error' ) ) {
	function wp_send_json_error( mixed $data = null, int $status_code = null ): void {}
}

if ( ! function_exists( 'is_admin' ) ) {
	function is_admin(): bool {
		return false;
	}
}

if ( ! function_exists( 'flush_rewrite_rules' ) ) {
	function flush_rewrite_rules( bool $hard = true ): void {}
}

if ( ! function_exists( 'WP_Filesystem' ) ) {
	function WP_Filesystem(): bool {
		return true;
	}
}

/*
|--------------------------------------------------------------------------
| Require plugin source files
|--------------------------------------------------------------------------
*/
require_once dirname( __DIR__ ) . '/includes/class-docuforge-encryption.php';
require_once dirname( __DIR__ ) . '/includes/class-docuforge-api-client.php';
require_once dirname( __DIR__ ) . '/includes/class-docuforge-shortcode.php';
require_once dirname( __DIR__ ) . '/includes/class-docuforge-rest.php';
require_once dirname( __DIR__ ) . '/includes/class-docuforge-admin.php';
