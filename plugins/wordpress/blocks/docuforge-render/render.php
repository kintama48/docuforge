<?php
/**
 * Server-side render for the DocuForge Render block.
 *
 * @package DocuForge
 * @since   1.0.0
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Block content.
 * @var WP_Block $block      Block instance.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$template_id = isset( $attributes['templateId'] ) ? sanitize_text_field( $attributes['templateId'] ) : '';
$output_mode = isset( $attributes['output'] ) ? sanitize_text_field( $attributes['output'] ) : 'embed';
$data        = isset( $attributes['data'] ) && is_array( $attributes['data'] ) ? $attributes['data'] : array();
$width       = isset( $attributes['width'] ) ? sanitize_text_field( $attributes['width'] ) : '100%';
$height      = isset( $attributes['height'] ) ? sanitize_text_field( $attributes['height'] ) : '600px';

if ( '' === $template_id ) {
	if ( current_user_can( 'edit_posts' ) ) {
		printf(
			'<div class="docuforge-error" %s><p>%s</p></div>',
			wp_kses_post( get_block_wrapper_attributes() ),
			esc_html__( 'DocuForge: No template selected.', 'docuforge' )
		);
	}
	return;
}

// Get the plugin API client.
$plugin     = DocuForge_Plugin::get_instance();
$api_client = $plugin->api_client;

if ( ! $api_client || ! $api_client->is_configured() ) {
	if ( current_user_can( 'edit_posts' ) ) {
		printf(
			'<div class="docuforge-error" %s><p>%s</p></div>',
			wp_kses_post( get_block_wrapper_attributes() ),
			esc_html__( 'DocuForge: API key is not configured.', 'docuforge' )
		);
	}
	return;
}

// Sanitize data values.
$sanitized_data = array();
foreach ( $data as $key => $value ) {
	$safe_key = sanitize_text_field( $key );
	if ( is_string( $value ) ) {
		$sanitized_data[ $safe_key ] = sanitize_text_field( $value );
	} elseif ( is_numeric( $value ) ) {
		$sanitized_data[ $safe_key ] = $value;
	}
}

// Resolve dynamic values (same as shortcode).
$post = get_post();

foreach ( $sanitized_data as $key => $value ) {
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

	$sanitized_data[ $key ] = $value;
}

// Build cache key.
$cache_key = 'docuforge_pdf_' . md5( $template_id . wp_json_encode( $sanitized_data ) );
$cache_ttl = absint( get_option( 'docuforge_cache_ttl', 300 ) );

// Check cache.
$pdf_url = false;
if ( $cache_ttl > 0 ) {
	$pdf_url = get_transient( $cache_key );
}

if ( false === $pdf_url ) {
	$result = $api_client->render_pdf( $template_id, $sanitized_data );

	if ( is_wp_error( $result ) ) {
		if ( current_user_can( 'edit_posts' ) ) {
			printf(
				'<div class="docuforge-error" %s><p>%s</p></div>',
				wp_kses_post( get_block_wrapper_attributes() ),
				esc_html(
					sprintf(
						/* translators: %s: Error message. */
						__( 'DocuForge render error: %s', 'docuforge' ),
						$result->get_error_message()
					)
				)
			);
		} else {
			printf(
				'<div class="docuforge-error" %s><p>%s</p></div>',
				wp_kses_post( get_block_wrapper_attributes() ),
				esc_html__( 'The document could not be loaded at this time.', 'docuforge' )
			);
		}
		return;
	}

	// Store PDF.
	$upload_dir = wp_upload_dir();
	$pdf_dir    = trailingslashit( $upload_dir['basedir'] ) . 'docuforge-pdfs';

	if ( ! is_dir( $pdf_dir ) ) {
		wp_mkdir_p( $pdf_dir );
	}

	$hash     = md5( $result['body'] . microtime() );
	$filepath = trailingslashit( $pdf_dir ) . $hash . '.pdf';

	file_put_contents( $filepath, $result['body'] ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents

	$pdf_url = trailingslashit( $upload_dir['baseurl'] ) . 'docuforge-pdfs/' . $hash . '.pdf';

	if ( $cache_ttl > 0 ) {
		set_transient( $cache_key, $pdf_url, $cache_ttl );
	}
}

// Render output.
$wrapper_attributes = get_block_wrapper_attributes( array( 'class' => 'docuforge-block' ) );

if ( 'download' === $output_mode ) {
	$filename = sanitize_file_name( $template_id ) . '.pdf';
	printf(
		'<div %s><a href="%s" download="%s" class="docuforge-download-link">%s</a></div>',
		wp_kses_post( $wrapper_attributes ),
		esc_url( $pdf_url ),
		esc_attr( $filename ),
		esc_html(
			sprintf(
				/* translators: %s: PDF filename. */
				__( 'Download %s', 'docuforge' ),
				$filename
			)
		)
	);
} else {
	printf(
		'<div %s><iframe src="%s" width="%s" height="%s" style="border:none;" title="%s" loading="lazy"></iframe></div>',
		wp_kses_post( $wrapper_attributes ),
		esc_url( $pdf_url ),
		esc_attr( $width ),
		esc_attr( $height ),
		esc_attr__( 'DocuForge PDF Document', 'docuforge' )
	);
}
