<?php
/**
 * Main plugin class.
 *
 * Singleton that bootstraps all plugin components.
 *
 * @package DocuForge
 * @since   1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class DocuForge_Plugin
 *
 * @since 1.0.0
 */
class DocuForge_Plugin {

	/**
	 * Singleton instance.
	 *
	 * @var DocuForge_Plugin|null
	 */
	private static ?DocuForge_Plugin $instance = null;

	/**
	 * API client instance.
	 *
	 * @var DocuForge_API_Client|null
	 */
	public ?DocuForge_API_Client $api_client = null;

	/**
	 * Returns the singleton instance.
	 *
	 * @since 1.0.0
	 * @return DocuForge_Plugin
	 */
	public static function get_instance(): DocuForge_Plugin {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor. Loads dependencies and initializes components.
	 *
	 * @since 1.0.0
	 */
	private function __construct() {
		$this->load_dependencies();
		$this->init_components();
	}

	/**
	 * Loads required class files.
	 *
	 * @since 1.0.0
	 */
	private function load_dependencies(): void {
		$includes_dir = DOCUFORGE_PLUGIN_DIR . 'includes/';

		require_once $includes_dir . 'class-docuforge-encryption.php';
		require_once $includes_dir . 'class-docuforge-api-client.php';
		require_once $includes_dir . 'class-docuforge-admin.php';
		require_once $includes_dir . 'class-docuforge-shortcode.php';
		require_once $includes_dir . 'class-docuforge-rest.php';
	}

	/**
	 * Initializes plugin components.
	 *
	 * @since 1.0.0
	 */
	private function init_components(): void {
		$this->api_client = new DocuForge_API_Client();

		if ( is_admin() ) {
			new DocuForge_Admin( $this->api_client );
		}

		new DocuForge_Shortcode( $this->api_client );
		new DocuForge_REST( $this->api_client );

		// Register Gutenberg block.
		add_action( 'init', array( $this, 'register_block' ) );
	}

	/**
	 * Registers the Gutenberg block.
	 *
	 * @since 1.0.0
	 */
	public function register_block(): void {
		$block_dir = DOCUFORGE_PLUGIN_DIR . 'blocks/docuforge-render';

		if ( file_exists( $block_dir . '/block.json' ) ) {
			register_block_type( $block_dir );
		}
	}

	/**
	 * Activation callback. Creates default options.
	 *
	 * @since 1.0.0
	 */
	public static function activate(): void {
		if ( ! current_user_can( 'activate_plugins' ) ) {
			return;
		}

		add_option( 'docuforge_api_key', '' );
		add_option( 'docuforge_api_url', 'https://api.docuforge.dev' );
		add_option( 'docuforge_cache_ttl', 300 );
		add_option( 'docuforge_version', DOCUFORGE_VERSION );

		// Create PDF storage directory.
		$upload_dir = wp_upload_dir();
		$pdf_dir    = trailingslashit( $upload_dir['basedir'] ) . 'docuforge-pdfs';

		if ( ! is_dir( $pdf_dir ) ) {
			wp_mkdir_p( $pdf_dir );

			// Add an index.php to prevent directory listing.
			file_put_contents( $pdf_dir . '/index.php', '<?php // Silence is golden.' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
		}

		flush_rewrite_rules();
	}

	/**
	 * Deactivation callback. Cleans up transients.
	 *
	 * @since 1.0.0
	 */
	public static function deactivate(): void {
		if ( ! current_user_can( 'activate_plugins' ) ) {
			return;
		}

		global $wpdb;

		// Delete all DocuForge transients.
		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
				$wpdb->esc_like( '_transient_docuforge_' ) . '%',
				$wpdb->esc_like( '_transient_timeout_docuforge_' ) . '%'
			)
		);

		flush_rewrite_rules();
	}
}
