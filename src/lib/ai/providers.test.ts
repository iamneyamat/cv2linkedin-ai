import test from 'node:test';
import assert from 'node:assert/strict';
import { providerRegistry } from './registry.ts';
import { getAIProvider } from './factory.ts';
import { GeminiProvider } from './providers/gemini.ts';
import { OpenAIProvider } from './providers/openai.ts';
import { DeepSeekProvider } from './providers/deepseek.ts';
import {
  getProviderKeyStorageName,
  getProviderModelsStorageName
} from './storage.ts';

// ---------------------------------------------------------------------------
// 1. Provider Registry Tests
// ---------------------------------------------------------------------------
test('providerRegistry initializes with gemini, openai, and deepseek', () => {
  assert.equal(providerRegistry.has('gemini'), true);
  assert.equal(providerRegistry.has('openai'), true);
  assert.equal(providerRegistry.has('deepseek'), true);
  assert.equal(providerRegistry.has('anthropic'), false);

  const allProviders = providerRegistry.getAll();
  assert.equal(allProviders.length, 3);
  const ids = allProviders.map(p => p.id);
  assert.ok(ids.includes('gemini'));
  assert.ok(ids.includes('openai'));
  assert.ok(ids.includes('deepseek'));
});

test('getAIProvider resolves correct provider or throws UNSUPPORTED_PROVIDER', () => {
  const gemini = getAIProvider('gemini');
  assert.equal(gemini.id, 'gemini');
  assert.equal(gemini.name, 'Google Gemini');

  const openai = getAIProvider('openai');
  assert.equal(openai.id, 'openai');
  assert.equal(openai.name, 'OpenAI');

  const deepseek = getAIProvider('deepseek');
  assert.equal(deepseek.id, 'deepseek');
  assert.equal(deepseek.name, 'DeepSeek');

  assert.throws(() => {
    getAIProvider('unknown-provider');
  }, (err: unknown) => {
    const error = err as Error & { code?: string };
    return error.code === 'UNSUPPORTED_PROVIDER' && error.message.includes('unknown-provider');
  });
});

// ---------------------------------------------------------------------------
// 2. Storage Key Isolation Tests
// ---------------------------------------------------------------------------
test('getProviderKeyStorageName returns isolated keys per provider', () => {
  const geminiKey = getProviderKeyStorageName('gemini');
  const openaiKey = getProviderKeyStorageName('openai');
  const deepseekKey = getProviderKeyStorageName('deepseek');

  assert.equal(geminiKey, 'cv2linkedin_byok_key_gemini');
  assert.equal(openaiKey, 'cv2linkedin_byok_key_openai');
  assert.equal(deepseekKey, 'cv2linkedin_byok_key_deepseek');

  // Verify none are identical
  assert.notEqual(geminiKey, openaiKey);
  assert.notEqual(openaiKey, deepseekKey);
  assert.notEqual(geminiKey, deepseekKey);
});

test('getProviderModelsStorageName returns isolated cache names per provider', () => {
  assert.equal(getProviderModelsStorageName('gemini'), 'cv2linkedin_discovered_models_gemini');
  assert.equal(getProviderModelsStorageName('openai'), 'cv2linkedin_discovered_models_openai');
  assert.equal(getProviderModelsStorageName('deepseek'), 'cv2linkedin_discovered_models_deepseek');
});

test('session storage methods isolate provider keys and handle clear-key properly', async () => {
  const {
    getStoredKeyForProvider,
    setStoredKeyForProvider,
    clearStoredKeyForProvider,
    getStoredModelsForProvider,
    setStoredModelsForProvider
  } = await import('./storage.ts');

  // Create mock sessionStorage for node test environment
  const store = new Map<string, string>();
  const mockSessionStorage = {
    getItem: (k: string) => store.get(k) || null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear()
  };

  const originalWindow = global.window;
  const originalSessionStorage = global.sessionStorage;
  // @ts-expect-error Mocking window in Node.js
  global.window = {};
  // @ts-expect-error Mocking sessionStorage in Node.js
  global.sessionStorage = mockSessionStorage;

  try {
    // 1. Set key for Gemini
    setStoredKeyForProvider('gemini', 'AIzaSyGeminiKey12345');
    assert.equal(getStoredKeyForProvider('gemini'), 'AIzaSyGeminiKey12345');
    assert.equal(getStoredKeyForProvider('openai'), '');
    assert.equal(getStoredKeyForProvider('deepseek'), '');

    // 2. Set key for OpenAI
    setStoredKeyForProvider('openai', 'sk-openaiKey12345');
    assert.equal(getStoredKeyForProvider('openai'), 'sk-openaiKey12345');
    assert.equal(getStoredKeyForProvider('gemini'), 'AIzaSyGeminiKey12345');
    assert.equal(getStoredKeyForProvider('deepseek'), '');

    // 3. Set key for DeepSeek
    setStoredKeyForProvider('deepseek', 'sk-deepseekKey12345');
    assert.equal(getStoredKeyForProvider('deepseek'), 'sk-deepseekKey12345');
    assert.equal(getStoredKeyForProvider('openai'), 'sk-openaiKey12345');
    assert.equal(getStoredKeyForProvider('gemini'), 'AIzaSyGeminiKey12345');

    // 4. Store models for OpenAI
    setStoredModelsForProvider('openai', [
      { id: 'gpt-4o-mini', name: 'gpt-4o-mini', displayName: 'GPT-4o Mini', supportedMethods: ['chat.completions'] }
    ]);
    const cachedOpenAi = getStoredModelsForProvider('openai');
    assert.equal(cachedOpenAi.length, 1);
    assert.equal(cachedOpenAi[0].id, 'gpt-4o-mini');
    assert.equal(getStoredModelsForProvider('gemini').length, 0);

    // 5. Clear key for OpenAI only
    clearStoredKeyForProvider('openai');
    assert.equal(getStoredKeyForProvider('openai'), '');
    assert.equal(getStoredModelsForProvider('openai').length, 0);
    // Gemini and DeepSeek must remain untouched
    assert.equal(getStoredKeyForProvider('gemini'), 'AIzaSyGeminiKey12345');
    assert.equal(getStoredKeyForProvider('deepseek'), 'sk-deepseekKey12345');
  } finally {
    global.window = originalWindow;
    global.sessionStorage = originalSessionStorage;
  }
});

// ---------------------------------------------------------------------------
// 3. Error Sanitization Tests
// ---------------------------------------------------------------------------
test('GeminiProvider normalizes and sanitizes errors without leaking API keys', () => {
  const provider = new GeminiProvider();

  // Test missing key
  const missingErr = provider.normalizeError({ code: 'MISSING_API_KEY' });
  assert.equal(missingErr.errorCode, 'NO_API_KEY');
  assert.equal(missingErr.statusCode, 400);

  // Test invalid key
  const invalidErr = provider.normalizeError({ code: 'INVALID_KEY' });
  assert.equal(invalidErr.errorCode, 'INVALID_API_KEY');
  assert.equal(invalidErr.statusCode, 401);

  // Test rate limit
  const rateLimitErr = provider.normalizeError({ code: 'RATE_LIMITED' });
  assert.equal(rateLimitErr.errorCode, 'RATE_LIMIT');
  assert.equal(rateLimitErr.statusCode, 429);

  // Test sanitization of raw AIzaSy keys in message
  const rawLeakErr = new Error('Failed to query models?key=AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6 with status 400');
  const normalized = provider.normalizeError(rawLeakErr);
  assert.ok(!normalized.error.includes('AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6'));
  assert.ok(normalized.error.includes('[REDACTED]'));
});

test('OpenAIProvider normalizes and sanitizes errors without leaking API keys', () => {
  const provider = new OpenAIProvider();

  // Test missing key
  const missingErr = provider.normalizeError({ code: 'MISSING_API_KEY' });
  assert.equal(missingErr.errorCode, 'NO_API_KEY');
  assert.equal(missingErr.statusCode, 400);

  // Test invalid key
  const invalidErr = provider.normalizeError({ code: 'INVALID_KEY' });
  assert.equal(invalidErr.errorCode, 'INVALID_API_KEY');
  assert.equal(invalidErr.statusCode, 401);

  // Test sanitization of sk- keys in error message
  const rawLeakErr = new Error('Invalid bearer token: sk-abc1234567890defghijklmnopqrstuvwxyz_456');
  const normalized = provider.normalizeError(rawLeakErr);
  assert.ok(!normalized.error.includes('sk-abc1234567890defghijklmnopqrstuvwxyz_456'));
  assert.ok(normalized.error.includes('[REDACTED]'));
});

test('DeepSeekProvider normalizes and sanitizes errors without leaking API keys', () => {
  const provider = new DeepSeekProvider();

  // Test missing key
  const missingErr = provider.normalizeError({ code: 'MISSING_API_KEY' });
  assert.equal(missingErr.errorCode, 'NO_API_KEY');
  assert.equal(missingErr.statusCode, 400);

  // Test rate limit / quota
  const quotaErr = provider.normalizeError({ code: 'RATE_LIMITED' });
  assert.equal(quotaErr.errorCode, 'RATE_LIMIT');
  assert.equal(quotaErr.statusCode, 429);

  // Test sanitization
  const rawLeakErr = new Error('DeepSeek error for key sk-deepseeksecretkey9876543210000000');
  const normalized = provider.normalizeError(rawLeakErr);
  assert.ok(!normalized.error.includes('sk-deepseeksecretkey9876543210000000'));
  assert.ok(normalized.error.includes('[REDACTED]'));
});

// ---------------------------------------------------------------------------
// 4. OpenAI Dynamic Model Discovery & Generic Filtering Tests (Mocked)
// ---------------------------------------------------------------------------
test('OpenAIProvider dynamically discovers and categorizes models from API response', async () => {
  const provider = new OpenAIProvider();

  // Mock global fetch for OpenAI /v1/models
  const originalFetch = global.fetch;
  global.fetch = async (url: string | URL | Request) => {
    if (typeof url === 'string' && url.includes('api.openai.com/v1/models')) {
      return new Response(JSON.stringify({
        data: [
          { id: 'gpt-future-turbo', object: 'model' },
          { id: 'gpt-future-mini', object: 'model' },
          { id: 'text-embedding-3-small', object: 'model' },
          { id: 'whisper-1', object: 'model' },
          { id: 'dall-e-3', object: 'model' },
          { id: 'tts-1-hd', object: 'model' },
          { id: 'omni-moderation-latest', object: 'model' },
          { id: 'o1-preview', object: 'model' }
        ]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return originalFetch(url);
  };

  try {
    const models = await provider.discoverModels({ apiKey: 'sk-test-mock-key-1234567890' });

    // Non-chat models should be filtered out
    const ids = models.map(m => m.id);
    assert.ok(ids.includes('gpt-future-turbo'));
    assert.ok(ids.includes('gpt-future-mini'));
    assert.ok(ids.includes('o1-preview'));
    assert.ok(!ids.includes('text-embedding-3-small'));
    assert.ok(!ids.includes('whisper-1'));
    assert.ok(!ids.includes('dall-e-3'));
    assert.ok(!ids.includes('tts-1-hd'));
    assert.ok(!ids.includes('omni-moderation-latest'));

    // The mini/fast model should be generically identified as flash-lite and recommended
    const miniModel = models.find(m => m.id === 'gpt-future-mini');
    assert.ok(miniModel);
    assert.equal(miniModel.category, 'flash-lite');
    assert.equal(miniModel.recommended, true);

    // o1 model should be categorized as reasoner
    const reasonerModel = models.find(m => m.id === 'o1-preview');
    assert.ok(reasonerModel);
    assert.equal(reasonerModel.category, 'reasoner');
  } finally {
    global.fetch = originalFetch;
  }
});

// ---------------------------------------------------------------------------
// 5. DeepSeek Dynamic Model Discovery Tests (Mocked)
// ---------------------------------------------------------------------------
test('DeepSeekProvider discovers models honestly without fabricating capabilities', async () => {
  const provider = new DeepSeekProvider();

  // Mock global fetch for DeepSeek /models
  const originalFetch = global.fetch;
  global.fetch = async (url: string | URL | Request) => {
    if (typeof url === 'string' && url.includes('api.deepseek.com/models')) {
      return new Response(JSON.stringify({
        data: [
          { id: 'deepseek-chat', object: 'model' },
          { id: 'deepseek-reasoner', object: 'model' }
        ]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return originalFetch(url);
  };

  try {
    const models = await provider.discoverModels({ apiKey: 'sk-deepseek-mock-key-1234567890' });

    assert.equal(models.length, 2);
    const chatModel = models.find(m => m.id === 'deepseek-chat');
    assert.ok(chatModel);
    assert.equal(chatModel.displayName, 'DeepSeek Chat');
    assert.equal(chatModel.category, 'chat');
    assert.equal(chatModel.recommended, true);

    const reasonerModel = models.find(m => m.id === 'deepseek-reasoner');
    assert.ok(reasonerModel);
    assert.equal(reasonerModel.displayName, 'DeepSeek Reasoner');
    assert.equal(reasonerModel.category, 'reasoner');
    assert.equal(reasonerModel.recommended, false);
  } finally {
    global.fetch = originalFetch;
  }
});

// ---------------------------------------------------------------------------
// 6. Gemini Dynamic Model Discovery Tests (Mocked)
// ---------------------------------------------------------------------------
test('GeminiProvider discovers models with capability ranking', async () => {
  const provider = new GeminiProvider();

  const originalFetch = global.fetch;
  global.fetch = async (url: string | URL | Request) => {
    if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
      return new Response(JSON.stringify({
        models: [
          {
            name: 'models/gemini-future-flash',
            displayName: 'Gemini Future Flash',
            supportedGenerationMethods: ['generateContent']
          },
          {
            name: 'models/gemini-future-pro',
            displayName: 'Gemini Future Pro',
            supportedGenerationMethods: ['generateContent']
          },
          {
            name: 'models/text-embedding-004',
            displayName: 'Embedding',
            supportedGenerationMethods: ['embedContent']
          }
        ]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return originalFetch(url);
  };

  try {
    const models = await provider.discoverModels({ apiKey: 'AIzaSyMockKeyForGeminiTest123456789012' });

    assert.equal(models.length, 2);
    const flash = models.find(m => m.id === 'gemini-future-flash');
    assert.ok(flash);
    assert.equal(flash.recommended, true);

    const pro = models.find(m => m.id === 'gemini-future-pro');
    assert.ok(pro);
    assert.equal(pro.recommended, false);
  } finally {
    global.fetch = originalFetch;
  }
});
