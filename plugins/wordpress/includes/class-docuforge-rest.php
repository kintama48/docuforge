<?php
/**
 * REST API controller.
 *
 * Registers custom REST routes at /wp-json/docuforge/v1/ for
 * proxying DocuForge API requests and serving cached PDFs.
 *
 * @package DocuForge
 * @since   1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class DocuForge_REST
 *
 * @since 1.0.0
 */
class DocuForge_REST {

	/**
	 * REST namespace.
	 *
	 * @var string
	 */
	private const NAMESPACE = 'docuforge/v1';

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
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Registers all REST routes.
	 *
	 * @since 1.0.0
	 */
	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/templates',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_templates' ),
				'permission_callback' => array( $this, 'check_edit_posts' ),
				'args'                => array(
					'page'  => array(
						'type'              => 'integer',
						'default'           => 1,
						'minimum'           => 1,
						'sanitize_callback' => 'absint',
						'validate_callback' => 'rest_validate_request_arg',
					),
					'limit' => array(
						'type'              => 'integer',
						'default'           => 20,
						'minimum'           => 1,
						'maximum'           => 100,
						'sanitize_callback' => 'absint',
						'validate_callback' => 'rest_validate_request_arg',
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/templates/(?P<id>[a-zA-Z0-9_-]+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_template' ),
				'permission_callback' => array( $this, 'check_edit_posts' ),
				'args'                => array(
					'id' => array(
						'type'              => 'string',
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
						'validate_callback' => 'rest_validate_request_arg',
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/render',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'render_pdf' ),
				'permission_callback' => array( $this, 'check_edit_posts' ),
				'args'                => array(
					'template_id' => array(
						'type'              => 'string',
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
						'validate_callback' => 'rest_validate_request_arg',
					),
					'data'        => array(
						'type'              => 'object',
						'default'           => array(),
						'sanitize_callback' => array( $this, 'sanitize_data_object' ),
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/usage',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_usage' ),
				'permission_callback' => array( $this, 'check_manage_options' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/pdf/(?P<hash>[a-f0-9]+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'serve_pdf' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'hash' => array(
						'type'              => 'string',
						'required'          => true,
						'pattern'           => '^[a-f0-9]+$',
						'sanitize_callback' => 'sanitize_text_field',
						'validate_callback' => 'rest_validate_request_arg',
					),
				),
			)
		);
	}

	/**
	 * Permission callback: user can edit posts.
	 *
	 * @since 1.0.0
	 *
	 * @return bool|WP_Error
	 */
	public function check_edit_posts(): bool|WP_Error {
		if ( current_user_can( 'edit_posts' ) ) {
			return true;
		}
		return new WP_Error(
			'docuforge_rest_forbidden',
			__( 'You do not have permission to access this resource.', 'docuforge' ),
			array( 'status' => 403 )
		);
	}

	/**
	 * Permission callback: user can manage options.
	 *
	 * @since 1.0.0
	 *
	 * @return bool|WP_Error
	 */
	public function check_manage_options(): bool|WP_Error {
		if ( current_user_can( 'manage_options' ) ) {
			return true;
		}
		return new WP_Error(
			'docuforge_rest_forbidden',
			__( 'You do not have permission to access this resource.', 'docuforge' ),
			array( 'status' => 403 )
		);
	}

	/**
	 * Sanitizes a data object by sanitizing all string values.
	 *
	 * @since 1.0.0
	 *
	 * @param mixed $data Input data.
	 * @return array Sanitized data.
	 */
	public function sanitize_data_object( mixed $data ): array {
		if ( ! is_array( $data ) ) {
			return array();
		}

		$sanitized = array();

		foreach ( $data as $key => $value ) {
			$safe_key = sanitize_text_field( $key );
			if ( is_string( $value ) ) {
				$sanitized[ $safe_key ] = sanitize_text_field( $value );
			} elseif ( is_numeric( $value ) ) {
				$sanitized[ $safe_key ] = $value;
			} elseif ( is_bool( $value ) ) {
				$sanitized[ $safe_key ] = $value;
			} elseif ( is_array( $value ) ) {
				$sanitized[ $safe_key ] = $this->sanitize_data_object( $value );
			}
		}

		return $sanitized;
	}

	/**
	 * GET /templates - Lists templates.
	 *
	 * @since 1.0.0
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_templates( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$page  = $request->get_param( 'page' );
		$limit = $request->get_param( 'limit' );

		$result = $this->api_client->list_templates( $page, $limit );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return new WP_REST_Response( $result, 200 );
	}

	/**
	 * GET /templates/:id - Gets a single template.
	 *
	 * @since 1.0.0
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_template( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$template_id = $request->get_param( 'id' );
		$result      = $this->api_client->get_template( $template_id );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return new WP_REST_Response( $result, 200 );
	}

	/**
	 * POST /render - Renders a PDF and returns a URL.
	 *
	 * @since 1.0.0
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function render_pdf( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$template_id = $request->get_param( 'template_id' );
		$data        = $request->get_param( 'data' );

		$result = $this->api_client->render_pdf( $template_id, $data );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		// Store the PDF.
		$hash       = md5( $result['body'] . microtime() );
		$upload_dir = wp_upload_dir();
		$pdf_dir    = trailingslashit( $upload_dir['basedir'] ) . 'docuforge-pdfs';

		if ( ! is_dir( $pdf_dir ) ) {
			wp_mkdir_p( $pdf_dir );
		}

		$filepath = trailingslashit( $pdf_dir ) . $hash . '.pdf';
		file_put_contents( $filepath, $result['body'] ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents

		$pdf_url = trailingslashit( $upload_dir['baseurl'] ) . 'docuforge-pdfs/' . $hash . '.pdf';

		return new WP_REST_Response(
			array(
				'url'       => $pdf_url,
				'render_id' => $result['render_id'],
				'hash'      => $hash,
			),
			200
		);
	}

	/**
	 * GET /usage - Returns usage statistics.
	 *
	 * @since 1.0.0
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_usage( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$result = $this->api_client->get_usage();

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return new WP_REST_Response( $result, 200 );
	}

	/**
	 * GET /pdf/:hash - Serves a cached PDF binary.
	 *
	 * @since 1.0.0
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function serve_pdf( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$hash       = $request->get_param( 'hash' );
		$upload_dir = wp_upload_dir();
		$filepath   = trailingslashit( $upload_dir['basedir'] ) . 'docuforge-pdfs/' . $hash . '.pdf';

		if ( ! file_exists( $filepath ) ) {
			return new WP_Error(
				'docuforge_pdf_not_found',
				__( 'PDF not found.', 'docuforge' ),
				array( 'status' => 404 )
			);
		}

		$pdf_content = file_get_contents( $filepath ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents

		if ( false === $pdf_content ) {
			return new WP_Error(
				'docuforge_pdf_read_error',
				__( 'Failed to read PDF file.', 'docuforge' ),
				array( 'status' => 500 )
			);
		}

		// Send binary response.
		header( 'Content-Type: application/pdf' );
		header( 'Content-Disposition: inline; filename="' . esc_attr( $hash ) . '.pdf"' );
		header( 'Content-Length: ' . strlen( $pdf_content ) );
		header( 'Cache-Control: public, max-age=3600' );

		echo $pdf_content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Binary PDF data.
		exit;
	}
}
