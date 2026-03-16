import { describe, expect, test } from 'bun:test';
import {
  appConfig,
  getConsoleRateLimitConfig,
  getPlanMonthlyAiCreditDefault,
  getPlanMonthlyRenderDefault,
  getRequestRateLimitConfig,
} from '../../src/config/config';

describe('app config defaults', () => {
  test('provides monthly render defaults by plan tier', () => {
    expect(getPlanMonthlyRenderDefault('free')).toBe(1000);
    expect(getPlanMonthlyRenderDefault('dev')).toBe(3000);
    expect(getPlanMonthlyRenderDefault('starter')).toBe(10000);
    expect(getPlanMonthlyRenderDefault('pro')).toBe(50000);
    expect(getPlanMonthlyRenderDefault('unknown')).toBe(1000);
  });

  test('provides monthly AI defaults by plan tier', () => {
    expect(getPlanMonthlyAiCreditDefault('free')).toBe(5);
    expect(getPlanMonthlyAiCreditDefault('dev')).toBe(25);
    expect(getPlanMonthlyAiCreditDefault('starter')).toBe(120);
    expect(getPlanMonthlyAiCreditDefault('pro')).toBe(600);
    expect(getPlanMonthlyAiCreditDefault('unknown')).toBe(5);
  });

  test('returns request limiter config and falls back to default scope', () => {
    expect(getRequestRateLimitConfig('render')).toEqual(appConfig.requestRateLimits.render);
    expect(getRequestRateLimitConfig('preview')).toEqual(appConfig.requestRateLimits.preview);
    expect(getRequestRateLimitConfig('ai')).toEqual(appConfig.requestRateLimits.ai);
    expect(getRequestRateLimitConfig('unknown')).toEqual(appConfig.requestRateLimits.default);
  });

  test('returns console rate-limit defaults', () => {
    expect(getConsoleRateLimitConfig('session')).toEqual({
      windowMs: 60 * 1000,
      limit: 120,
    });
    expect(getConsoleRateLimitConfig('authMutation')).toEqual({
      windowMs: 5 * 60 * 1000,
      limit: 12,
    });
  });
});
