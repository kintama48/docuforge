<?php
/**
 * DocuForge API client.
 *
 * Wraps all communication with the DocuForge API using WordPress HTTP functions.
 *
 * @package DocuForge
 * @since   1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class DocuForge_API_Client
 *
 * @since 1.0.0
 */
class DocuForge_API_Client {

	/**
	 * Base API URL.
	 *
	 * @var string
	 */
	private string $api_url;

	/**
	 * Decrypted API key.
	 *
	 * @var string
	 */
	private string $api_key;

	/**
	 * Request timeout in seconds.
	 *
	 * @var int
	 */
	private int $timeout = 30;

	/**
	 * Constructor.
	 *
	 * Reads API URL and encrypted API key from WordPress options.
	 *
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->api_url = untrailingslashit( get_option( 'docuforge_api_url', 'https://api.docuforge.dev' ) );

		$encrypted_key = get_option( 'docuforge_api_key', '' );
		$decrypted     = DocuForge_Encryption::decrypt( $encrypted_key );
		$this->api_key = is_string( $decrypted ) ? $decrypted : '';
	}

	/**
	 * Checks whether the API client is configured with a key.
	 *
	 * @since 1.0.0
	 * @return bool
	 */
	public function is_configured(): bool {
		return '' !== $this->api_key;
	}

	/**
	 * Lists templates.
	 *
	 * @since 1.0.0
	 *
	 * @param int $page  Page number.
	 * @param int $limit Items per page.
	 * @return array|WP_Error Template list or error.
	 */
	public function list_templates( int $page = 1, int $limit = 20 ): array|WP_Error {
		$url = add_query_arg(
			array(
				'page'  => $page,
				'limit' => $limit,
			),
			$this->api_url . '/v1/templates'
		);

		return $this->request( 'GET', $url );
	}

	/**
	 * Gets a single template by ID.
	 *
	 * @since 1.0.0
	 *
	 * @param string $template_id The template identifier.
	 * @return array|WP_Error Template data or error.
	 */
	public function get_template( string $template_id ): array|WP_Error {
		$url = $this->api_url . '/v1/templates/' . sanitize_text_field( $template_id );
		return $this->request( 'GET', $url );
	}

	/**
	 * Renders a PDF from a template.
	 *
	 * @since 1.0.0
	 *
	 * @param string $template_id The template identifier.
	 * @param array  $data        Key-value data to merge into the template.
	 * @return array{body: string, render_id: string}|WP_Error Binary PDF body and render ID, or error.
	 */
	public function render_pdf( string $template_id, array $data = array() ): array|WP_Error {
		$url  = $this->api_url . '/v1/render';
		$body = wp_json_encode(
			array(
				'template_id' => $template_id,
				'data'        => (object) $data,
			)
		);

		$response = wp_remote_post(
			$url,
			array(
				'timeout' => 60,
				'headers' => array(
					'X-API-Key'    => $this->api_key,
					'Content-Type' => 'application/json',
					'Accept'       => 'application/pdf',
				),
				'body'    => $body,
			)
		);

		if ( is_wp_error( $response ) ) {
			return new WP_Error(
				'docuforge_request_failed',
				sprintf(
					/* translators: %s: Error message. */
					__( 'API request failed: %s', 'docuforge' ),
					$response->get_error_message()
				)
			);
		}

		$code = wp_remote_retrieve_response_code( $response );

		if ( $code < 200 || $code >= 300 ) {
			return $this->handle_error_response( $code, $response );
		}

		$render_id = wp_remote_retrieve_header( $response, 'x-render-id' );

		return array(
			'body'      => wp_remote_retrieve_body( $response ),
			'render_id' => $render_id ? sanitize_text_field( $render_id ) : '',
		);
	}

	/**
	 * Gets account usage statistics.
	 *
	 * @since 1.0.0
	 *
	 * @return array|WP_Error Usage data or error.
	 */
	public function get_usage(): array|WP_Error {
		$url = $this->api_url . '/v1/usage';
		return $this->request( 'GET', $url );
	}

	/**
	 * Makes an API request and returns decoded JSON.
	 *
	 * @since 1.0.0
	 *
	 * @param string $method HTTP method (GET, POST, etc.).
	 * @param string $url    Full request URL.
	 * @param array  $body   Optional request body.
	 * @return array|WP_Error Decoded response or error.
	 */
	private function request( string $method, string $url, array $body = array() ): array|WP_Error {
		if ( ! $this->is_configured() ) {
			return new WP_Error(
				'docuforge_not_configured',
				__( 'DocuForge API key is not configured.', 'docuforge' )
			);
		}

		$args = array(
			'method'  => $method,
			'timeout' => $this->timeout,
			'headers' => array(
				'X-API-Key'    => $this->api_key,
				'Content-Type' => 'application/json',
				'Accept'       => 'application/json',
			),
		);

		if ( ! empty( $body ) ) {
			$args['body'] = wp_json_encode( $body );
		}

		$response = wp_remote_request( $url, $args );

		if ( is_wp_error( $response ) ) {
			return new WP_Error(
				'docuforge_request_failed',
				sprintf(
					/* translators: %s: Error message. */
					__( 'API request failed: %s', 'docuforge' ),
					$response->get_error_message()
				)
			);
		}

		$code = wp_remote_retrieve_response_code( $response );

		if ( $code < 200 || $code >= 300 ) {
			return $this->handle_error_response( $code, $response );
		}

		$decoded = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( null === $decoded ) {
			return new WP_Error(
				'docuforge_invalid_json',
				__( 'Invalid JSON response from DocuForge API.', 'docuforge' )
			);
		}

		return $decoded;
	}

	/**
	 * Handles non-2xx API responses.
	 *
	 * @since 1.0.0
	 *
	 * @param int   $code     HTTP status code.
	 * @param array $response Full wp_remote response.
	 * @return WP_Error
	 */
	private function handle_error_response( int $code, array $response ): WP_Error {
		$body    = wp_remote_retrieve_body( $response );
		$decoded = json_decode( $body, true );
		$message = $decoded['error'] ?? $decoded['message'] ?? wp_remote_retrieve_response_message( $response );

		$error_code = match ( true ) {
			401 === $code => 'docuforge_unauthorized',
			403 === $code => 'docuforge_forbidden',
			404 === $code => 'docuforge_not_found',
			429 === $code => 'docuforge_rate_limited',
			$code >= 500  => 'docuforge_server_error',
			default       => 'docuforge_api_error',
		};

		return new WP_Error(
			$error_code,
			sprintf(
				/* translators: 1: HTTP status code, 2: Error message. */
				__( 'DocuForge API error (%1$d): %2$s', 'docuforge' ),
				$code,
				$message
			),
			array( 'status' => $code )
		);
	}
}
