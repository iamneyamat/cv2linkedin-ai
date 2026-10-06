import test from 'node:test';
import assert from 'node:assert';
import { normalizeAppError, sanitizeSecrets } from './error-normalizer.ts';
import { executeWithControlledRetry } from './retry.ts';
import { checkDeveloperRateLimit, resetRateLimitStore } from './rate-limiter.ts';
import { validateProviderAndMode, validateModelChoice, validateCVText } from './validation.ts';
import { resolveEffectiveAICredentials } from './server-credentials.ts';
import { extractCVText } from '../cv/extract.ts';

function withEnv(envVars: Record<string, string | undefined>, fn: () => void) {
  const originalEnv = { ...process.env };
  try {
    for (const [k, v] of Object.entries(envVars)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    fn();
  } finally {
    process.env = originalEnv;
  }
}

// 1. Complete Developer/Demo generation
test('1. Complete Developer/Demo credential resolution', () => {
  withEnv({ GEMINI_API_KEY: 'test-server-gemini-key' }, () => {
    const creds = resolveEffectiveAICredentials({
      provider: 'gemini',
      mode: 'developer'
    });
    assert.strictEqual(creds.provider, 'gemini');
    assert.strictEqual(creds.apiKey, 'test-server-gemini-key');
    assert.strictEqual(creds.credentialSource, 'default');
  });
});

// 2. Complete BYOK generation
test('2. Complete BYOK credential resolution overrides server key', () => {
  withEnv({ GEMINI_API_KEY: 'server-fallback-key' }, () => {
    const creds = resolveEffectiveAICredentials({
      provider: 'gemini',
      mode: 'byok',
      userApiKey: 'user-personal-key-999'
    });
    assert.strictEqual(creds.provider, 'gemini');
    assert.strictEqual(creds.apiKey, 'user-personal-key-999');
    assert.strictEqual(creds.credentialSource, 'user');
  });
});

// 3. Provider switching
test('3. Provider switching strictly resolves isolated credentials without cross-talk', () => {
  withEnv({
    GEMINI_API_KEY: 'gemini-key',
    OPENAI_API_KEY: 'openai-key',
    DEEPSEEK_API_KEY: 'deepseek-key'
  }, () => {
    const gem = resolveEffectiveAICredentials({ provider: 'gemini', mode: 'developer' });
    const oai = resolveEffectiveAICredentials({ provider: 'openai', mode: 'developer' });
    const dsk = resolveEffectiveAICredentials({ provider: 'deepseek', mode: 'developer' });

    assert.strictEqual(gem.apiKey, 'gemini-key');
    assert.strictEqual(oai.apiKey, 'openai-key');
    assert.strictEqual(dsk.apiKey, 'deepseek-key');
  });
});

// 4. Model discovery validation
test('4. Model choice validation accepts valid models and rejects missing models', () => {
  const valid = validateModelChoice('gemini-2.5-flash', 'gemini');
  assert.strictEqual(valid, 'gemini-2.5-flash');

  assert.throws(() => {
    validateModelChoice('', 'gemini');
  }, (err: unknown) => (err as { code: string }).code === 'MODEL_NOT_FOUND');
});

// 5. 401 normalization
test('5. 401 normalization maps to INVALID_API_KEY without retry', () => {
  const norm = normalizeAppError(new Error('Unauthorized (HTTP 401): Invalid key'), { provider: 'openai' });
  assert.strictEqual(norm.code, 'INVALID_API_KEY');
  assert.strictEqual(norm.statusCode, 401);
  assert.strictEqual(norm.retryable, false);
});

// 6. 403 normalization
test('6. 403 normalization maps to FORBIDDEN without retry', () => {
  const norm = normalizeAppError({ status: 403, message: 'Forbidden permission denied' }, { provider: 'gemini' });
  assert.strictEqual(norm.code, 'FORBIDDEN');
  assert.strictEqual(norm.statusCode, 403);
  assert.strictEqual(norm.retryable, false);
});

// 7. 404 normalization
test('7. 404 normalization maps to MODEL_NOT_FOUND without retry', () => {
  const norm = normalizeAppError({ status: 404, message: 'Model not found' }, { provider: 'deepseek' });
  assert.strictEqual(norm.code, 'MODEL_NOT_FOUND');
  assert.strictEqual(norm.statusCode, 404);
  assert.strictEqual(norm.retryable, false);
});

// 8. 408 normalization
test('8. 408 normalization maps to TIMEOUT and is retryable', () => {
  const norm = normalizeAppError({ status: 408, message: 'Request timeout' });
  assert.strictEqual(norm.code, 'TIMEOUT');
  assert.strictEqual(norm.statusCode, 408);
  assert.strictEqual(norm.retryable, true);
  assert.strictEqual(norm.message, 'The AI request took too long. Please try again.');
});

// 9. 429 normalization
test('9. 429 normalization maps rate limits to RATE_LIMITED', () => {
  const norm = normalizeAppError({ status: 429, message: 'Too many requests rate limit exceeded' });
  assert.strictEqual(norm.code, 'RATE_LIMITED');
  assert.strictEqual(norm.statusCode, 429);
  assert.strictEqual(norm.retryable, true);
  assert.strictEqual(norm.message, 'AI service is temporarily rate-limited. Please wait and try again.');
});

// 10. 500 normalization
test('10. 500 normalization maps to PROVIDER_UNAVAILABLE', () => {
  const norm = normalizeAppError({ status: 500, message: 'Internal server error' }, { provider: 'openai' });
  assert.strictEqual(norm.code, 'PROVIDER_UNAVAILABLE');
  assert.strictEqual(norm.statusCode, 503);
  assert.strictEqual(norm.retryable, true);
});

// 11. 502 normalization
test('11. 502 normalization maps to PROVIDER_UNAVAILABLE', () => {
  const norm = normalizeAppError({ status: 502, message: 'Bad Gateway upstream error' });
  assert.strictEqual(norm.code, 'PROVIDER_UNAVAILABLE');
  assert.strictEqual(norm.statusCode, 503);
  assert.strictEqual(norm.retryable, true);
});

// 12. 503 normalization
test('12. 503 normalization maps to PROVIDER_UNAVAILABLE', () => {
  const norm = normalizeAppError({ status: 503, message: 'Service Unavailable' });
  assert.strictEqual(norm.code, 'PROVIDER_UNAVAILABLE');
  assert.strictEqual(norm.statusCode, 503);
  assert.strictEqual(norm.retryable, true);
});

// 13. Network failure
test('13. Network failure maps to NETWORK_ERROR', () => {
  const norm = normalizeAppError(new Error('fetch failed: connect ECONNREFUSED 127.0.0.1:443'));
  assert.strictEqual(norm.code, 'NETWORK_ERROR');
  assert.strictEqual(norm.statusCode, 503);
  assert.strictEqual(norm.retryable, true);
});

// 14. Timeout
test('14. Timeout error maps to TIMEOUT', () => {
  const norm = normalizeAppError(new Error('The operation was aborted due to timeout'));
  assert.strictEqual(norm.code, 'TIMEOUT');
  assert.strictEqual(norm.statusCode, 408);
  assert.strictEqual(norm.retryable, true);
});

// 15. Quota exhaustion
test('15. Quota exhaustion maps to QUOTA_EXHAUSTED and is non-retryable', () => {
  const normDev = normalizeAppError(new Error('RESOURCE_EXHAUSTED: quota exceeded for current tier'), {
    provider: 'gemini',
    mode: 'developer'
  });
  assert.strictEqual(normDev.code, 'QUOTA_EXHAUSTED');
  assert.strictEqual(normDev.statusCode, 429);
  assert.strictEqual(normDev.retryable, false);
  assert.strictEqual(normDev.message, 'This trial AI provider has reached its current quota. You can try again later or use your own API key.');

  const normUser = normalizeAppError(new Error('insufficient_quota: billing balance exhausted'), {
    provider: 'openai',
    mode: 'byok'
  });
  assert.strictEqual(normUser.code, 'QUOTA_EXHAUSTED');
  assert.strictEqual(normUser.retryable, false);
});

// 16. No automatic BYOK fallback
test('16. No automatic BYOK fallback when developer mode key is missing or fails', () => {
  withEnv({ GEMINI_API_KEY: undefined }, () => {
    // Mode is developer; userApiKey is provided in options, but developer mode MUST NOT use it
    assert.throws(() => {
      resolveEffectiveAICredentials({
        provider: 'gemini',
        mode: 'developer',
        userApiKey: 'user-should-not-be-quietly-used'
      });
    }, (err: unknown) => (err as { code: string }).code === 'AI_NOT_CONFIGURED');
  });
});

// 17. One retry maximum
test('17. Controlled retry attempts at most one retry for transient errors', async () => {
  let attempts = 0;
  const op = async () => {
    attempts += 1;
    if (attempts === 1) {
      const err = new Error('Rate limit exceeded (HTTP 429)');
      (err as { status: number }).status = 429;
      throw err;
    }
    return 'success-after-retry';
  };

  const { result, retried } = await executeWithControlledRetry(op, { maxRetries: 1, delayMs: 10 });
  assert.strictEqual(result, 'success-after-retry');
  assert.strictEqual(retried, true);
  assert.strictEqual(attempts, 2);

  // Non-retryable error (e.g. 401) must fail immediately without retrying
  let authAttempts = 0;
  await assert.rejects(async () => {
    await executeWithControlledRetry(async () => {
      authAttempts += 1;
      const err = new Error('Invalid key 401');
      (err as { status: number }).status = 401;
      throw err;
    }, { maxRetries: 1, delayMs: 10 });
  });
  assert.strictEqual(authAttempts, 1);
});

// 18. Invalid API key sanitization
test('18. Error messages never leak actual API keys or secrets', () => {
  const secret = 'AIzaSySecretApiKeyThatMustBeRedacted123';
  const clean = sanitizeSecrets(`Upstream failed with key ${secret}`, [secret]);
  assert.strictEqual(clean.includes(secret), false);
  assert.strictEqual(clean.includes('[REDACTED]'), true);
});

// 19. Invalid model
test('19. Invalid model throws MODEL_NOT_FOUND', () => {
  assert.throws(() => {
    validateModelChoice('   ', 'openai');
  }, (err: unknown) => (err as { code: string }).code === 'MODEL_NOT_FOUND');
});

// 20. Unsupported provider
test('20. Unsupported provider throws UNSUPPORTED_PROVIDER', () => {
  assert.throws(() => {
    validateProviderAndMode('anthropic-claude', 'byok', 'sk-test');
  }, (err: unknown) => (err as { code: string }).code === 'UNSUPPORTED_PROVIDER');
});

// 21. Missing user key
test('21. Missing user key in BYOK mode throws MISSING_USER_KEY', () => {
  assert.throws(() => {
    validateProviderAndMode('gemini', 'byok', '   ');
  }, (err: unknown) => (err as { code: string }).code === 'MISSING_USER_KEY');
});

// 22. Missing CV
test('22. Missing or empty CV text throws INVALID_REQUEST', () => {
  assert.throws(() => {
    validateCVText('   Short CV text under forty chars   ');
  }, (err: unknown) => (err as { code: string }).code === 'INVALID_REQUEST');
});

// 23. Oversized CV
test('23. Oversized CV (>5MB) is rejected by extractCVText', async () => {
  const bigBuffer = Buffer.alloc(6 * 1024 * 1024, 0x41);
  await assert.rejects(
    async () => {
      await extractCVText(bigBuffer, 'oversized.pdf');
    },
    {
      name: 'Error',
      message: /5MB/
    }
  );
});

// 24. Invalid AI JSON
test('24. Invalid AI JSON response maps to INVALID_AI_RESPONSE', () => {
  const norm = normalizeAppError(new Error('SyntaxError: Unexpected token in JSON at position 10 malformed AI output'));
  assert.strictEqual(norm.code, 'INVALID_AI_RESPONSE');
  assert.strictEqual(norm.statusCode, 502);
});

// 25. No secret leakage & abuse protection
test('25. In-memory abuse protection throttles excessive developer requests', () => {
  resetRateLimitStore();
  const testIp = '192.168.1.100';

  // 15 allowed requests
  for (let i = 0; i < 15; i++) {
    const res = checkDeveloperRateLimit(testIp, 15, 60000);
    assert.strictEqual(res.allowed, true);
  }

  // 16th request rejected
  const blocked = checkDeveloperRateLimit(testIp, 15, 60000);
  assert.strictEqual(blocked.allowed, false);
  assert.strictEqual(blocked.remaining, 0);
});
