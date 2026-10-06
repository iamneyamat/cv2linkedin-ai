import type { AIProvider } from './types.ts';
import { providerRegistry } from './registry.ts';

export function getAIProvider(providerName: string = 'gemini'): AIProvider {
  return providerRegistry.get(providerName);
}
