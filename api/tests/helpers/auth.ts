/**
 * Auth test helpers.
 * Functions to create authenticated request headers for tests.
 */
import { SignJWT } from 'jose';

const DEFAULT_JWT_SECRET = 'test-jwt-secret-at-least-32-characters';

/**
 * Create headers for JWT (Bearer token) authentication.
 */
export function createAuthHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Create headers for API key authentication.
 */
export function createApiKeyHeaders(apiKey: string): Record<string, string> {
  return {
    'X-API-Key': apiKey,
    'Content-Type': 'application/json',
  };
}

/**
 * Create a test JWT token for a user.
 * @param userId The user ID to encode in the token
 * @param email The user email to encode in the token
 * @param secret Optional custom secret (defaults to test secret)
 * @param expiresIn Optional expiry (defaults to '1h')
 */
export async function createTestJwt(
  userId: string,
  email: string,
  secret: string = DEFAULT_JWT_SECRET,
  expiresIn: string = '1h'
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);

  return new SignJWT({ sub: userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

/**
 * Create an expired JWT token for testing rejection.
 */
export async function createExpiredJwt(
  userId: string,
  email: string,
  secret: string = DEFAULT_JWT_SECRET
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);

  // Create a token that expired 1 hour ago
  const pastDate = new Date(Date.now() - 3600 * 1000);

  return new SignJWT({ sub: userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(Math.floor(pastDate.getTime() / 1000) - 3600)
    .setExpirationTime(Math.floor(pastDate.getTime() / 1000))
    .sign(secretKey);
}

/**
 * Create a JWT signed with a different secret (invalid signature).
 */
export async function createInvalidSignatureJwt(
  userId: string,
  email: string
): Promise<string> {
  const wrongSecret = new TextEncoder().encode('wrong-secret-for-testing-invalid-sig');

  return new SignJWT({ sub: userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(wrongSecret);
}

/**
 * Test constants.
 */
export const TEST_JWT_SECRET = DEFAULT_JWT_SECRET;
