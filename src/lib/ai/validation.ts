/**
 * Centralized Request Validation for AI Pipeline
 */

import type { AIProviderId, AIMode } from '../../types/index.ts';

export interface ValidatedAIRequest {
  provider: AIProviderId;
  mode: AIMode;
  apiKey?: string;
  model: string;
}

export function validateProviderAndMode(
  providerName: string | null | undefined,
  rawMode: string | null | undefined,
  rawApiKey?: string | null
): { provider: AIProviderId; mode: AIMode; userKey?: string } {
  const validProviders: AIProviderId[] = ['gemini', 'openai', 'deepseek'];
  const provider = (providerName || '').trim().toLowerCase() as AIProviderId;

  if (!validProviders.includes(provider)) {
    const err = new Error(`Unsupported AI provider: "${providerName}". Supported providers are Gemini, OpenAI, and DeepSeek.`);
    (err as { code?: string }).code = 'UNSUPPORTED_PROVIDER';
    throw err;
  }

  const mode = (rawMode || 'byok') as AIMode;
  const isUserMode = mode === 'byok' || mode === 'user' as unknown as AIMode;
  const cleanKey = rawApiKey?.trim();

  if (isUserMode && !cleanKey) {
    const err = new Error(`Please enter your personal ${provider.toUpperCase()} API key (BYOK mode).`);
    (err as { code?: string }).code = 'MISSING_USER_KEY';
    throw err;
  }

  return {
    provider,
    mode,
    userKey: cleanKey || undefined
  };
}

export function validateModelChoice(model: string | null | undefined, provider: AIProviderId): string {
  const clean = (model || '').trim();
  if (!clean) {
    const err = new Error(`Please select an available ${provider.toUpperCase()} model before generating your profile.`);
    (err as { code?: string }).code = 'MODEL_NOT_FOUND';
    throw err;
  }
  return clean;
}

export function validateCVText(text: string): string {
  const clean = (text || '').trim();
  if (!clean || clean.length < 40) {
    const err = new Error('The uploaded CV document contains insufficient readable text (minimum 40 characters required).');
    (err as { code?: string }).code = 'INVALID_REQUEST';
    throw err;
  }
  return clean;
}
