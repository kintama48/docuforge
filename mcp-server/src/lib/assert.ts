const ASSERT_PREFIX = 'MCP assertion failed';

export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`${ASSERT_PREFIX}: ${message}`);
  }
}

export function assertPresent<T>(
  value: T | null | undefined,
  message: string
): NonNullable<T> {
  invariant(value !== null && value !== undefined, message);
  return value;
}

export function assertNever(value: never, message = 'Unexpected code path'): never {
  throw new Error(`${ASSERT_PREFIX}: ${message}; value=${String(value)}`);
}
