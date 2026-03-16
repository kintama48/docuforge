import { beforeEach, describe, expect, test } from 'bun:test';
import { consoleAuthAbuseProtection, resetAbuseCountersForTests } from '../../src/middleware/abuse-protection';
import { ForbiddenError } from '../../src/lib/errors';
import { reloadEnv } from '../../src/config/env';

function makeContext(path: string, method = 'POST', headers: Record<string, string> = {}) {
  const lowered = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    req: {
      path,
      method,
      header(name: string) {
        return lowered.get(name.toLowerCase()) || null;
      },
    },
  } as any;
}

describe('console auth abuse protection', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    reloadEnv();
    resetAbuseCountersForTests();
  });

  test('does not apply to non-protected paths', async () => {
    const ctx = makeContext('/console/auth/oauth/github', 'GET');
    let called = false;

    await consoleAuthAbuseProtection(ctx, async () => {
      called = true;
    });

    expect(called).toBe(true);
  });

  test('blocks extreme abusive request bursts', async () => {
    const headers = {
      'X-Forwarded-For': '198.51.100.77',
      'User-Agent': 'abuse-protection-unit-test',
      'X-Device-Id': 'unit-device-abuse',
      'Accept-Language': 'en-US',
    };

    for (let i = 0; i < 69; i += 1) {
      const ctx = makeContext('/console/auth/login', 'POST', headers);
      await consoleAuthAbuseProtection(ctx, async () => {});
    }

    const blockedCtx = makeContext('/console/auth/login', 'POST', headers);
    await expect(consoleAuthAbuseProtection(blockedCtx, async () => {})).rejects.toBeInstanceOf(
      ForbiddenError
    );
  });
});
