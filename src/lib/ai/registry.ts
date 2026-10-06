import type { AIProvider, AIProviderId } from './types.ts';
import { GeminiProvider } from './providers/gemini.ts';
import { OpenAIProvider } from './providers/openai.ts';
import { DeepSeekProvider } from './providers/deepseek.ts';

export class ProviderRegistry {
  private providers = new Map<AIProviderId, AIProvider>();

  constructor() {
    this.register(new GeminiProvider());
    this.register(new OpenAIProvider());
    this.register(new DeepSeekProvider());
  }

  register(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
  }

  has(id: string): boolean {
    const normalized = (id || '').toLowerCase().trim() as AIProviderId;
    return this.providers.has(normalized);
  }

  get(id: string): AIProvider {
    const normalized = (id || 'gemini').toLowerCase().trim() as AIProviderId;
    const provider = this.providers.get(normalized);
    if (!provider) {
      const err = new Error(`Unsupported AI provider: "${id}". Supported providers: gemini, openai, deepseek.`);
      (err as unknown as { code: string }).code = 'UNSUPPORTED_PROVIDER';
      throw err;
    }
    return provider;
  }

  getAll(): AIProvider[] {
    return Array.from(this.providers.values());
  }
}

export const providerRegistry = new ProviderRegistry();
