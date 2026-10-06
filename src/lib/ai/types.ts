import type { LinkedInProfilePackage, DiscoveredModel, AIProviderId } from '../../types/index.ts';

export type { AIProviderId, DiscoveredModel };
export type AIProviderName = AIProviderId;

export interface AIProviderConfig {
  apiKey?: string;
  model?: string;
}

export interface KeyValidationResult {
  valid: boolean;
  provider: AIProviderId;
  model?: string;
  message: string;
  models?: DiscoveredModel[];
}

export interface NormalizedAIError {
  error: string;
  errorCode: 'NO_API_KEY' | 'INVALID_API_KEY' | 'RATE_LIMIT' | 'INVALID_MODEL' | 'AI_ERROR' | 'NETWORK_ERROR' | 'UNSUPPORTED_PROVIDER';
  statusCode: number;
}

export interface AIProvider {
  readonly id: AIProviderId;
  readonly name: string;
  readonly description: string;
  readonly docUrl: string;

  validateKey(config: AIProviderConfig): Promise<KeyValidationResult>;
  discoverModels(config: AIProviderConfig): Promise<DiscoveredModel[]>;
  generateLinkedInProfile(cvText: string, config: AIProviderConfig): Promise<LinkedInProfilePackage>;
  normalizeError(error: unknown): NormalizedAIError;
}

// Backward-compatibility alias
export type IAIProvider = AIProvider;
