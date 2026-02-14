<?php
/**
 * DocuForge uninstall handler.
 *
 * Fired when the plugin is deleted via the WordPress admin.
 * Removes all plugin options and transients from the database.
 *
 * @package DocuForge
 * @since   1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

// Delete all DocuForge options.
delete_option( 'docuforge_api_key' );
delete_option( 'docuforge_api_url' );
delete_option( 'docuforge_cache_ttl' );
delete_option( 'docuforge_version' );

// Delete all DocuForge transients.
global $wpdb;

$wpdb->query(
	$wpdb->prepare(
		"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
		$wpdb->esc_like( '_transient_docuforge_' ) . '%',
		$wpdb->esc_like( '_transient_timeout_docuforge_' ) . '%'
	)
);

// Delete cached PDF files.
$upload_dir = wp_upload_dir();
$pdf_dir    = trailingslashit( $upload_dir['basedir'] ) . 'docuforge-pdfs';

if ( is_dir( $pdf_dir ) ) {
	$files = glob( $pdf_dir . '/*.pdf' );
	if ( is_array( $files ) ) {
		foreach ( $files as $file ) {
			wp_delete_file( $file );
		}
	}
	rmdir( $pdf_dir );
}
