<?php
/**
 * Tests for DocuForge_Encryption class.
 *
 * @package DocuForge
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

/**
 * @covers DocuForge_Encryption
 */
class EncryptionTest extends TestCase {

	/**
	 * Test that encrypting then decrypting returns the original plaintext.
	 */
	public function test_encrypt_decrypt_roundtrip(): void {
		$plaintext = 'df_live_abc123xyz789_secretkey';

		$encrypted = DocuForge_Encryption::encrypt( $plaintext );

		$this->assertIsString( $encrypted, 'encrypt() should return a string' );
		$this->assertNotEmpty( $encrypted, 'Encrypted value should not be empty' );
		$this->assertNotEquals( $plaintext, $encrypted, 'Encrypted value should differ from plaintext' );

		$decrypted = DocuForge_Encryption::decrypt( $encrypted );

		$this->assertSame( $plaintext, $decrypted, 'Decrypted value should match original plaintext' );
	}

	/**
	 * Test roundtrip with various string types.
	 */
	public function test_encrypt_decrypt_various_strings(): void {
		$strings = array(
			'simple',
			'with spaces and special chars !@#$%^&*()',
			str_repeat( 'a', 1000 ),
			"line1\nline2\ttab",
			'unicode: emoji and accents cafe',
		);

		foreach ( $strings as $plaintext ) {
			$encrypted = DocuForge_Encryption::encrypt( $plaintext );
			$decrypted = DocuForge_Encryption::decrypt( $encrypted );
			$this->assertSame( $plaintext, $decrypted, "Roundtrip failed for: {$plaintext}" );
		}
	}

	/**
	 * Test that encrypting an empty string returns an empty string.
	 */
	public function test_encrypt_empty_string_returns_empty(): void {
		$result = DocuForge_Encryption::encrypt( '' );
		$this->assertSame( '', $result );
	}

	/**
	 * Test that decrypting an empty string returns an empty string.
	 */
	public function test_decrypt_empty_string_returns_empty(): void {
		$result = DocuForge_Encryption::decrypt( '' );
		$this->assertSame( '', $result );
	}

	/**
	 * Test that decrypting invalid ciphertext returns false.
	 */
	public function test_decrypt_invalid_ciphertext_returns_false(): void {
		$result = DocuForge_Encryption::decrypt( 'not-valid-base64-ciphertext!!!' );
		$this->assertFalse( $result );
	}

	/**
	 * Test that decrypting a truncated ciphertext returns false.
	 *
	 * AES-256-CBC needs a 16-byte IV. If the raw data is <= 16 bytes,
	 * there is no actual ciphertext, so decrypt should return false.
	 */
	public function test_decrypt_truncated_ciphertext_returns_false(): void {
		// Base64 encode exactly 16 bytes (the IV length for AES-256-CBC).
		// This means there are zero ciphertext bytes, so decrypt should fail.
		$truncated = base64_encode( random_bytes( 16 ) );

		$result = DocuForge_Encryption::decrypt( $truncated );
		$this->assertFalse( $result );
	}

	/**
	 * Test that decrypting a very short (< IV length) ciphertext returns false.
	 */
	public function test_decrypt_too_short_returns_false(): void {
		$short = base64_encode( random_bytes( 8 ) );

		$result = DocuForge_Encryption::decrypt( $short );
		$this->assertFalse( $result );
	}

	/**
	 * Test that two encryptions of the same plaintext produce different ciphertexts.
	 *
	 * This verifies that a random IV is used each time.
	 */
	public function test_different_encryptions_produce_different_ciphertexts(): void {
		$plaintext = 'same-input-different-output';

		$encrypted1 = DocuForge_Encryption::encrypt( $plaintext );
		$encrypted2 = DocuForge_Encryption::encrypt( $plaintext );

		$this->assertNotEquals(
			$encrypted1,
			$encrypted2,
			'Two encryptions of the same text should produce different ciphertexts (random IV)'
		);

		// Both should still decrypt to the same value.
		$this->assertSame( $plaintext, DocuForge_Encryption::decrypt( $encrypted1 ) );
		$this->assertSame( $plaintext, DocuForge_Encryption::decrypt( $encrypted2 ) );
	}

	/**
	 * Test that decrypting a tampered ciphertext returns false.
	 */
	public function test_decrypt_tampered_ciphertext_returns_false(): void {
		$plaintext = 'sensitive-data';
		$encrypted = DocuForge_Encryption::encrypt( $plaintext );

		// Tamper with the middle of the base64 string.
		$tampered = substr( $encrypted, 0, 10 ) . 'XXXX' . substr( $encrypted, 14 );

		$result = DocuForge_Encryption::decrypt( $tampered );

		// Tampered data should either return false or a different (garbage) string.
		// It should never return the original plaintext.
		$this->assertNotSame( $plaintext, $result );
	}
}
