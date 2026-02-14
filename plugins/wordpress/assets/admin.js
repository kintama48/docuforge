/**
 * DocuForge Admin Scripts
 *
 * Handles connection testing and shortcode copy functionality
 * on the admin settings and templates pages.
 *
 * @package DocuForge
 * @since   1.0.0
 */

/* global jQuery, docuforgeAdmin */
(function( $ ) {
	'use strict';

	// Connection test is handled inline in admin-settings.php template.
	// Shortcode copy is handled inline in admin-templates.php template.
	// This file is kept as an enqueue target for future admin functionality.

	$( document ).ready( function() {
		// Toggle API key field visibility.
		$( '#docuforge_api_key' ).on( 'focus', function() {
			var $field = $( this );
			if ( $field.val().indexOf( '\u2022' ) === 0 ) {
				$field.val( '' );
			}
		});
	});
})( jQuery );
