import { describe, expect, test } from 'bun:test';
import {
  normalizeEmailLocale,
  resolveEmailLocale,
  resolveEmailLocaleFromAcceptLanguage,
} from '../../src/services/email-locale';

describe('email locale resolver', () => {
  test('normalizes direct locale values', () => {
    expect(normalizeEmailLocale('en')).toBe('en');
    expect(normalizeEmailLocale('fr-FR')).toBe('fr');
    expect(normalizeEmailLocale('zh_CN')).toBe('zh');
    expect(normalizeEmailLocale('AR')).toBe('ar');
  });

  test('returns null for unsupported locale values', () => {
    expect(normalizeEmailLocale('pt-BR')).toBeNull();
    expect(normalizeEmailLocale('')).toBeNull();
    expect(normalizeEmailLocale(null)).toBeNull();
  });

  test('parses Accept-Language in order', () => {
    expect(resolveEmailLocaleFromAcceptLanguage('pt-BR,fr-FR;q=0.9,en;q=0.8')).toBe('fr');
    expect(resolveEmailLocaleFromAcceptLanguage('de-DE,de;q=0.9')).toBe('de');
    expect(resolveEmailLocaleFromAcceptLanguage('')).toBeNull();
  });

  test('resolves locale from header then cookie then Accept-Language then english fallback', () => {
    expect(
      resolveEmailLocale({
        headerLocale: 'it-IT',
        cookieLocale: 'fr',
        acceptLanguage: 'es-ES,es;q=0.9',
      })
    ).toBe('it');

    expect(
      resolveEmailLocale({
        headerLocale: 'pt-BR',
        cookieLocale: 'es',
        acceptLanguage: 'de-DE,de;q=0.9',
      })
    ).toBe('es');

    expect(
      resolveEmailLocale({
        headerLocale: null,
        cookieLocale: null,
        acceptLanguage: 'zh-CN,zh;q=0.9',
      })
    ).toBe('zh');

    expect(
      resolveEmailLocale({
        headerLocale: null,
        cookieLocale: null,
        acceptLanguage: 'pt-BR,pt;q=0.9',
      })
    ).toBe('en');
  });
});
