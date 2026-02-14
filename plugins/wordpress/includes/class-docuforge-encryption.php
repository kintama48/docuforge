<?php
/**
 * Encryption utility class.
 *
 * Provides AES-256-CBC encryption and decryption for sensitive data
 * such as API keys, using the WordPress AUTH_KEY as the encryption key.
 *
 * @package DocuForge
 * @since   1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class DocuForge_Encryption
 *
 * @since 1.0.0
 */
class DocuForge_Encryption {

	/**
	 * Cipher method.
	 *
	 * @var string
	 */
	private const CIPHER = 'aes-256-cbc';

	/**
	 * Derives a 32-byte encryption key from the WordPress AUTH_KEY.
	 *
	 * @since 1.0.0
	 * @return string The derived key.
	 */
	private static function get_key(): string {
		$salt = defined( 'AUTH_KEY' ) && AUTH_KEY ? AUTH_KEY : 'docuforge-default-key';
		return hash( 'sha256', $salt, true );
	}

	/**
	 * Encrypts a plaintext string using AES-256-CBC.
	 *
	 * @since 1.0.0
	 *
	 * @param string $plaintext The string to encrypt.
	 * @return string|false Base64-encoded ciphertext with IV prepended, or false on failure.
	 */
	public static function encrypt( string $plaintext ): string|false {
		if ( '' === $plaintext ) {
			return '';
		}

		$key     = self::get_key();
		$iv_len  = openssl_cipher_iv_length( self::CIPHER );
		$iv      = openssl_random_pseudo_bytes( $iv_len );
		$encoded = openssl_encrypt( $plaintext, self::CIPHER, $key, OPENSSL_RAW_DATA, $iv );

		if ( false === $encoded ) {
			return false;
		}

		// Prepend IV to ciphertext and base64 encode the whole thing.
		return base64_encode( $iv . $encoded ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
	}

	/**
	 * Decrypts an AES-256-CBC encrypted string.
	 *
	 * @since 1.0.0
	 *
	 * @param string $ciphertext Base64-encoded ciphertext with IV prepended.
	 * @return string|false The decrypted plaintext, or false on failure.
	 */
	public static function decrypt( string $ciphertext ): string|false {
		if ( '' === $ciphertext ) {
			return '';
		}

		$key    = self::get_key();
		$raw    = base64_decode( $ciphertext, true ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode

		if ( false === $raw ) {
			return false;
		}

		$iv_len = openssl_cipher_iv_length( self::CIPHER );

		if ( strlen( $raw ) <= $iv_len ) {
			return false;
		}

		$iv      = substr( $raw, 0, $iv_len );
		$encoded = substr( $raw, $iv_len );

		return openssl_decrypt( $encoded, self::CIPHER, $key, OPENSSL_RAW_DATA, $iv );
	}
}
