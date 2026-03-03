import { describe, expect, it } from 'bun:test';
import { redactSensitive } from '../../src/lib/logger';

describe('logger redaction', () => {
  it('redacts known sensitive keys recursively', () => {
    const input = {
      password: 'abc',
      nested: {
        pdf_password: 'super-secret',
        user_password: 'super-secret-2',
      },
      safe: 'ok',
      array: [{ authorization: 'Bearer abc' }],
    };

    const output = redactSensitive(input) as Record<string, unknown>;
    expect(output.password).toBe('[REDACTED]');
    expect((output.nested as Record<string, unknown>).pdf_password).toBe('[REDACTED]');
    expect((output.nested as Record<string, unknown>).user_password).toBe('[REDACTED]');
    expect(output.safe).toBe('ok');
    expect(((output.array as Array<Record<string, unknown>>)[0]).authorization).toBe('[REDACTED]');
  });
});
