<?php
/**
 * Tests for DocuForge_Shortcode class.
 *
 * @package DocuForge
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

/**
 * @covers DocuForge_Shortcode
 */
class ShortcodeTest extends TestCase {

	/**
	 * Mock API client.
	 */
	private $mock_client;

	protected function setUp(): void {
		parent::setUp();

		// Reset global test state.
		global $docuforge_test_post, $docuforge_test_post_meta, $docuforge_test_user_caps;
		$docuforge_test_post      = null;
		$docuforge_test_post_meta = array();
		$docuforge_test_user_caps = array( 'edit_posts' => true );

		$GLOBALS['docuforge_test_options']        = array();
		$GLOBALS['docuforge_test_http_responses'] = array();
		$GLOBALS['docuforge_test_transients']     = array();
		$GLOBALS['docuforge_test_upload_dir']     = null;

		$this->mock_client = Mockery::mock( DocuForge_API_Client::class );
	}

	protected function tearDown(): void {
		Mockery::close();

		global $docuforge_test_post, $docuforge_test_post_meta, $docuforge_test_user_caps;
		$docuforge_test_post      = null;
		$docuforge_test_post_meta = array();
		$docuforge_test_user_caps = array();

		$GLOBALS['docuforge_test_options']        = array();
		$GLOBALS['docuforge_test_http_responses'] = array();
		$GLOBALS['docuforge_test_transients']     = array();
		$GLOBALS['docuforge_test_upload_dir']     = null;

		parent::tearDown();
	}

	/**
	 * Helper: creates a shortcode instance with the mock client.
	 */
	private function create_shortcode(): DocuForge_Shortcode {
		return new DocuForge_Shortcode( $this->mock_client );
	}

	/**
	 * Test that data_ prefixed attributes are extracted correctly.
	 *
	 * We invoke render_shortcode with data_ attributes and verify
	 * the API client receives them with the prefix stripped.
	 */
	public function test_extracts_data_attributes_correctly(): void {
		$shortcode = $this->create_shortcode();

		$this->mock_client
			->shouldReceive( 'is_configured' )
			->andReturn( true );

		$this->mock_client
			->shouldReceive( 'render_pdf' )
			->withArgs( function ( string $template_id, array $data ) {
				return 'tpl_abc123' === $template_id
					&& 'John Doe' === $data['name']
					&& '2025-06-15' === $data['date']
					&& 'INV-001' === $data['invoice_number'];
			} )
			->once()
			->andReturn( array( 'body' => '%PDF-fake', 'render_id' => 'rnd_1' ) );

		// Disable caching for test clarity.
		$GLOBALS['docuforge_test_options'] = array(
			'docuforge_cache_ttl' => 0,
		);

		// Set up writable upload dir.
		$GLOBALS['docuforge_test_upload_dir'] = array(
			'basedir' => sys_get_temp_dir(),
			'baseurl' => 'https://example.com/wp-content/uploads',
		);

		$atts = array(
			'template_id'        => 'tpl_abc123',
			'output'             => 'embed',
			'data_name'          => 'John Doe',
			'data_date'          => '2025-06-15',
			'data_invoice_number' => 'INV-001',
		);

		$result = $shortcode->render_shortcode( $atts );

		// The shortcode should produce HTML output (iframe embed).
		$this->assertStringContainsString( 'docuforge-embed', $result );
	}

	/**
	 * Test that missing template_id returns an error message.
	 */
	public function test_returns_error_for_missing_template_id(): void {
		$shortcode = $this->create_shortcode();

		$result = $shortcode->render_shortcode( array() );

		$this->assertStringContainsString( 'template_id', $result );
		$this->assertStringContainsString( 'docuforge-error', $result );
	}

	/**
	 * Test that an empty template_id returns an error.
	 */
	public function test_returns_error_for_empty_template_id(): void {
		$shortcode = $this->create_shortcode();

		$result = $shortcode->render_shortcode( array( 'template_id' => '' ) );

		$this->assertStringContainsString( 'template_id', $result );
		$this->assertStringContainsString( 'docuforge-error', $result );
	}

	/**
	 * Test resolving {post:title} dynamic placeholder.
	 */
	public function test_resolves_post_title_placeholder(): void {
		global $docuforge_test_post;
		$docuforge_test_post = (object) array(
			'ID'          => 42,
			'post_title'  => 'My Test Post',
			'post_author' => 1,
		);

		$shortcode = $this->create_shortcode();

		$this->mock_client
			->shouldReceive( 'is_configured' )
			->andReturn( true );

		$this->mock_client
			->shouldReceive( 'render_pdf' )
			->withArgs( function ( string $template_id, array $data ) {
				return 'My Test Post' === $data['title'];
			} )
			->once()
			->andReturn( array( 'body' => '%PDF-fake', 'render_id' => 'rnd_2' ) );

		$GLOBALS['docuforge_test_options'] = array(
			'docuforge_cache_ttl' => 0,
		);

		$GLOBALS['docuforge_test_upload_dir'] = array(
			'basedir' => sys_get_temp_dir(),
			'baseurl' => 'https://example.com/wp-content/uploads',
		);

		$atts = array(
			'template_id' => 'tpl_abc123',
			'data_title'  => '{post:title}',
		);

		$result = $shortcode->render_shortcode( $atts );

		$this->assertStringContainsString( 'docuforge-embed', $result );
	}

	/**
	 * Test resolving {post_meta:field} placeholder.
	 */
	public function test_resolves_post_meta_placeholder(): void {
		global $docuforge_test_post, $docuforge_test_post_meta;
		$docuforge_test_post = (object) array(
			'ID'          => 42,
			'post_title'  => 'Event Post',
			'post_author' => 1,
		);
		$docuforge_test_post_meta = array(
			'event_date' => '2025-12-25',
		);

		$shortcode = $this->create_shortcode();

		$this->mock_client
			->shouldReceive( 'is_configured' )
			->andReturn( true );

		$this->mock_client
			->shouldReceive( 'render_pdf' )
			->withArgs( function ( string $template_id, array $data ) {
				return '2025-12-25' === $data['event_date'];
			} )
			->once()
			->andReturn( array( 'body' => '%PDF-fake', 'render_id' => 'rnd_3' ) );

		$GLOBALS['docuforge_test_options'] = array(
			'docuforge_cache_ttl' => 0,
		);

		$GLOBALS['docuforge_test_upload_dir'] = array(
			'basedir' => sys_get_temp_dir(),
			'baseurl' => 'https://example.com/wp-content/uploads',
		);

		$atts = array(
			'template_id'    => 'tpl_abc123',
			'data_event_date' => '{post_meta:event_date}',
		);

		$result = $shortcode->render_shortcode( $atts );

		$this->assertStringContainsString( 'docuforge-embed', $result );
	}

	/**
	 * Test that output=embed generates an iframe.
	 */
	public function test_generates_embed_iframe_html(): void {
		$shortcode = $this->create_shortcode();

		$this->mock_client
			->shouldReceive( 'is_configured' )
			->andReturn( true );

		$this->mock_client
			->shouldReceive( 'render_pdf' )
			->once()
			->andReturn( array( 'body' => '%PDF-fake', 'render_id' => 'rnd_4' ) );

		$GLOBALS['docuforge_test_options'] = array(
			'docuforge_cache_ttl' => 0,
		);

		$GLOBALS['docuforge_test_upload_dir'] = array(
			'basedir' => sys_get_temp_dir(),
			'baseurl' => 'https://example.com/wp-content/uploads',
		);

		$atts = array(
			'template_id' => 'tpl_abc123',
			'output'      => 'embed',
			'width'       => '800px',
			'height'      => '500px',
		);

		$result = $shortcode->render_shortcode( $atts );

		$this->assertStringContainsString( '<div class="docuforge-embed">', $result );
		$this->assertStringContainsString( '<iframe', $result );
		$this->assertStringContainsString( 'width="800px"', $result );
		$this->assertStringContainsString( 'height="500px"', $result );
		$this->assertStringContainsString( '.pdf', $result );
	}

	/**
	 * Test that output=download generates a download link.
	 */
	public function test_generates_download_link(): void {
		$shortcode = $this->create_shortcode();

		$this->mock_client
			->shouldReceive( 'is_configured' )
			->andReturn( true );

		$this->mock_client
			->shouldReceive( 'render_pdf' )
			->once()
			->andReturn( array( 'body' => '%PDF-fake', 'render_id' => 'rnd_5' ) );

		$GLOBALS['docuforge_test_options'] = array(
			'docuforge_cache_ttl' => 0,
		);

		$GLOBALS['docuforge_test_upload_dir'] = array(
			'basedir' => sys_get_temp_dir(),
			'baseurl' => 'https://example.com/wp-content/uploads',
		);

		$atts = array(
			'template_id' => 'tpl_abc123',
			'output'      => 'download',
		);

		$result = $shortcode->render_shortcode( $atts );

		$this->assertStringContainsString( '<div class="docuforge-download">', $result );
		$this->assertStringContainsString( '<a href=', $result );
		$this->assertStringContainsString( 'download=', $result );
		$this->assertStringContainsString( 'docuforge-download-link', $result );
		$this->assertStringContainsString( '.pdf', $result );
	}

	/**
	 * Test that a cached PDF URL from transients is used instead of calling the API.
	 */
	public function test_uses_cached_result_from_transients(): void {
		$shortcode = $this->create_shortcode();

		$cached_url = 'https://example.com/wp-content/uploads/docuforge-pdfs/cached123.pdf';

		$this->mock_client
			->shouldReceive( 'is_configured' )
			->andReturn( true );

		// render_pdf should NOT be called when cache hit occurs.
		$this->mock_client
			->shouldNotReceive( 'render_pdf' );

		$GLOBALS['docuforge_test_options'] = array(
			'docuforge_cache_ttl' => 300,
		);

		// Pre-populate the transient cache. We need to compute the same cache key
		// the shortcode will use: 'docuforge_pdf_' . md5( template_id . json_encode( data ) )
		$cache_key = 'docuforge_pdf_' . md5( 'tpl_abc123' . wp_json_encode( array() ) );
		$GLOBALS['docuforge_test_transients'] = array(
			$cache_key => $cached_url,
		);

		$atts = array(
			'template_id' => 'tpl_abc123',
			'output'      => 'embed',
		);

		$result = $shortcode->render_shortcode( $atts );

		$this->assertStringContainsString( 'docuforge-embed', $result );
		$this->assertStringContainsString( $cached_url, $result );
	}

	/**
	 * Test that an API failure shows an error message.
	 */
	public function test_shows_error_message_on_api_failure(): void {
		$shortcode = $this->create_shortcode();

		$this->mock_client
			->shouldReceive( 'is_configured' )
			->andReturn( true );

		$this->mock_client
			->shouldReceive( 'render_pdf' )
			->once()
			->andReturn( new WP_Error( 'docuforge_server_error', 'Internal engine error' ) );

		$GLOBALS['docuforge_test_options'] = array(
			'docuforge_cache_ttl' => 0,
		);

		$atts = array(
			'template_id' => 'tpl_abc123',
		);

		$result = $shortcode->render_shortcode( $atts );

		$this->assertStringContainsString( 'docuforge-error', $result );
		$this->assertStringContainsString( 'Internal engine error', $result );
	}

	/**
	 * Test that unconfigured API client shows an error in shortcode output.
	 */
	public function test_shows_error_when_api_not_configured(): void {
		$shortcode = $this->create_shortcode();

		$this->mock_client
			->shouldReceive( 'is_configured' )
			->andReturn( false );

		$atts = array(
			'template_id' => 'tpl_abc123',
		);

		$result = $shortcode->render_shortcode( $atts );

		$this->assertStringContainsString( 'docuforge-error', $result );
		$this->assertStringContainsString( 'API key is not configured', $result );
	}

	/**
	 * Test that non-editor users see a generic error message.
	 */
	public function test_non_editor_sees_generic_error(): void {
		global $docuforge_test_user_caps;
		$docuforge_test_user_caps = array( 'edit_posts' => false );

		$shortcode = $this->create_shortcode();

		$result = $shortcode->render_shortcode( array() );

		$this->assertStringContainsString( 'docuforge-error', $result );
		$this->assertStringContainsString( 'could not be loaded', $result );
		// Should NOT contain the detailed error message.
		$this->assertStringNotContainsString( 'template_id', $result );
	}

	/**
	 * Test that the shortcode uses default width and height when not specified.
	 */
	public function test_uses_default_dimensions(): void {
		$shortcode = $this->create_shortcode();

		$this->mock_client
			->shouldReceive( 'is_configured' )
			->andReturn( true );

		$this->mock_client
			->shouldReceive( 'render_pdf' )
			->once()
			->andReturn( array( 'body' => '%PDF-fake', 'render_id' => 'rnd_6' ) );

		$GLOBALS['docuforge_test_options'] = array(
			'docuforge_cache_ttl' => 0,
		);

		$GLOBALS['docuforge_test_upload_dir'] = array(
			'basedir' => sys_get_temp_dir(),
			'baseurl' => 'https://example.com/wp-content/uploads',
		);

		$atts = array(
			'template_id' => 'tpl_abc123',
		);

		$result = $shortcode->render_shortcode( $atts );

		$this->assertStringContainsString( 'width="100%"', $result );
		$this->assertStringContainsString( 'height="600px"', $result );
	}
}
