const ASSERT_PREFIX = "Load-test assertion failed";

export function invariant(condition, message) {
  if (!condition) {
    throw new Error(`${ASSERT_PREFIX}: ${message}`);
  }
}

export function assertPresent(value, message) {
  invariant(value !== null && value !== undefined, message);
  return value;
}
