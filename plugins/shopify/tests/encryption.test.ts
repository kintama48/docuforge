import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encrypt, decrypt } from "../app/lib/encryption";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// 64 hex chars = 32 bytes of 0xAA
const TEST_ENCRYPTION_KEY = "a".repeat(64);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("encryption", () => {
  let originalKey: string | undefined;

  beforeEach(() => {
    originalKey = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.ENCRYPTION_KEY;
    } else {
      process.env.ENCRYPTION_KEY = originalKey;
    }
  });

  // -- Roundtrip ------------------------------------------------------------

  it("encrypts and decrypts a simple string correctly", () => {
    const plaintext = "Hello, DocuForge!";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it("encrypts and decrypts an empty string", () => {
    const plaintext = "";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it("encrypts and decrypts unicode content", () => {
    const plaintext = "Hello 🌍 Welt こんにちは";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it("encrypts and decrypts a long JSON string", () => {
    const plaintext = JSON.stringify({
      apiKey: "shpat_abc123",
      shop: "my-store.myshopify.com",
      scopes: ["read_orders", "write_orders"],
    });
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  // -- Random IV produces different ciphertexts ----------------------------

  it("produces different ciphertexts for the same plaintext (random IV)", () => {
    const plaintext = "same input";
    const encrypted1 = encrypt(plaintext);
    const encrypted2 = encrypt(plaintext);

    expect(encrypted1).not.toBe(encrypted2);

    // But both should decrypt to the same value
    expect(decrypt(encrypted1)).toBe(plaintext);
    expect(decrypt(encrypted2)).toBe(plaintext);
  });

  // -- Payload format -------------------------------------------------------

  it("produces encrypted payload in iv:tag:ciphertext format", () => {
    const encrypted = encrypt("test");
    const parts = encrypted.split(":");

    expect(parts).toHaveLength(3);

    const [ivHex, tagHex, ciphertextHex] = parts;

    // IV = 16 bytes = 32 hex chars
    expect(ivHex).toHaveLength(32);
    // Auth tag = 16 bytes = 32 hex chars
    expect(tagHex).toHaveLength(32);
    // Ciphertext should be non-empty hex
    expect(ciphertextHex.length).toBeGreaterThan(0);

    // All parts should be valid hex
    expect(ivHex).toMatch(/^[0-9a-f]+$/);
    expect(tagHex).toMatch(/^[0-9a-f]+$/);
    expect(ciphertextHex).toMatch(/^[0-9a-f]+$/);
  });

  // -- Invalid payload format -----------------------------------------------

  it("throws on invalid payload format (missing parts)", () => {
    expect(() => decrypt("onlyonepart")).toThrow("Invalid encrypted payload format.");
  });

  it("throws on payload with only two parts", () => {
    expect(() => decrypt("part1:part2")).toThrow("Invalid encrypted payload format.");
  });

  it("throws on payload with four parts", () => {
    expect(() => decrypt("a:b:c:d")).toThrow("Invalid encrypted payload format.");
  });

  // -- Tampered ciphertext --------------------------------------------------

  it("throws on tampered ciphertext", () => {
    const encrypted = encrypt("sensitive data");
    const parts = encrypted.split(":");

    // Tamper with the ciphertext portion
    const tamperedCiphertext =
      parts[2][0] === "a"
        ? "b" + parts[2].slice(1)
        : "a" + parts[2].slice(1);

    const tampered = `${parts[0]}:${parts[1]}:${tamperedCiphertext}`;

    expect(() => decrypt(tampered)).toThrow();
  });

  it("throws on tampered auth tag", () => {
    const encrypted = encrypt("sensitive data");
    const parts = encrypted.split(":");

    // Tamper with the auth tag
    const tamperedTag =
      parts[1][0] === "a"
        ? "b" + parts[1].slice(1)
        : "a" + parts[1].slice(1);

    const tampered = `${parts[0]}:${tamperedTag}:${parts[2]}`;

    expect(() => decrypt(tampered)).toThrow();
  });

  // -- Invalid IV length ----------------------------------------------------

  it("throws on invalid IV length", () => {
    const encrypted = encrypt("test");
    const parts = encrypted.split(":");

    // Replace IV with a shorter hex string (4 bytes instead of 16)
    const shortIv = "aabbccdd";
    const tampered = `${shortIv}:${parts[1]}:${parts[2]}`;

    expect(() => decrypt(tampered)).toThrow("Invalid IV length");
  });

  it("throws on invalid auth tag length", () => {
    const encrypted = encrypt("test");
    const parts = encrypted.split(":");

    // Replace tag with a shorter hex string
    const shortTag = "aabbccdd";
    const tampered = `${parts[0]}:${shortTag}:${parts[2]}`;

    expect(() => decrypt(tampered)).toThrow("Invalid auth tag length");
  });

  // -- Missing ENCRYPTION_KEY -----------------------------------------------

  it("throws when ENCRYPTION_KEY is missing", () => {
    delete process.env.ENCRYPTION_KEY;

    expect(() => encrypt("test")).toThrow(
      "ENCRYPTION_KEY environment variable is required"
    );
  });

  it("throws when ENCRYPTION_KEY is missing during decrypt", () => {
    const encrypted = encrypt("test");
    delete process.env.ENCRYPTION_KEY;

    expect(() => decrypt(encrypted)).toThrow(
      "ENCRYPTION_KEY environment variable is required"
    );
  });

  // -- Wrong key length -----------------------------------------------------

  it("throws when ENCRYPTION_KEY is too short", () => {
    process.env.ENCRYPTION_KEY = "abcd"; // 4 hex chars = 2 bytes

    expect(() => encrypt("test")).toThrow(
      "ENCRYPTION_KEY must be a 64-character hex string"
    );
  });

  it("throws when ENCRYPTION_KEY is too long", () => {
    process.env.ENCRYPTION_KEY = "a".repeat(128); // 128 hex chars = 64 bytes

    expect(() => encrypt("test")).toThrow(
      "ENCRYPTION_KEY must be a 64-character hex string"
    );
  });
});
