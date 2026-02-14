<?php
/**
 * Plugin Name:       DocuForge PDF Generator
 * Plugin URI:        https://docuforge.dev/integrations/wordpress
 * Description:       Generate professional PDFs from Typst templates using the DocuForge API. Includes Gutenberg block, shortcode, and REST API integration.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      8.0
 * Author:            DocuForge
 * Author URI:        https://docuforge.dev
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       docuforge
 * Domain Path:       /languages
 *
 * @package DocuForge
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Plugin version.
 *
 * @var string
 */
define( 'DOCUFORGE_VERSION', '1.0.0' );

/**
 * Plugin directory path.
 *
 * @var string
 */
define( 'DOCUFORGE_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );

/**
 * Plugin directory URL.
 *
 * @var string
 */
define( 'DOCUFORGE_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// Require the main plugin class.
require_once DOCUFORGE_PLUGIN_DIR . 'includes/class-docuforge-plugin.php';

/**
 * Returns the main plugin instance.
 *
 * @since 1.0.0
 * @return DocuForge_Plugin
 */
function docuforge(): DocuForge_Plugin {
	return DocuForge_Plugin::get_instance();
}

// Bootstrap the plugin on plugins_loaded.
add_action( 'plugins_loaded', 'docuforge' );

// Activation hook.
register_activation_hook( __FILE__, array( 'DocuForge_Plugin', 'activate' ) );

// Deactivation hook.
register_deactivation_hook( __FILE__, array( 'DocuForge_Plugin', 'deactivate' ) );
