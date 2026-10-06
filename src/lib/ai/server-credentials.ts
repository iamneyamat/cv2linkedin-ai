/**
 * Server-Side AI Credential & Configuration Module
 *
 * CRITICAL SECURITY DIRECTIVES:
 * 1. This file is STRICTLY SERVER-ONLY. It must NEVER be imported into client components.
 * 2. process.env.GEMINI_API_KEY, process.env.OPENAI_API_KEY, process.env.DEEPSEEK_API_KEY
 *    must NEVER leave the server or be serialized into client responses.
 * 3. Provider-specific isolation: Gemini uses GEMINI_API_KEY, OpenAI uses OPENAI_API_KEY,
 *    DeepSeek uses DEEPSEEK_API_KEY. Generic AI_API_KEY is explicitly forbidden.
 * 4. Zero key exposure: no full keys, partial keys, masked keys, key lengths, or key prefixes.
 */

import type { AIProviderId } from './types.ts';

export type CredentialMode = 'user' | 'byok' | 'default' | 'developer';
export type CredentialSource = 'user' | 'default';

export interface ProviderStatus {
  configured: boolean;
}

export interface ServerAIConfig {
  providers: {
    gemini: ProviderStatus;
    openai: ProviderStatus;
    deepseek: ProviderStatus;
  };
  defaultProvider: AIProviderId | null;
}

export interface EffectiveAICredentials {
  provider: AIProviderId;
  apiKey: string;
  credentialSource: CredentialSource;
}

export interface ResolveCredentialsOptions {
  provider: AIProviderId;
  mode?: CredentialMode;
  userApiKey?: string;
}

/**
 * Returns the server-configured environment API key for a specific AI provider.
 * Strictly provider-isolated (Adjustment 1: No generic AI_API_KEY).
 */
export function getServerAPIKey(provider: AIProviderId): string {
  switch (provider) {
    case 'gemini':
      return (process.env.GEMINI_API_KEY || '').trim();
    case 'openai':
      return (process.env.OPENAI_API_KEY || '').trim();
    case 'deepseek':
      return (process.env.DEEPSEEK_API_KEY || '').trim();
    default:
      return '';
  }
}

/**
 * Checks if a specific provider has a valid server-side environment key configured.
 */
export function isServerProviderConfigured(provider: AIProviderId): boolean {
  return Boolean(getServerAPIKey(provider));
}

/**
 * Resolves the default server AI provider based on DEFAULT_AI_PROVIDER environment variable.
 * If DEFAULT_AI_PROVIDER is unset or unsupported:
 * - Falls back to the first configured provider (preferring Gemini).
 * - Returns null if no provider has a server key configured.
 */
export function getDefaultAIProvider(): AIProviderId | null {
  const envDefault = (process.env.DEFAULT_AI_PROVIDER || '').trim().toLowerCase() as AIProviderId;
  const validProviders: AIProviderId[] = ['gemini', 'openai', 'deepseek'];

  if (validProviders.includes(envDefault) && isServerProviderConfigured(envDefault)) {
    return envDefault;
  }

  // Fallback: prioritize Gemini if configured, then OpenAI, then DeepSeek
  if (isServerProviderConfigured('gemini')) {
    return 'gemini';
  }
  if (isServerProviderConfigured('openai')) {
    return 'openai';
  }
  if (isServerProviderConfigured('deepseek')) {
    return 'deepseek';
  }

  return null;
}

/**
 * Generates safe metadata for client consumption via GET /api/ai/config.
 * GUARANTEED: Never exposes API keys, masked strings, or secrets.
 */
export function getServerAIConfig(): ServerAIConfig {
  return {
    providers: {
      gemini: { configured: isServerProviderConfigured('gemini') },
      openai: { configured: isServerProviderConfigured('openai') },
      deepseek: { configured: isServerProviderConfigured('deepseek') }
    },
    defaultProvider: getDefaultAIProvider()
  };
}

/**
 * Deterministically resolves effective credentials based on explicit mode and BYOK priority.
 *
 * Mandatory Adjustment 2:
 * MODE = 'user' / 'byok':
 *   - User key present -> uses user key (credentialSource: 'user')
 *   - User key absent  -> throws MISSING_USER_KEY
 *
 * MODE = 'default' / 'developer':
 *   - Server key present -> uses server key (credentialSource: 'default')
 *   - Server key absent  -> throws AI_NOT_CONFIGURED
 *
 * ZERO cross-provider fallback: Gemini requests never use OpenAI or DeepSeek keys.
 */
export function resolveEffectiveAICredentials(
  options: ResolveCredentialsOptions
): EffectiveAICredentials {
  const { provider, userApiKey } = options;
  const rawMode = options.mode || 'user';
  const normalizedMode: 'user' | 'default' =
    rawMode === 'developer' || rawMode === 'default' ? 'default' : 'user';

  if (normalizedMode === 'user') {
    const cleanUserKey = userApiKey?.trim();
    if (!cleanUserKey) {
      const err = new Error(
        `Please enter your personal ${provider.toUpperCase()} API key (BYOK mode).`
      );
      (err as { code?: string }).code = 'MISSING_USER_KEY';
      throw err;
    }

    return {
      provider,
      apiKey: cleanUserKey,
      credentialSource: 'user'
    };
  }

  // normalizedMode === 'default'
  const serverKey = getServerAPIKey(provider);
  if (!serverKey) {
    const err = new Error(
      `Developer / Demo AI is not configured for ${provider} on this server. Please configure ${provider.toUpperCase()}_API_KEY in .env.local or use your personal key.`
    );
    (err as { code?: string }).code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  return {
    provider,
    apiKey: serverKey,
    credentialSource: 'default'
  };
}
