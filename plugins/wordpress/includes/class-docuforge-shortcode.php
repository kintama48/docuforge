<?php
/**
 * Shortcode handler.
 *
 * Provides the [docuforge] shortcode for embedding or downloading PDFs
 * rendered from DocuForge templates.
 *
 * @package DocuForge
 * @since   1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class DocuForge_Shortcode
 *
 * @since 1.0.0
 */
class DocuForge_Shortcode {

	/**
	 * API client instance.
	 *
	 * @var DocuForge_API_Client
	 */
	private DocuForge_API_Client $api_client;

	/**
	 * Constructor.
	 *
	 * @since 1.0.0
	 *
	 * @param DocuForge_API_Client $api_client API client instance.
	 */
	public function __construct( DocuForge_API_Client $api_client ) {
		$this->api_client = $api_client;
		add_shortcode( 'docuforge', array( $this, 'render_shortcode' ) );
	}

	/**
	 * Processes the [docuforge] shortcode.
	 *
	 * Usage:
	 *   [docuforge template_id="tpl_xxx" data_name="John" data_date="{post_meta:event_date}" output="embed" width="100%" height="600px"]
	 *
	 * @since 1.0.0
	 *
	 * @param array|string $atts    Shortcode attributes.
	 * @param string|null  $content Shortcode content (unused).
	 * @return string HTML output.
	 */
	public function render_shortcode( array|string $atts, ?string $content = null ): string {
		$atts = shortcode_atts(
			array(
				'template_id' => '',
				'output'      => 'embed',
				'width'       => '100%',
				'height'      => '600px',
			),
			$atts,
			'docuforge'
		);

		$template_id = sanitize_text_field( $atts['template_id'] );

		if ( '' === $template_id ) {
			return $this->render_error( __( 'DocuForge: template_id attribute is required.', 'docuforge' ) );
		}

		if ( ! $this->api_client->is_configured() ) {
			return $this->render_error( __( 'DocuForge: API key is not configured.', 'docuforge' ) );
		}

		// Extract data_ prefixed attributes.
		$data = $this->extract_data_attributes( $atts );

		// Resolve dynamic values.
		$data = $this->resolve_dynamic_values( $data );

		// Build cache key.
		$cache_key = 'docuforge_pdf_' . md5( $template_id . wp_json_encode( $data ) );
		$cache_ttl = absint( get_option( 'docuforge_cache_ttl', 300 ) );

		// Check cache.
		$pdf_url = false;
		if ( $cache_ttl > 0 ) {
			$pdf_url = get_transient( $cache_key );
		}

		if ( false === $pdf_url ) {
			$result = $this->api_client->render_pdf( $template_id, $data );

			if ( is_wp_error( $result ) ) {
				return $this->render_error(
					sprintf(
						/* translators: %s: Error message. */
						__( 'DocuForge render error: %s', 'docuforge' ),
						$result->get_error_message()
					)
				);
			}

			// Store PDF to filesystem.
			$hash    = md5( $result['body'] . microtime() );
			$pdf_url = $this->store_pdf( $hash, $result['body'] );

			if ( is_wp_error( $pdf_url ) ) {
				return $this->render_error( $pdf_url->get_error_message() );
			}

			if ( $cache_ttl > 0 ) {
				set_transient( $cache_key, $pdf_url, $cache_ttl );
			}
		}

		$output = sanitize_text_field( $atts['output'] );
		$width  = sanitize_text_field( $atts['width'] );
		$height = sanitize_text_field( $atts['height'] );

		if ( 'download' === $output ) {
			return $this->render_download_link( $pdf_url, $template_id );
		}

		return $this->render_embed( $pdf_url, $width, $height );
	}

	/**
	 * Extracts data_ prefixed attributes as template data.
	 *
	 * @since 1.0.0
	 *
	 * @param array $atts All shortcode attributes.
	 * @return array Key-value pairs with the data_ prefix stripped.
	 */
	private function extract_data_attributes( array $atts ): array {
		$data     = array();
		$reserved = array( 'template_id', 'output', 'width', 'height' );

		foreach ( $atts as $key => $value ) {
			if ( str_starts_with( $key, 'data_' ) ) {
				$data_key          = substr( $key, 5 );
				$data[ $data_key ] = $value;
			} elseif ( ! in_array( $key, $reserved, true ) ) {
				// Also include non-reserved attributes as data.
				$data[ $key ] = $value;
			}
		}

		return $data;
	}

	/**
	 * Resolves dynamic value placeholders in data values.
	 *
	 * Supported placeholders:
	 *   {post_meta:field_name} - Post meta value from current post.
	 *   {post:title}           - Current post title.
	 *   {post:id}              - Current post ID.
	 *   {post:date}            - Current post date.
	 *   {post:author}          - Current post author display name.
	 *   {site:name}            - Site name.
	 *   {site:url}             - Site URL.
	 *   {user:display_name}    - Current user display name.
	 *   {user:email}           - Current user email.
	 *
	 * @since 1.0.0
	 *
	 * @param array $data Template data with potential placeholders.
	 * @return array Resolved data.
	 */
	private function resolve_dynamic_values( array $data ): array {
		$post = get_post();

		foreach ( $data as $key => $value ) {
			if ( ! is_string( $value ) ) {
				continue;
			}

			// Resolve {post_meta:field_name}.
			$value = preg_replace_callback(
				'/\{post_meta:([a-zA-Z0-9_-]+)\}/',
				function ( array $matches ) use ( $post ): string {
					if ( ! $post ) {
						return '';
					}
					return (string) get_post_meta( $post->ID, sanitize_key( $matches[1] ), true );
				},
				$value
			);

			// Resolve {post:property}.
			$value = preg_replace_callback(
				'/\{post:([a-zA-Z_]+)\}/',
				function ( array $matches ) use ( $post ): string {
					if ( ! $post ) {
						return '';
					}
					return match ( $matches[1] ) {
						'title'  => get_the_title( $post ),
						'id'     => (string) $post->ID,
						'date'   => get_the_date( 'Y-m-d', $post ),
						'author' => get_the_author_meta( 'display_name', $post->post_author ),
						'url'    => get_permalink( $post ),
						default  => '',
					};
				},
				$value
			);

			// Resolve {site:property}.
			$value = preg_replace_callback(
				'/\{site:([a-zA-Z_]+)\}/',
				function ( array $matches ): string {
					return match ( $matches[1] ) {
						'name' => get_bloginfo( 'name' ),
						'url'  => home_url(),
						default => '',
					};
				},
				$value
			);

			// Resolve {user:property}.
			$value = preg_replace_callback(
				'/\{user:([a-zA-Z_]+)\}/',
				function ( array $matches ): string {
					$user = wp_get_current_user();
					if ( 0 === $user->ID ) {
						return '';
					}
					return match ( $matches[1] ) {
						'display_name' => $user->display_name,
						'email'        => $user->user_email,
						'id'           => (string) $user->ID,
						default        => '',
					};
				},
				$value
			);

			$data[ $key ] = $value;
		}

		return $data;
	}

	/**
	 * Stores a rendered PDF to the uploads directory.
	 *
	 * @since 1.0.0
	 *
	 * @param string $hash     Unique hash for the filename.
	 * @param string $pdf_body Binary PDF content.
	 * @return string|WP_Error URL to the stored PDF or error.
	 */
	private function store_pdf( string $hash, string $pdf_body ): string|WP_Error {
		$upload_dir = wp_upload_dir();
		$pdf_dir    = trailingslashit( $upload_dir['basedir'] ) . 'docuforge-pdfs';

		if ( ! is_dir( $pdf_dir ) ) {
			wp_mkdir_p( $pdf_dir );
		}

		$filename = $hash . '.pdf';
		$filepath = trailingslashit( $pdf_dir ) . $filename;

		global $wp_filesystem;

		if ( ! function_exists( 'WP_Filesystem' ) ) {
			require_once ABSPATH . 'wp-admin/includes/file.php';
		}

		WP_Filesystem();

		if ( $wp_filesystem && $wp_filesystem->put_contents( $filepath, $pdf_body, FS_CHMOD_FILE ) ) {
			return trailingslashit( $upload_dir['baseurl'] ) . 'docuforge-pdfs/' . $filename;
		}

		// Fallback to file_put_contents if WP_Filesystem is not available.
		if ( false !== file_put_contents( $filepath, $pdf_body ) ) { // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
			return trailingslashit( $upload_dir['baseurl'] ) . 'docuforge-pdfs/' . $filename;
		}

		return new WP_Error(
			'docuforge_storage_error',
			__( 'Failed to store rendered PDF.', 'docuforge' )
		);
	}

	/**
	 * Renders an iframe embed for the PDF.
	 *
	 * @since 1.0.0
	 *
	 * @param string $url    PDF URL.
	 * @param string $width  Iframe width.
	 * @param string $height Iframe height.
	 * @return string HTML iframe.
	 */
	private function render_embed( string $url, string $width, string $height ): string {
		return sprintf(
			'<div class="docuforge-embed"><iframe src="%s" width="%s" height="%s" style="border:none;" title="%s" loading="lazy"></iframe></div>',
			esc_url( $url ),
			esc_attr( $width ),
			esc_attr( $height ),
			esc_attr__( 'DocuForge PDF Document', 'docuforge' )
		);
	}

	/**
	 * Renders a download link for the PDF.
	 *
	 * @since 1.0.0
	 *
	 * @param string $url         PDF URL.
	 * @param string $template_id Template ID for the filename.
	 * @return string HTML anchor element.
	 */
	private function render_download_link( string $url, string $template_id ): string {
		$filename = sanitize_file_name( $template_id ) . '.pdf';

		return sprintf(
			'<div class="docuforge-download"><a href="%s" download="%s" class="docuforge-download-link">%s</a></div>',
			esc_url( $url ),
			esc_attr( $filename ),
			esc_html(
				sprintf(
					/* translators: %s: PDF filename. */
					__( 'Download %s', 'docuforge' ),
					$filename
				)
			)
		);
	}

	/**
	 * Renders a user-friendly error message.
	 *
	 * @since 1.0.0
	 *
	 * @param string $message Error message.
	 * @return string HTML error notice.
	 */
	private function render_error( string $message ): string {
		if ( current_user_can( 'edit_posts' ) ) {
			return sprintf(
				'<div class="docuforge-error" style="padding:12px;border:1px solid #d63638;border-radius:4px;background:#fcf0f1;color:#d63638;">%s</div>',
				esc_html( $message )
			);
		}

		// Show generic message to non-editors.
		return sprintf(
			'<div class="docuforge-error">%s</div>',
			esc_html__( 'The document could not be loaded at this time.', 'docuforge' )
		);
	}
}
