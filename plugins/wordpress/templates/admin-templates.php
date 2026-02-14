<?php
/**
 * Template browser page template.
 *
 * @package DocuForge
 * @since   1.0.0
 *
 * @var array|WP_Error $templates Templates list or error from the API client.
 * @var int            $page      Current page number.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<div class="wrap">
	<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>

	<?php if ( is_wp_error( $templates ) ) : ?>
		<div class="notice notice-error">
			<p>
				<?php
				echo esc_html(
					sprintf(
						/* translators: %s: Error message. */
						__( 'Failed to load templates: %s', 'docuforge' ),
						$templates->get_error_message()
					)
				);
				?>
			</p>
			<p>
				<?php
				printf(
					/* translators: %s: Settings page URL. */
					wp_kses_post( __( 'Please check your <a href="%s">API settings</a>.', 'docuforge' ) ),
					esc_url( admin_url( 'options-general.php?page=docuforge-settings' ) )
				);
				?>
			</p>
		</div>
	<?php else :
		$template_list = $templates['templates'] ?? $templates['data'] ?? $templates;

		if ( ! is_array( $template_list ) || empty( $template_list ) ) :
			?>
			<div class="notice notice-info">
				<p><?php esc_html_e( 'No templates found. Create templates in your DocuForge dashboard first.', 'docuforge' ); ?></p>
			</div>
		<?php else : ?>
			<p>
				<?php
				printf(
					/* translators: %d: Number of templates. */
					esc_html( _n( '%d template found.', '%d templates found.', count( $template_list ), 'docuforge' ) ),
					count( $template_list )
				);
				?>
			</p>

			<table class="wp-list-table widefat fixed striped">
				<thead>
					<tr>
						<th scope="col" class="column-name" style="width: 20%;">
							<?php esc_html_e( 'Name', 'docuforge' ); ?>
						</th>
						<th scope="col" class="column-id" style="width: 15%;">
							<?php esc_html_e( 'ID', 'docuforge' ); ?>
						</th>
						<th scope="col" class="column-description" style="width: 35%;">
							<?php esc_html_e( 'Description', 'docuforge' ); ?>
						</th>
						<th scope="col" class="column-shortcode" style="width: 30%;">
							<?php esc_html_e( 'Shortcode', 'docuforge' ); ?>
						</th>
					</tr>
				</thead>
				<tbody>
					<?php foreach ( $template_list as $template ) :
						$tpl_id   = isset( $template['id'] ) ? sanitize_text_field( $template['id'] ) : '';
						$tpl_name = isset( $template['name'] ) ? sanitize_text_field( $template['name'] ) : $tpl_id;
						$tpl_desc = isset( $template['description'] ) ? sanitize_text_field( $template['description'] ) : '';
						$shortcode = '[docuforge template_id="' . $tpl_id . '"]';
						?>
						<tr>
							<td class="column-name">
								<strong><?php echo esc_html( $tpl_name ); ?></strong>
							</td>
							<td class="column-id">
								<code><?php echo esc_html( $tpl_id ); ?></code>
							</td>
							<td class="column-description">
								<?php echo esc_html( $tpl_desc ); ?>
							</td>
							<td class="column-shortcode">
								<div style="display: flex; align-items: center; gap: 8px;">
									<code id="shortcode-<?php echo esc_attr( $tpl_id ); ?>"><?php echo esc_html( $shortcode ); ?></code>
									<button
										type="button"
										class="button button-small docuforge-copy-shortcode"
										data-shortcode="<?php echo esc_attr( $shortcode ); ?>"
										title="<?php esc_attr_e( 'Copy shortcode to clipboard', 'docuforge' ); ?>"
									>
										<?php esc_html_e( 'Copy', 'docuforge' ); ?>
									</button>
								</div>
							</td>
						</tr>
					<?php endforeach; ?>
				</tbody>
			</table>

			<?php
			// Pagination.
			$total_pages = isset( $templates['total_pages'] ) ? absint( $templates['total_pages'] ) : 1;
			if ( $total_pages > 1 ) :
				$base_url = admin_url( 'tools.php?page=docuforge-templates' );
				?>
				<div class="tablenav bottom">
					<div class="tablenav-pages">
						<span class="displaying-num">
							<?php
							printf(
								/* translators: %d: Current page number. */
								esc_html__( 'Page %d', 'docuforge' ),
								$page
							);
							?>
						</span>
						<span class="pagination-links">
							<?php if ( $page > 1 ) : ?>
								<a href="<?php echo esc_url( add_query_arg( 'paged', $page - 1, $base_url ) ); ?>" class="prev-page button">
									&lsaquo; <?php esc_html_e( 'Previous', 'docuforge' ); ?>
								</a>
							<?php endif; ?>
							<?php if ( $page < $total_pages ) : ?>
								<a href="<?php echo esc_url( add_query_arg( 'paged', $page + 1, $base_url ) ); ?>" class="next-page button">
									<?php esc_html_e( 'Next', 'docuforge' ); ?> &rsaquo;
								</a>
							<?php endif; ?>
						</span>
					</div>
				</div>
			<?php endif; ?>

		<?php endif; ?>
	<?php endif; ?>
</div>

<script type="text/javascript">
(function($) {
	'use strict';

	$('.docuforge-copy-shortcode').on('click', function() {
		var $button = $(this);
		var shortcode = $button.data('shortcode');

		if (navigator.clipboard && navigator.clipboard.writeText) {
			navigator.clipboard.writeText(shortcode).then(function() {
				var originalText = $button.text();
				$button.text(docuforgeAdmin.i18n.copied);
				setTimeout(function() {
					$button.text(originalText);
				}, 2000);
			}).catch(function() {
				fallbackCopy(shortcode, $button);
			});
		} else {
			fallbackCopy(shortcode, $button);
		}
	});

	function fallbackCopy(text, $button) {
		var $temp = $('<textarea>');
		$('body').append($temp);
		$temp.val(text).select();
		try {
			document.execCommand('copy');
			var originalText = $button.text();
			$button.text(docuforgeAdmin.i18n.copied);
			setTimeout(function() {
				$button.text(originalText);
			}, 2000);
		} catch (e) {
			$button.text(docuforgeAdmin.i18n.copyFailed);
			setTimeout(function() {
				$button.text('Copy');
			}, 2000);
		}
		$temp.remove();
	}
})(jQuery);
</script>
