import type {
  OptimizationResult,
  OptimizationSection,
  RecommendationPriority,
  EvidenceStatus,
  SectionRecommendation,
  ScoreDimensions,
  KeywordAnalysis
} from './types.ts';
import type { LinkedInProfileData } from '../linkedin/types.ts';

// Deterministic official LinkedIn edit URLs
const TRUSTED_LINKEDIN_URLS: Record<string, string> = {
  headline: 'https://www.linkedin.com/in/me/edit/intro/',
  about: 'https://www.linkedin.com/in/me/edit/about/',
  experience: 'https://www.linkedin.com/in/me/details/experience/',
  education: 'https://www.linkedin.com/in/me/details/education/',
  skills: 'https://www.linkedin.com/in/me/details/skills/'
};

const SAFE_LINKEDIN_FALLBACK_URL = 'https://www.linkedin.com/in/me/edit/';

const VALID_SECTIONS: OptimizationSection[] = [
  'headline',
  'about',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'achievements',
  'other'
];

/**
 * Normalizes and validates confidence into an integer percentage strictly between 0 and 100.
 *
 * Mandatory Adjustment 1:
 * - 0.82 -> 82
 * - 82 -> 82
 * - 100 -> 100
 * - 182 -> 100 (clamped)
 * - -10 -> 0 (clamped)
 */
export function normalizeConfidence(val: unknown): number {
  if (val === null || val === undefined) {
    return 70; // Sensible safe default
  }

  let num = typeof val === 'number' ? val : NaN;

  if (typeof val === 'string') {
    const cleaned = val.replace('%', '').trim();
    num = parseFloat(cleaned);
  }

  if (Number.isNaN(num)) {
    return 70;
  }

  // Handle decimal probabilities (e.g. 0.82 -> 82)
  if (num > 0 && num <= 1) {
    num = num * 100;
  }

  // Clamp strictly to 0 - 100
  const clamped = Math.max(0, Math.min(100, Math.round(num)));
  return clamped;
}

/**
 * Normalizes a score strictly between 0 and 100.
 */
export function normalizeScore(val: unknown, fallback = 75): number {
  let num = typeof val === 'number' ? val : NaN;
  if (typeof val === 'string') {
    num = parseFloat(val);
  }
  if (Number.isNaN(num)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, Math.round(num)));
}

/**
 * Deterministically maps a profile section to its verified official LinkedIn edit URL.
 *
 * Mandatory Adjustment 2:
 * Zero trust for AI-generated URLs. Never accepts URLs passed from AI models.
 */
export function getTrustedLinkedInEditUrl(section: string): string {
  const normalizedKey = section.trim().toLowerCase();
  return TRUSTED_LINKEDIN_URLS[normalizedKey] || SAFE_LINKEDIN_FALLBACK_URL;
}

/**
 * Normalizes priority to HIGH, MEDIUM, or LOW.
 */
export function normalizePriority(priority: unknown): RecommendationPriority {
  if (typeof priority === 'string') {
    const upper = priority.trim().toUpperCase();
    if (upper === 'HIGH' || upper === 'MEDIUM' || upper === 'LOW') {
      return upper;
    }
  }
  return 'MEDIUM';
}

/**
 * Normalizes section name against allowed list.
 */
export function normalizeSection(section: unknown): OptimizationSection {
  if (typeof section === 'string') {
    const lower = section.trim().toLowerCase() as OptimizationSection;
    if (VALID_SECTIONS.includes(lower)) {
      return lower;
    }
  }
  return 'other';
}

/**
 * Normalizes evidence status.
 */
export function normalizeEvidenceStatus(status: unknown): EvidenceStatus {
  const valid: EvidenceStatus[] = [
    'SUPPORTED_BY_CV',
    'SUPPORTED_BY_LINKEDIN',
    'SUPPORTED_BY_BOTH',
    'MISSING_EVIDENCE',
    'USER_VERIFICATION_REQUIRED'
  ];
  if (typeof status === 'string' && valid.includes(status as EvidenceStatus)) {
    return status as EvidenceStatus;
  }
  return 'SUPPORTED_BY_CV';
}

/**
 * Validates, sanitizes, and normalizes raw AI optimization output.
 * Guarantees schema adherence, score clamping, trusted URLs, and anti-hallucination guardrails.
 */
export function validateAndNormalizeOptimizationOutput(rawInput: unknown): OptimizationResult {
  let data: Record<string, unknown>;

  if (typeof rawInput === 'string') {
    let cleaned = rawInput.trim();
    // Strip markdown code fences if present
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim();
    }
    try {
      data = JSON.parse(cleaned);
    } catch {
      throw new Error('MALFORMED_AI_OUTPUT: Could not parse JSON response from AI provider.');
    }
  } else if (rawInput && typeof rawInput === 'object' && !Array.isArray(rawInput)) {
    data = rawInput as Record<string, unknown>;
  } else {
    throw new Error('INVALID_AI_OUTPUT: AI response must be an object.');
  }

  // 1. Overall Score
  const rawScore = data.overallScore ?? data.score ?? 75;
  const overallScore = normalizeScore(rawScore, 75);

  // 2. Score Dimensions
  const rawDims = (data.scoreDimensions as Record<string, unknown>) || {};
  const scoreDimensions: ScoreDimensions = {
    headline: normalizeScore(rawDims.headline, 75),
    about: normalizeScore(rawDims.about, 75),
    experience: normalizeScore(rawDims.experience, 80),
    skills: normalizeScore(rawDims.skills, 80),
    consistency: normalizeScore(rawDims.consistency, 75),
    readability: normalizeScore(rawDims.readability, 80)
  };

  // 3. Summary
  const summary =
    typeof data.summary === 'string' && data.summary.trim()
      ? data.summary.trim().slice(0, 1500)
      : 'AI comparison analysis complete.';

  // 4. Strengths & Gaps
  const strengths = Array.isArray(data.strengths)
    ? data.strengths.map(String).map(s => s.trim()).filter(Boolean).slice(0, 10)
    : [];
  const gaps = Array.isArray(data.gaps)
    ? data.gaps.map(String).map(s => s.trim()).filter(Boolean).slice(0, 10)
    : [];

  // 5. Section Recommendations
  const sectionRecommendations: SectionRecommendation[] = [];
  const rawRecs = Array.isArray(data.sectionRecommendations)
    ? data.sectionRecommendations
    : Array.isArray(data.recommendations)
      ? data.recommendations
      : [];

  rawRecs.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const r = item as Record<string, unknown>;

    const section = normalizeSection(r.section);
    const priority = normalizePriority(r.priority);
    const confidence = normalizeConfidence(r.confidence);
    const evidenceStatus = normalizeEvidenceStatus(r.evidenceStatus);

    // CRITICAL: Trusted URL is strictly derived from application mapping
    // If the original section is invalid, map directly to the safe profile edit fallback
    const deepEditUrl = getTrustedLinkedInEditUrl(typeof r.section === 'string' ? r.section : section);

    const title =
      typeof r.title === 'string' && r.title.trim()
        ? r.title.trim().slice(0, 200)
        : `Optimize ${section.charAt(0).toUpperCase() + section.slice(1)}`;

    const currentContent =
      typeof r.currentContent === 'string'
        ? r.currentContent.trim().slice(0, 2500)
        : typeof r.current === 'string'
          ? r.current.trim().slice(0, 2500)
          : '';

    const recommendedContent =
      typeof r.recommendedContent === 'string'
        ? r.recommendedContent.trim().slice(0, 2500)
        : typeof r.suggested === 'string'
          ? r.suggested.trim().slice(0, 2500)
          : '';

    const reason =
      typeof r.reason === 'string' && r.reason.trim()
        ? r.reason.trim().slice(0, 1000)
        : typeof r.rationale === 'string'
          ? r.rationale.trim().slice(0, 1000)
          : 'Optimized for recruiter discoverability and ATS keyword alignment.';

    const cvEvidence = Array.isArray(r.cvEvidence)
      ? r.cvEvidence.map(String).map(s => s.trim()).filter(Boolean).slice(0, 8)
      : [];

    const improvements = Array.isArray(r.improvements)
      ? r.improvements.map(String).map(s => s.trim()).filter(Boolean).slice(0, 8)
      : [];

    sectionRecommendations.push({
      id: `rec-${section}-${index}-${Date.now().toString(36)}`,
      section,
      title,
      currentContent,
      recommendedContent,
      cvEvidence,
      reason,
      improvements,
      priority,
      confidence,
      evidenceStatus,
      deepEditUrl,
      userStatus: 'pending'
    });
  });

  // 6. Keyword Analysis
  const rawKeywords = (data.keywordAnalysis as Record<string, unknown>) || {};
  const keywordAnalysis: KeywordAnalysis = {
    matched: Array.isArray(rawKeywords.matched)
      ? rawKeywords.matched.map(String).map(s => s.trim()).filter(Boolean).slice(0, 20)
      : [],
    missing: Array.isArray(rawKeywords.missing)
      ? rawKeywords.missing.map(String).map(s => s.trim()).filter(Boolean).slice(0, 20)
      : [],
    recommended: Array.isArray(rawKeywords.recommended)
      ? rawKeywords.recommended.map(String).map(s => s.trim()).filter(Boolean).slice(0, 20)
      : []
  };

  // 7. Factual Warnings (Anti-hallucination alerts)
  const factualWarnings = Array.isArray(data.factualWarnings)
    ? data.factualWarnings.map(String).map(s => s.trim()).filter(Boolean).slice(0, 10)
    : [];

  // 8. Priority Actions
  const priorityActions = Array.isArray(data.priorityActions)
    ? data.priorityActions.map(String).map(s => s.trim()).filter(Boolean).slice(0, 10)
    : [];

  return {
    overallScore,
    scoreDimensions,
    summary,
    strengths,
    gaps,
    sectionRecommendations,
    keywordAnalysis,
    factualWarnings,
    priorityActions
  };
}

/**
 * Parses user-pasted LinkedIn profile text into structured LinkedInProfileData.
 * Extracts sections using common delimiters while preserving unparsed content safely.
 */
export function parsePastedLinkedInProfile(rawText: string): LinkedInProfileData {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return {};
  }

  const result: LinkedInProfileData = {};

  // Pattern matchers for common pasted section headers (supports Markdown headers like ### Headline or plain Headline:)
  const sectionPatterns: Array<{ key: keyof LinkedInProfileData; regex: RegExp }> = [
    { key: 'headline', regex: /(?:^|\n)\s*(?:#+\s*)?(?:headline|title)\s*[:\n]\s*([\s\S]*?)(?=(?:\n\s*(?:#+\s*)?(?:headline|about|summary|bio|experience|work history|education|skills|projects)\s*[:\n])|$)/i },
    { key: 'about', regex: /(?:^|\n)\s*(?:#+\s*)?(?:about|summary|bio)\s*[:\n]\s*([\s\S]*?)(?=(?:\n\s*(?:#+\s*)?(?:headline|about|summary|bio|experience|work history|education|skills|projects)\s*[:\n])|$)/i },
    { key: 'experience', regex: /(?:^|\n)\s*(?:#+\s*)?(?:experience|work history|positions)\s*[:\n]\s*([\s\S]*?)(?=(?:\n\s*(?:#+\s*)?(?:headline|about|summary|bio|experience|work history|education|skills|projects)\s*[:\n])|$)/i },
    { key: 'skills', regex: /(?:^|\n)\s*(?:#+\s*)?(?:skills|top skills)\s*[:\n]\s*([\s\S]*?)(?=(?:\n\s*(?:#+\s*)?(?:headline|about|summary|bio|experience|work history|education|skills|projects)\s*[:\n])|$)/i }
  ];

  let matchedAny = false;

  for (const { key, regex } of sectionPatterns) {
    const match = trimmed.match(regex);
    if (match && match[1]?.trim()) {
      matchedAny = true;
      const content = match[1].trim();
      if (key === 'headline') {
        result.headline = content;
      } else if (key === 'about') {
        result.about = content;
      } else if (key === 'skills') {
        result.skills = content.split(/[,•|\n]+/).map(s => s.trim()).filter(Boolean);
      } else if (key === 'experience') {
        result.experience = [
          {
            company: 'Current Experience',
            role: 'Professional Role',
            dates: 'Present',
            bullets: content.split('\n').map(b => b.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean)
          }
        ];
      }
    }
  }

  // If no delimiters matched, treat the full text as about or headline based on length
  if (!matchedAny) {
    if (trimmed.length <= 220 && !trimmed.includes('\n')) {
      result.headline = trimmed;
    } else {
      result.about = trimmed;
    }
  }

  return result;
}
