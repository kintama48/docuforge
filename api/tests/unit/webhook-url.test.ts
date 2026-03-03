import { describe, expect, test } from 'bun:test';
import { ValidationError } from '../../src/lib/errors';
import { assertSafeWebhookUrl } from '../../src/lib/webhook-url';

describe('webhook URL safety', () => {
  test('accepts public HTTPS URL', () => {
    const normalized = assertSafeWebhookUrl('https://example.com/webhook');
    expect(normalized).toBe('https://example.com/webhook');
  });

  test('rejects localhost hostnames', () => {
    expect(() => assertSafeWebhookUrl('https://localhost/hook')).toThrow(ValidationError);
    expect(() => assertSafeWebhookUrl('https://service.localhost/hook')).toThrow(ValidationError);
  });

  test('rejects private and loopback IPv4 hosts', () => {
    expect(() => assertSafeWebhookUrl('https://127.0.0.1/hook')).toThrow(ValidationError);
    expect(() => assertSafeWebhookUrl('https://10.0.0.8/hook')).toThrow(ValidationError);
    expect(() => assertSafeWebhookUrl('https://192.168.1.10/hook')).toThrow(ValidationError);
  });

  test('rejects loopback and private IPv6 hosts', () => {
    expect(() => assertSafeWebhookUrl('https://[::1]/hook')).toThrow(ValidationError);
    expect(() => assertSafeWebhookUrl('https://[fd00::abcd]/hook')).toThrow(ValidationError);
  });

  test('rejects URLs that embed credentials', () => {
    expect(() => assertSafeWebhookUrl('https://user:pass@example.com/hook')).toThrow(ValidationError);
  });

  test('rejects HTTP in strict mode and allows it in development mode', () => {
    expect(() => assertSafeWebhookUrl('http://example.com/hook')).toThrow(ValidationError);
    const normalized = assertSafeWebhookUrl('http://example.com/hook', true);
    expect(normalized).toBe('http://example.com/hook');
  });
});
