<?php
/**
 * Admin settings page template.
 *
 * @package DocuForge
 * @since   1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<div class="wrap">
	<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>

	<form action="options.php" method="post">
		<?php
		settings_fields( 'docuforge_settings' );
		do_settings_sections( 'docuforge-settings' );
		submit_button( __( 'Save Settings', 'docuforge' ) );
		?>
	</form>

	<hr />

	<h2><?php esc_html_e( 'Connection Test', 'docuforge' ); ?></h2>
	<p><?php esc_html_e( 'Test your API connection and view current usage statistics.', 'docuforge' ); ?></p>

	<button
		type="button"
		id="docuforge-test-connection"
		class="button button-secondary"
	>
		<?php esc_html_e( 'Test Connection', 'docuforge' ); ?>
	</button>

	<div id="docuforge-connection-result" style="margin-top: 12px; display: none;">
		<div id="docuforge-connection-message"></div>
	</div>

	<div id="docuforge-usage-display" style="margin-top: 16px; display: none;">
		<h3><?php esc_html_e( 'Usage Statistics', 'docuforge' ); ?></h3>
		<table class="widefat fixed striped" style="max-width: 500px;">
			<tbody id="docuforge-usage-table-body">
			</tbody>
		</table>
	</div>
</div>

<script type="text/javascript">
(function($) {
	'use strict';

	$('#docuforge-test-connection').on('click', function() {
		var $button = $(this);
		var $result = $('#docuforge-connection-result');
		var $message = $('#docuforge-connection-message');
		var $usage = $('#docuforge-usage-display');
		var $usageBody = $('#docuforge-usage-table-body');

		$button.prop('disabled', true).text(docuforgeAdmin.i18n.testing);
		$result.show();
		$message.html('<p>' + docuforgeAdmin.i18n.testing + '</p>');
		$usage.hide();

		$.ajax({
			url: docuforgeAdmin.ajaxUrl,
			type: 'POST',
			data: {
				action: 'docuforge_test_connection',
				nonce: docuforgeAdmin.nonce
			},
			success: function(response) {
				if (response.success) {
					$message.html(
						'<div class="notice notice-success inline"><p>' +
						response.data.message +
						'</p></div>'
					);

					// Display usage data.
					if (response.data.usage) {
						$usageBody.empty();
						var usage = response.data.usage;
						Object.keys(usage).forEach(function(key) {
							var label = key.replace(/_/g, ' ').replace(/\b\w/g, function(l) {
								return l.toUpperCase();
							});
							$usageBody.append(
								'<tr><td><strong>' + $('<span>').text(label).html() + '</strong></td>' +
								'<td>' + $('<span>').text(String(usage[key])).html() + '</td></tr>'
							);
						});
						$usage.show();
					}
				} else {
					$message.html(
						'<div class="notice notice-error inline"><p>' +
						docuforgeAdmin.i18n.failed + ' ' +
						$('<span>').text(response.data.message).html() +
						'</p></div>'
					);
				}
			},
			error: function() {
				$message.html(
					'<div class="notice notice-error inline"><p>' +
					docuforgeAdmin.i18n.failed + ' <?php echo esc_js( __( 'Network error occurred.', 'docuforge' ) ); ?>' +
					'</p></div>'
				);
			},
			complete: function() {
				$button.prop('disabled', false).text('<?php echo esc_js( __( 'Test Connection', 'docuforge' ) ); ?>');
			}
		});
	});
})(jQuery);
</script>
