/**
 * Type definitions for LinkedIn OAuth 2.0 and profile integration.
 * Compliant with official LinkedIn OpenID Connect (OIDC) specifications.
 */

import type { GeneratedExperienceItem, GeneratedEducationItem, GeneratedProjectItem } from '../../types/index.ts';

export interface LinkedInOAuthTokenResponse {
  access_token: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
  refresh_token?: string;
  refresh_token_expires_in?: number;
}

export interface LinkedInUserInfo {
  sub: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
  locale?: string;
}

export interface LinkedInMemberIdentity {
  id: string;
  name: string;
  email?: string;
  picture?: string;
  connectedAt?: string;
}

/**
 * Normalized provider-independent profile structure.
 * Only populates fields actually present from LinkedIn API. Never fabricates missing fields.
 */
export interface LinkedInProfileData {
  headline?: string;
  about?: string;
  experience?: GeneratedExperienceItem[];
  education?: GeneratedEducationItem[];
  skills?: string[];
  certifications?: string[];
  projects?: GeneratedProjectItem[];
  achievements?: string[];
}

export interface LinkedInConnectionStatus {
  connected: boolean;
  configured: boolean;
  member?: LinkedInMemberIdentity;
  error?: string;
  setupInstructions?: string;
}

export interface LinkedInSessionData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  member?: LinkedInMemberIdentity;
}

export interface LinkedInOptimizationRecommendation {
  section: 'headline' | 'about' | 'experience' | 'skills' | 'general';
  title: string;
  current?: string;
  suggested: string;
  rationale: string;
  actionUrl?: string; // Direct deep-link to LinkedIn edit modal (e.g., https://www.linkedin.com/in/me/edit/intro/)
}

export interface LinkedInOptimizationResult {
  headlineComparison?: {
    current?: string;
    optimized: string;
    rationale: string;
  };
  aboutComparison?: {
    current?: string;
    optimized: string;
    rationale: string;
  };
  skillsToHighlight?: string[];
  recommendations: LinkedInOptimizationRecommendation[];
}
