/**
 * Type definitions for AI LinkedIn Profile Optimizer & CV vs. LinkedIn Gap Analysis.
 */

import type { LinkedInProfileData } from '../linkedin/types.ts';

export type OptimizationSection =
  | 'headline'
  | 'about'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'achievements'
  | 'other';

export type RecommendationPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export type EvidenceStatus =
  | 'SUPPORTED_BY_CV'
  | 'SUPPORTED_BY_LINKEDIN'
  | 'SUPPORTED_BY_BOTH'
  | 'MISSING_EVIDENCE'
  | 'USER_VERIFICATION_REQUIRED';

export interface SectionRecommendation {
  id: string;
  section: OptimizationSection;
  title: string;
  currentContent: string;
  recommendedContent: string;
  cvEvidence: string[];
  reason: string;
  improvements: string[];
  priority: RecommendationPriority;
  confidence: number; // Strictly normalized percentage: 0–100
  evidenceStatus: EvidenceStatus;
  deepEditUrl: string; // Deterministically derived server-side. Never trusted from AI.
  userStatus: 'pending' | 'accepted' | 'edited' | 'dismissed' | 'applied_manually';
}

export interface ScoreDimensions {
  headline: number; // 0–100
  about: number; // 0–100
  experience: number; // 0–100
  skills: number; // 0–100
  consistency: number; // 0–100
  readability: number; // 0–100
}

export interface KeywordAnalysis {
  matched: string[];
  missing: string[];
  recommended: string[];
}

export interface OptimizationResult {
  overallScore: number; // Strictly normalized: 0–100
  scoreDimensions: ScoreDimensions;
  summary: string;
  strengths: string[];
  gaps: string[];
  sectionRecommendations: SectionRecommendation[];
  keywordAnalysis: KeywordAnalysis;
  factualWarnings: string[];
  priorityActions: string[];
}

export interface LinkedInOptimizationInput {
  cvText: string;
  linkedinProfile: LinkedInProfileData;
  sourceMetadata: {
    mode: 'connected' | 'manual';
    memberName?: string;
  };
}
