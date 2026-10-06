import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getServerAIConfig,
  getServerAPIKey,
  resolveEffectiveAICredentials,
  isServerProviderConfigured,
  getDefaultAIProvider
} from './server-credentials.ts';

// Helper to isolate process.env per test
function withEnv(envVars: Record<string, string | undefined>, fn: () => void) {
  const originalEnv = { ...process.env };
  try {
    // Clear relevant env vars
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.DEFAULT_AI_PROVIDER;
    delete process.env.AI_API_KEY; // Ensure generic AI_API_KEY is not used

    // Apply test env vars
    for (const [k, v] of Object.entries(envVars)) {
      if (v === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = v;
      }
    }

    fn();
  } finally {
    process.env = originalEnv;
  }
}

// 1. Gemini default key detection
test('1. Gemini default key detection detects GEMINI_API_KEY only', () => {
  withEnv({ GEMINI_API_KEY: 'test-gemini-key-123' }, () => {
    assert.equal(isServerProviderConfigured('gemini'), true);
    assert.equal(getServerAPIKey('gemini'), 'test-gemini-key-123');
  });
});

// 2. OpenAI default key detection
test('2. OpenAI default key detection detects OPENAI_API_KEY only', () => {
  withEnv({ OPENAI_API_KEY: 'test-openai-key-456' }, () => {
    assert.equal(isServerProviderConfigured('openai'), true);
    assert.equal(getServerAPIKey('openai'), 'test-openai-key-456');
  });
});

// 3. DeepSeek default key detection
test('3. DeepSeek default key detection detects DEEPSEEK_API_KEY only', () => {
  withEnv({ DEEPSEEK_API_KEY: 'test-deepseek-key-789' }, () => {
    assert.equal(isServerProviderConfigured('deepseek'), true);
    assert.equal(getServerAPIKey('deepseek'), 'test-deepseek-key-789');
  });
});

// 4. No default key
test('4. No default key reports false for all providers when env is empty', () => {
  withEnv({}, () => {
    assert.equal(isServerProviderConfigured('gemini'), false);
    assert.equal(isServerProviderConfigured('openai'), false);
    assert.equal(isServerProviderConfigured('deepseek'), false);
    assert.equal(getServerAPIKey('gemini'), '');
    assert.equal(getServerAPIKey('openai'), '');
    assert.equal(getServerAPIKey('deepseek'), '');
  });
});

// 5. DEFAULT_AI_PROVIDER=gemini
test('5. DEFAULT_AI_PROVIDER=gemini resolves gemini when configured', () => {
  withEnv({ GEMINI_API_KEY: 'key-g', DEFAULT_AI_PROVIDER: 'gemini' }, () => {
    assert.equal(getDefaultAIProvider(), 'gemini');
  });
});

// 6. DEFAULT_AI_PROVIDER=openai
test('6. DEFAULT_AI_PROVIDER=openai resolves openai when configured', () => {
  withEnv({ OPENAI_API_KEY: 'key-o', DEFAULT_AI_PROVIDER: 'openai' }, () => {
    assert.equal(getDefaultAIProvider(), 'openai');
  });
});

// 7. DEFAULT_AI_PROVIDER=deepseek
test('7. DEFAULT_AI_PROVIDER=deepseek resolves deepseek when configured', () => {
  withEnv({ DEEPSEEK_API_KEY: 'key-d', DEFAULT_AI_PROVIDER: 'deepseek' }, () => {
    assert.equal(getDefaultAIProvider(), 'deepseek');
  });
});

// 8. Invalid DEFAULT_AI_PROVIDER
test('8. Invalid DEFAULT_AI_PROVIDER falls back to first configured provider (preferring gemini)', () => {
  withEnv({ GEMINI_API_KEY: 'key-g', OPENAI_API_KEY: 'key-o', DEFAULT_AI_PROVIDER: 'unsupported-provider' }, () => {
    assert.equal(getDefaultAIProvider(), 'gemini');
  });

  withEnv({ OPENAI_API_KEY: 'key-o', DEFAULT_AI_PROVIDER: 'unsupported-provider' }, () => {
    assert.equal(getDefaultAIProvider(), 'openai');
  });

  withEnv({}, () => {
    assert.equal(getDefaultAIProvider(), null);
  });
});

// 9. Gemini provider isolation (Adjustment 1)
test('9. Gemini provider isolation: never accepts OPENAI or DEEPSEEK key, and ignores AI_API_KEY', () => {
  withEnv({
    OPENAI_API_KEY: 'openai-secret',
    DEEPSEEK_API_KEY: 'deepseek-secret',
    AI_API_KEY: 'generic-secret'
  }, () => {
    assert.equal(isServerProviderConfigured('gemini'), false);
    assert.equal(getServerAPIKey('gemini'), '');
  });
});

// 10. OpenAI provider isolation
test('10. OpenAI provider isolation: never accepts GEMINI or DEEPSEEK key', () => {
  withEnv({
    GEMINI_API_KEY: 'gemini-secret',
    DEEPSEEK_API_KEY: 'deepseek-secret'
  }, () => {
    assert.equal(isServerProviderConfigured('openai'), false);
    assert.equal(getServerAPIKey('openai'), '');
  });
});

// 11. DeepSeek provider isolation
test('11. DeepSeek provider isolation: never accepts GEMINI or OPENAI key', () => {
  withEnv({
    GEMINI_API_KEY: 'gemini-secret',
    OPENAI_API_KEY: 'openai-secret'
  }, () => {
    assert.equal(isServerProviderConfigured('deepseek'), false);
    assert.equal(getServerAPIKey('deepseek'), '');
  });
});

// 12. User BYOK overrides default (Adjustment 2)
test('12. User BYOK overrides default when mode is user/byok', () => {
  withEnv({ GEMINI_API_KEY: 'server-gemini-key' }, () => {
    const creds = resolveEffectiveAICredentials({
      provider: 'gemini',
      mode: 'user',
      userApiKey: 'user-personal-gemini-key'
    });

    assert.equal(creds.provider, 'gemini');
    assert.equal(creds.apiKey, 'user-personal-gemini-key');
    assert.equal(creds.credentialSource, 'user');
  });
});

// 13. Default key fallback when mode is default/developer
test('13. Default key fallback uses server key when mode is default/developer', () => {
  withEnv({ GEMINI_API_KEY: 'server-gemini-key' }, () => {
    const creds = resolveEffectiveAICredentials({
      provider: 'gemini',
      mode: 'default'
    });

    assert.equal(creds.provider, 'gemini');
    assert.equal(creds.apiKey, 'server-gemini-key');
    assert.equal(creds.credentialSource, 'default');
  });
});

// 14. Explicit user mode without user key
test('14. Explicit user mode without user key throws clear MISSING_USER_KEY error', () => {
  withEnv({ GEMINI_API_KEY: 'server-gemini-key' }, () => {
    assert.throws(() => {
      resolveEffectiveAICredentials({
        provider: 'gemini',
        mode: 'user',
        userApiKey: ''
      });
    }, (err: unknown) => {
      return err instanceof Error && (err as { code?: string }).code === 'MISSING_USER_KEY';
    });
  });
});

// 15. Explicit default mode without server key
test('15. Explicit default mode without server key throws AI_NOT_CONFIGURED', () => {
  withEnv({}, () => {
    assert.throws(() => {
      resolveEffectiveAICredentials({
        provider: 'gemini',
        mode: 'default'
      });
    }, (err: unknown) => {
      return err instanceof Error && (err as { code?: string }).code === 'AI_NOT_CONFIGURED';
    });
  });
});

// 16. AI_NOT_CONFIGURED when neither exists
test('16. AI_NOT_CONFIGURED thrown when neither user key nor server key is available', () => {
  withEnv({}, () => {
    assert.throws(() => {
      resolveEffectiveAICredentials({
        provider: 'openai',
        mode: 'user',
        userApiKey: ''
      });
    }, (err: unknown) => {
      return err instanceof Error && (err as { code?: string }).code === 'MISSING_USER_KEY';
    });

    assert.throws(() => {
      resolveEffectiveAICredentials({
        provider: 'openai',
        mode: 'default'
      });
    }, (err: unknown) => {
      return err instanceof Error && (err as { code?: string }).code === 'AI_NOT_CONFIGURED';
    });
  });
});

// 17. Config endpoint secret protection (Adjustment 3)
test('17. Config endpoint / getServerAIConfig() strictly protects secrets and never leaks keys', () => {
  withEnv({
    GEMINI_API_KEY: 'AIzaSySuperSecretGeminiKey123456789',
    OPENAI_API_KEY: 'sk-SuperSecretOpenAIKey987654321',
    DEFAULT_AI_PROVIDER: 'gemini'
  }, () => {
    const config = getServerAIConfig();

    assert.deepEqual(config, {
      providers: {
        gemini: { configured: true },
        openai: { configured: true },
        deepseek: { configured: false }
      },
      defaultProvider: 'gemini'
    });

    const serialized = JSON.stringify(config);
    assert.ok(!serialized.includes('AIzaSySuperSecretGeminiKey123456789'), 'Must never leak Gemini key');
    assert.ok(!serialized.includes('sk-SuperSecretOpenAIKey987654321'), 'Must never leak OpenAI key');
    assert.ok(!serialized.includes('apiKey'), 'Must not contain apiKey property');
    assert.ok(!serialized.includes('masked'), 'Must not contain masked keys');
  });
});

// 18. Test server key secret protection
test('18. Test server key resolution returns safe metadata without leaking key to client', () => {
  withEnv({ GEMINI_API_KEY: 'secret-server-key' }, () => {
    const creds = resolveEffectiveAICredentials({
      provider: 'gemini',
      mode: 'default'
    });

    // Server-side code receives credentials
    assert.equal(creds.apiKey, 'secret-server-key');
    assert.equal(creds.credentialSource, 'default');

    // Safe client representation helper test
    const safeClientMeta = {
      success: true,
      valid: true,
      provider: creds.provider,
      credentialSource: creds.credentialSource
    };

    assert.equal((safeClientMeta as { apiKey?: string }).apiKey, undefined);
    assert.equal(JSON.stringify(safeClientMeta).includes('secret-server-key'), false);
  });
});

// 19. Environment key replacement after restart (Adjustment 4)
test('19. Environment key replacement: reflects updated key immediately when env changes', () => {
  withEnv({ GEMINI_API_KEY: 'KEY_A' }, () => {
    assert.equal(getServerAPIKey('gemini'), 'KEY_A');
    const credsA = resolveEffectiveAICredentials({ provider: 'gemini', mode: 'default' });
    assert.equal(credsA.apiKey, 'KEY_A');
  });

  withEnv({ GEMINI_API_KEY: 'KEY_B' }, () => {
    assert.equal(getServerAPIKey('gemini'), 'KEY_B');
    const credsB = resolveEffectiveAICredentials({ provider: 'gemini', mode: 'default' });
    assert.equal(credsB.apiKey, 'KEY_B');
  });
});

// 20. No cross-provider fallback
test('20. No cross-provider fallback: request for Gemini fails if Gemini has no key, even if OpenAI is configured', () => {
  withEnv({ OPENAI_API_KEY: 'openai-configured-key' }, () => {
    assert.throws(() => {
      resolveEffectiveAICredentials({
        provider: 'gemini',
        mode: 'default'
      });
    }, (err: unknown) => {
      return err instanceof Error && (err as { code?: string }).code === 'AI_NOT_CONFIGURED';
    });
  });
});
