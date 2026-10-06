/**
 * Core type definitions for CV2LinkedIn AI.
 * Completely generic and decoupled from any specific user or profile.
 */

export interface GeneratedExperienceItem {
  company: string;
  role: string;
  location?: string;
  dates: string;
  bullets: string[];
}

export interface GeneratedEducationItem {
  institution: string;
  degree: string;
  dates: string;
}

export interface GeneratedProjectItem {
  name: string;
  description: string;
  technologies?: string[];
}

export interface LinkedInProfilePackage {
  headline: string;
  about: string;
  experience: GeneratedExperienceItem[];
  education: GeneratedEducationItem[];
  skills: string[];
  certifications: string[];
  projects: GeneratedProjectItem[];
  achievements: string[];
  suggestedKeywords: string[];
}

export type AIMode = 'developer' | 'byok' | 'default';
export type AIProviderId = 'gemini' | 'openai' | 'deepseek';

export interface AIConfig {
  mode: AIMode;
  provider: AIProviderId;
  apiKey?: string;
  model?: string;
}

export interface DiscoveredModel {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  supportedMethods: string[];
  recommended?: boolean;
  badge?: string;
  category?: 'flash' | 'flash-lite' | 'pro' | 'standard' | 'chat' | 'reasoner';
}

export interface KeyTestState {
  status: 'idle' | 'testing' | 'valid' | 'invalid';
  message?: string;
  models?: DiscoveredModel[];
}

export interface GenerateProfileResponse {
  success: boolean;
  data?: LinkedInProfilePackage;
  error?: string;
  errorCode?:
    | 'NO_API_KEY'
    | 'INVALID_API_KEY'
    | 'RATE_LIMIT'
    | 'RATE_LIMITED'
    | 'QUOTA_EXHAUSTED'
    | 'PARSER_ERROR'
    | 'AI_ERROR'
    | 'NETWORK_ERROR'
    | 'INVALID_MODEL'
    | 'TIMEOUT'
    | 'PROVIDER_UNAVAILABLE'
    | 'AI_NOT_CONFIGURED'
    | 'MISSING_USER_KEY'
    | 'UNSUPPORTED_PROVIDER'
    | 'INVALID_REQUEST'
    | string;
  modeUsed?: AIMode;
}
