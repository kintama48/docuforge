<?php
/**
 * Admin settings and template browser.
 *
 * Registers settings pages, handles AJAX connection tests,
 * and provides a template browser under Tools.
 *
 * @package DocuForge
 * @since   1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class DocuForge_Admin
 *
 * @since 1.0.0
 */
class DocuForge_Admin {

	/**
	 * API client instance.
	 *
	 * @var DocuForge_API_Client
	 */
	private DocuForge_API_Client $api_client;

	/**
	 * Settings page hook suffix.
	 *
	 * @var string
	 */
	private string $settings_hook = '';

	/**
	 * Templates page hook suffix.
	 *
	 * @var string
	 */
	private string $templates_hook = '';

	/**
	 * Constructor.
	 *
	 * @since 1.0.0
	 *
	 * @param DocuForge_API_Client $api_client API client instance.
	 */
	public function __construct( DocuForge_API_Client $api_client ) {
		$this->api_client = $api_client;

		add_action( 'admin_menu', array( $this, 'register_menus' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
		add_action( 'wp_ajax_docuforge_test_connection', array( $this, 'ajax_test_connection' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
	}

	/**
	 * Registers admin menu pages.
	 *
	 * @since 1.0.0
	 */
	public function register_menus(): void {
		$this->settings_hook = add_options_page(
			__( 'DocuForge Settings', 'docuforge' ),
			__( 'DocuForge', 'docuforge' ),
			'manage_options',
			'docuforge-settings',
			array( $this, 'render_settings_page' )
		);

		$this->templates_hook = add_management_page(
			__( 'DocuForge Templates', 'docuforge' ),
			__( 'DocuForge Templates', 'docuforge' ),
			'edit_posts',
			'docuforge-templates',
			array( $this, 'render_templates_page' )
		);
	}

	/**
	 * Registers plugin settings.
	 *
	 * @since 1.0.0
	 */
	public function register_settings(): void {
		register_setting(
			'docuforge_settings',
			'docuforge_api_key',
			array(
				'type'              => 'string',
				'sanitize_callback' => array( $this, 'sanitize_api_key' ),
				'default'           => '',
			)
		);

		register_setting(
			'docuforge_settings',
			'docuforge_api_url',
			array(
				'type'              => 'string',
				'sanitize_callback' => array( $this, 'sanitize_api_url' ),
				'default'           => 'https://api.docuforge.dev',
			)
		);

		register_setting(
			'docuforge_settings',
			'docuforge_cache_ttl',
			array(
				'type'              => 'integer',
				'sanitize_callback' => array( $this, 'sanitize_cache_ttl' ),
				'default'           => 300,
			)
		);

		// API Settings section.
		add_settings_section(
			'docuforge_api_section',
			__( 'API Configuration', 'docuforge' ),
			array( $this, 'render_api_section' ),
			'docuforge-settings'
		);

		add_settings_field(
			'docuforge_api_key',
			__( 'API Key', 'docuforge' ),
			array( $this, 'render_api_key_field' ),
			'docuforge-settings',
			'docuforge_api_section'
		);

		add_settings_field(
			'docuforge_api_url',
			__( 'API URL', 'docuforge' ),
			array( $this, 'render_api_url_field' ),
			'docuforge-settings',
			'docuforge_api_section'
		);

		// Cache section.
		add_settings_section(
			'docuforge_cache_section',
			__( 'Cache Settings', 'docuforge' ),
			array( $this, 'render_cache_section' ),
			'docuforge-settings'
		);

		add_settings_field(
			'docuforge_cache_ttl',
			__( 'Cache TTL (seconds)', 'docuforge' ),
			array( $this, 'render_cache_ttl_field' ),
			'docuforge-settings',
			'docuforge_cache_section'
		);
	}

	/**
	 * Enqueues admin assets on plugin pages.
	 *
	 * @since 1.0.0
	 *
	 * @param string $hook_suffix The current admin page hook suffix.
	 */
	public function enqueue_assets( string $hook_suffix ): void {
		if ( $hook_suffix !== $this->settings_hook && $hook_suffix !== $this->templates_hook ) {
			return;
		}

		wp_enqueue_script(
			'docuforge-admin',
			DOCUFORGE_PLUGIN_URL . 'assets/admin.js',
			array( 'jquery' ),
			DOCUFORGE_VERSION,
			true
		);

		wp_localize_script(
			'docuforge-admin',
			'docuforgeAdmin',
			array(
				'ajaxUrl' => admin_url( 'admin-ajax.php' ),
				'nonce'   => wp_create_nonce( 'docuforge_test_connection' ),
				'i18n'    => array(
					'testing'    => __( 'Testing connection...', 'docuforge' ),
					'success'    => __( 'Connection successful!', 'docuforge' ),
					'failed'     => __( 'Connection failed:', 'docuforge' ),
					'copied'     => __( 'Copied!', 'docuforge' ),
					'copyFailed' => __( 'Copy failed', 'docuforge' ),
				),
			)
		);

		wp_enqueue_style(
			'docuforge-admin',
			DOCUFORGE_PLUGIN_URL . 'assets/admin.css',
			array(),
			DOCUFORGE_VERSION
		);
	}

	/**
	 * Sanitizes the API key. Encrypts before storing.
	 *
	 * @since 1.0.0
	 *
	 * @param mixed $value The submitted value.
	 * @return string Encrypted API key.
	 */
	public function sanitize_api_key( mixed $value ): string {
		$value = sanitize_text_field( $value );

		// If the field is empty or the placeholder, keep the existing value.
		if ( '' === $value || str_starts_with( $value, '••••' ) ) {
			return get_option( 'docuforge_api_key', '' );
		}

		$encrypted = DocuForge_Encryption::encrypt( $value );
		return is_string( $encrypted ) ? $encrypted : '';
	}

	/**
	 * Sanitizes the API URL.
	 *
	 * @since 1.0.0
	 *
	 * @param mixed $value The submitted value.
	 * @return string Sanitized URL.
	 */
	public function sanitize_api_url( mixed $value ): string {
		$url = esc_url_raw( trim( $value ) );
		return '' !== $url ? untrailingslashit( $url ) : 'https://api.docuforge.dev';
	}

	/**
	 * Sanitizes the cache TTL.
	 *
	 * @since 1.0.0
	 *
	 * @param mixed $value The submitted value.
	 * @return int Cache TTL in seconds (minimum 0).
	 */
	public function sanitize_cache_ttl( mixed $value ): int {
		$ttl = absint( $value );
		return max( 0, $ttl );
	}

	/**
	 * Renders the API section description.
	 *
	 * @since 1.0.0
	 */
	public function render_api_section(): void {
		echo '<p>' . esc_html__( 'Enter your DocuForge API credentials. You can find your API key in your DocuForge dashboard.', 'docuforge' ) . '</p>';
	}

	/**
	 * Renders the cache section description.
	 *
	 * @since 1.0.0
	 */
	public function render_cache_section(): void {
		echo '<p>' . esc_html__( 'Configure how long rendered PDFs are cached to reduce API calls.', 'docuforge' ) . '</p>';
	}

	/**
	 * Renders the API key field.
	 *
	 * @since 1.0.0
	 */
	public function render_api_key_field(): void {
		$has_key = '' !== get_option( 'docuforge_api_key', '' );
		$display = $has_key ? '••••••••••••••••' : '';
		?>
		<input
			type="password"
			id="docuforge_api_key"
			name="docuforge_api_key"
			value="<?php echo esc_attr( $display ); ?>"
			class="regular-text"
			autocomplete="off"
		/>
		<p class="description">
			<?php esc_html_e( 'Your DocuForge API key. Stored encrypted in the database.', 'docuforge' ); ?>
		</p>
		<?php
	}

	/**
	 * Renders the API URL field.
	 *
	 * @since 1.0.0
	 */
	public function render_api_url_field(): void {
		$value = get_option( 'docuforge_api_url', 'https://api.docuforge.dev' );
		?>
		<input
			type="url"
			id="docuforge_api_url"
			name="docuforge_api_url"
			value="<?php echo esc_url( $value ); ?>"
			class="regular-text"
			placeholder="https://api.docuforge.dev"
		/>
		<p class="description">
			<?php esc_html_e( 'The DocuForge API base URL. Change only if using a self-hosted instance.', 'docuforge' ); ?>
		</p>
		<?php
	}

	/**
	 * Renders the cache TTL field.
	 *
	 * @since 1.0.0
	 */
	public function render_cache_ttl_field(): void {
		$value = get_option( 'docuforge_cache_ttl', 300 );
		?>
		<input
			type="number"
			id="docuforge_cache_ttl"
			name="docuforge_cache_ttl"
			value="<?php echo esc_attr( $value ); ?>"
			class="small-text"
			min="0"
			step="1"
		/>
		<p class="description">
			<?php esc_html_e( 'Time in seconds to cache rendered PDFs. Set to 0 to disable caching.', 'docuforge' ); ?>
		</p>
		<?php
	}

	/**
	 * Renders the settings page.
	 *
	 * @since 1.0.0
	 */
	public function render_settings_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		include DOCUFORGE_PLUGIN_DIR . 'templates/admin-settings.php';
	}

	/**
	 * Renders the template browser page.
	 *
	 * @since 1.0.0
	 */
	public function render_templates_page(): void {
		if ( ! current_user_can( 'edit_posts' ) ) {
			return;
		}

		$page      = isset( $_GET['paged'] ) ? absint( $_GET['paged'] ) : 1; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$templates = $this->api_client->list_templates( $page, 20 );

		include DOCUFORGE_PLUGIN_DIR . 'templates/admin-templates.php';
	}

	/**
	 * AJAX handler for connection test.
	 *
	 * @since 1.0.0
	 */
	public function ajax_test_connection(): void {
		check_ajax_referer( 'docuforge_test_connection', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error(
				array( 'message' => __( 'Insufficient permissions.', 'docuforge' ) ),
				403
			);
		}

		$usage = $this->api_client->get_usage();

		if ( is_wp_error( $usage ) ) {
			wp_send_json_error(
				array( 'message' => $usage->get_error_message() )
			);
		}

		wp_send_json_success(
			array(
				'message' => __( 'Connection successful!', 'docuforge' ),
				'usage'   => $usage,
			)
		);
	}
}
