<?php
/**
 * Tests for DocuForge_API_Client class.
 *
 * @package DocuForge
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

/**
 * @covers DocuForge_API_Client
 */
class ApiClientTest extends TestCase {

	/**
	 * Mock templates list JSON response.
	 */
	private const TEMPLATES_RESPONSE = '{"data":{"templates":[{"id":"tpl_abc123","name":"Invoice Template","description":"Professional invoice","created_at":"2025-01-15T10:30:00Z","updated_at":"2025-06-20T14:00:00Z"},{"id":"tpl_def456","name":"Receipt","description":"Simple receipt","created_at":"2025-02-10T08:00:00Z","updated_at":"2025-05-15T12:00:00Z"}],"pagination":{"page":1,"limit":20,"total":2}}}';

	/**
	 * Mock usage JSON response.
	 */
	private const USAGE_RESPONSE = '{"data":{"plan":"pro","renders":{"used":42,"limit":1000,"remaining":958},"period":{"start":"2025-06-01T00:00:00Z","end":"2025-07-01T00:00:00Z"}}}';

	/**
	 * Encrypted API key for tests.
	 */
	private string $encrypted_key;

	protected function setUp(): void {
		parent::setUp();

		// Reset all global test state.
		$GLOBALS['docuforge_test_options']        = array();
		$GLOBALS['docuforge_test_http_responses'] = array();
		$GLOBALS['docuforge_test_transients']     = array();

		// Encrypt a test key to use in get_option stubs.
		$this->encrypted_key = DocuForge_Encryption::encrypt( 'test-api-key-12345' );
	}

	protected function tearDown(): void {
		$GLOBALS['docuforge_test_options']        = array();
		$GLOBALS['docuforge_test_http_responses'] = array();
		$GLOBALS['docuforge_test_transients']     = array();
		parent::tearDown();
	}

	/**
	 * Helper: creates an API client with the API key configured.
	 */
	private function create_configured_client(): DocuForge_API_Client {
		$GLOBALS['docuforge_test_options'] = array(
			'docuforge_api_url' => 'https://api.docuforge.dev',
			'docuforge_api_key' => $this->encrypted_key,
		);

		return new DocuForge_API_Client();
	}

	/**
	 * Helper: creates an API client with no API key (unconfigured).
	 */
	private function create_unconfigured_client(): DocuForge_API_Client {
		$GLOBALS['docuforge_test_options'] = array(
			'docuforge_api_url' => 'https://api.docuforge.dev',
			'docuforge_api_key' => '',
		);

		return new DocuForge_API_Client();
	}

	/**
	 * Helper: builds a mock wp_remote response array.
	 */
	private function mock_http_response( int $code, string $body, string $message = 'OK', array $headers = array() ): array {
		return array(
			'response' => array(
				'code'    => $code,
				'message' => $message,
			),
			'body'    => $body,
			'headers' => $headers,
		);
	}

	/**
	 * Test that an unconfigured client (no API key) returns WP_Error.
	 */
	public function test_returns_error_when_not_configured(): void {
		$client = $this->create_unconfigured_client();

		$this->assertFalse( $client->is_configured() );

		$result = $client->list_templates();

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'docuforge_not_configured', $result->get_error_code() );
	}

	/**
	 * Test list_templates() returns template array on success.
	 */
	public function test_list_templates_returns_templates_on_success(): void {
		$client = $this->create_configured_client();

		$GLOBALS['docuforge_test_http_responses'] = array(
			$this->mock_http_response( 200, self::TEMPLATES_RESPONSE ),
		);

		$result = $client->list_templates();

		$this->assertIsArray( $result );
		$this->assertArrayHasKey( 'data', $result );
		$this->assertCount( 2, $result['data']['templates'] );
		$this->assertSame( 'tpl_abc123', $result['data']['templates'][0]['id'] );
		$this->assertSame( 'Invoice Template', $result['data']['templates'][0]['name'] );
		$this->assertSame( 'tpl_def456', $result['data']['templates'][1]['id'] );
	}

	/**
	 * Test list_templates() returns WP_Error on 401 Unauthorized.
	 */
	public function test_list_templates_returns_error_on_401(): void {
		$client = $this->create_configured_client();

		$GLOBALS['docuforge_test_http_responses'] = array(
			$this->mock_http_response(
				401,
				'{"error":"Invalid API key"}',
				'Unauthorized'
			),
		);

		$result = $client->list_templates();

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'docuforge_unauthorized', $result->get_error_code() );
		$this->assertStringContainsString( 'Invalid API key', $result->get_error_message() );
	}

	/**
	 * Test get_template() calls the correct URL with template ID.
	 */
	public function test_get_template_calls_correct_url(): void {
		$client = $this->create_configured_client();

		$template_data = '{"data":{"id":"tpl_abc123","name":"Invoice Template"}}';

		$GLOBALS['docuforge_test_http_responses'] = array(
			$this->mock_http_response( 200, $template_data ),
		);

		$result = $client->get_template( 'tpl_abc123' );

		$this->assertIsArray( $result );
		$this->assertSame( 'tpl_abc123', $result['data']['id'] );
	}

	/**
	 * Test render_pdf() sends correct payload and returns PDF body + render_id.
	 */
	public function test_render_pdf_returns_body_and_render_id(): void {
		$client = $this->create_configured_client();

		$pdf_binary = '%PDF-1.4 fake binary content here';

		$GLOBALS['docuforge_test_http_responses'] = array(
			$this->mock_http_response(
				200,
				$pdf_binary,
				'OK',
				array( 'x-render-id' => 'rnd_xyz789' )
			),
		);

		$result = $client->render_pdf( 'tpl_abc123', array( 'name' => 'John Doe' ) );

		$this->assertIsArray( $result );
		$this->assertSame( $pdf_binary, $result['body'] );
		$this->assertSame( 'rnd_xyz789', $result['render_id'] );
	}

	/**
	 * Test render_pdf() returns WP_Error on 500 Internal Server Error.
	 */
	public function test_render_pdf_returns_error_on_500(): void {
		$client = $this->create_configured_client();

		$GLOBALS['docuforge_test_http_responses'] = array(
			$this->mock_http_response(
				500,
				'{"error":"Internal engine error"}',
				'Internal Server Error'
			),
		);

		$result = $client->render_pdf( 'tpl_abc123', array() );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'docuforge_server_error', $result->get_error_code() );
		$this->assertStringContainsString( 'Internal engine error', $result->get_error_message() );
	}

	/**
	 * Test get_usage() returns usage statistics on success.
	 */
	public function test_get_usage_returns_usage_stats(): void {
		$client = $this->create_configured_client();

		$GLOBALS['docuforge_test_http_responses'] = array(
			$this->mock_http_response( 200, self::USAGE_RESPONSE ),
		);

		$result = $client->get_usage();

		$this->assertIsArray( $result );
		$this->assertSame( 'pro', $result['data']['plan'] );
		$this->assertSame( 42, $result['data']['renders']['used'] );
		$this->assertSame( 1000, $result['data']['renders']['limit'] );
		$this->assertSame( 958, $result['data']['renders']['remaining'] );
	}

	/**
	 * Test that a network error (wp_remote returns WP_Error) is handled.
	 */
	public function test_handles_network_error(): void {
		$client = $this->create_configured_client();

		$network_error = new WP_Error( 'http_request_failed', 'cURL error 28: Connection timed out' );

		$GLOBALS['docuforge_test_http_responses'] = array( $network_error );

		$result = $client->list_templates();

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'docuforge_request_failed', $result->get_error_code() );
		$this->assertStringContainsString( 'Connection timed out', $result->get_error_message() );
	}

	/**
	 * Test that a network error on render_pdf is handled.
	 */
	public function test_render_pdf_handles_network_error(): void {
		$client = $this->create_configured_client();

		$network_error = new WP_Error( 'http_request_failed', 'DNS resolution failed' );

		$GLOBALS['docuforge_test_http_responses'] = array( $network_error );

		$result = $client->render_pdf( 'tpl_abc123' );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'docuforge_request_failed', $result->get_error_code() );
		$this->assertStringContainsString( 'DNS resolution failed', $result->get_error_message() );
	}

	/**
	 * Test that 429 rate limited response is handled correctly.
	 */
	public function test_handles_429_rate_limited_response(): void {
		$client = $this->create_configured_client();

		$GLOBALS['docuforge_test_http_responses'] = array(
			$this->mock_http_response(
				429,
				'{"error":"Rate limit exceeded. Try again in 60 seconds."}',
				'Too Many Requests'
			),
		);

		$result = $client->list_templates();

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'docuforge_rate_limited', $result->get_error_code() );
		$this->assertStringContainsString( 'Rate limit exceeded', $result->get_error_message() );
	}

	/**
	 * Test that invalid JSON response is handled.
	 */
	public function test_handles_invalid_json_response(): void {
		$client = $this->create_configured_client();

		$GLOBALS['docuforge_test_http_responses'] = array(
			$this->mock_http_response( 200, 'this is not valid json {{[' ),
		);

		$result = $client->list_templates();

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'docuforge_invalid_json', $result->get_error_code() );
	}

	/**
	 * Test that a 403 Forbidden response produces the correct error code.
	 */
	public function test_handles_403_forbidden(): void {
		$client = $this->create_configured_client();

		$GLOBALS['docuforge_test_http_responses'] = array(
			$this->mock_http_response(
				403,
				'{"error":"Access denied to this resource"}',
				'Forbidden'
			),
		);

		$result = $client->get_usage();

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'docuforge_forbidden', $result->get_error_code() );
	}

	/**
	 * Test that a 404 Not Found response produces the correct error code.
	 */
	public function test_handles_404_not_found(): void {
		$client = $this->create_configured_client();

		$GLOBALS['docuforge_test_http_responses'] = array(
			$this->mock_http_response(
				404,
				'{"error":"Template not found"}',
				'Not Found'
			),
		);

		$result = $client->get_template( 'tpl_nonexistent' );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'docuforge_not_found', $result->get_error_code() );
	}

	/**
	 * Test that error response with 'message' key (instead of 'error') is handled.
	 */
	public function test_handles_error_response_with_message_key(): void {
		$client = $this->create_configured_client();

		$GLOBALS['docuforge_test_http_responses'] = array(
			$this->mock_http_response(
				400,
				'{"message":"Bad request: missing required field"}',
				'Bad Request'
			),
		);

		$result = $client->list_templates();

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'docuforge_api_error', $result->get_error_code() );
		$this->assertStringContainsString( 'Bad request', $result->get_error_message() );
	}

	/**
	 * Test that the configured client has is_configured() returning true.
	 */
	public function test_configured_client_returns_true(): void {
		$client = $this->create_configured_client();
		$this->assertTrue( $client->is_configured() );
	}

	/**
	 * Test list_templates passes pagination parameters.
	 */
	public function test_list_templates_passes_pagination(): void {
		$client = $this->create_configured_client();

		$GLOBALS['docuforge_test_http_responses'] = array(
			$this->mock_http_response( 200, self::TEMPLATES_RESPONSE ),
		);

		$result = $client->list_templates( 2, 10 );

		$this->assertIsArray( $result );
	}
}
