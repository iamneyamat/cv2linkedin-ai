import type { LinkedInProfileData } from '../../linkedin/types.ts';

/**
 * Builds a unified, provider-agnostic prompt for comparing an uploaded CV
 * against an existing LinkedIn profile to perform gap analysis and generate optimizations.
 *
 * CRITICAL ANTI-HALLUCINATION GUARDRAILS:
 * 1. The AI MUST NEVER fabricate experience, degrees, companies, dates, metrics, certifications, or skills.
 * 2. NEVER invent credentials or metrics not present in the CV.
 * 3. Tag every recommendation with factual evidence status:
 *    SUPPORTED_BY_CV | SUPPORTED_BY_LINKEDIN | SUPPORTED_BY_BOTH | MISSING_EVIDENCE | USER_VERIFICATION_REQUIRED
 * 4. The AI MUST NOT generate URLs.
 */
export function buildLinkedInOptimizationPrompt(
  cvText: string,
  currentProfile?: LinkedInProfileData | null
): string {
  const profileParts: string[] = [];
  const safeProfile = currentProfile || {};

  if (safeProfile.headline) {
    profileParts.push(`Headline: ${safeProfile.headline}`);
  }
  if (safeProfile.about) {
    profileParts.push(`About/Summary: ${safeProfile.about}`);
  }
  if (safeProfile.experience && safeProfile.experience.length > 0) {
    profileParts.push(`Experience:\n${JSON.stringify(safeProfile.experience, null, 2)}`);
  }
  if (safeProfile.skills && safeProfile.skills.length > 0) {
    profileParts.push(`Skills:\n${safeProfile.skills.join(', ')}`);
  }
  if (safeProfile.education && safeProfile.education.length > 0) {
    profileParts.push(`Education:\n${JSON.stringify(safeProfile.education, null, 2)}`);
  }
  if (safeProfile.certifications && safeProfile.certifications.length > 0) {
    profileParts.push(`Certifications:\n${safeProfile.certifications.join(', ')}`);
  }
  if (safeProfile.projects && safeProfile.projects.length > 0) {
    profileParts.push(`Projects:\n${JSON.stringify(safeProfile.projects, null, 2)}`);
  }
  if (safeProfile.achievements && safeProfile.achievements.length > 0) {
    profileParts.push(`Achievements:\n${safeProfile.achievements.join(', ')}`);
  }

  const currentProfileFormatted =
    profileParts.length > 0
      ? profileParts.join('\n\n')
      : 'No current LinkedIn profile provided. Perform optimization directly from CV evidence to maximize LinkedIn profile impact.';

  return `You are an elite executive career strategist, recruiter branding expert, and LinkedIn profile optimization specialist.

Your task is to analyze the candidate's verified CV text and compare it thoroughly with their current LinkedIn profile, identifying gaps, outdated wording, missed achievements, and keyword opportunities.

==================================================
CRITICAL ANTI-HALLUCINATION RULES:
==================================================
1. NEVER fabricate, extrapolate, or falsify experience, companies, job titles, employment dates, degrees, certifications, numerical metrics, or skills.
2. NEVER invent credentials, titles, companies, dates, or metrics not present in the CV.
3. If an improvement would benefit from measurable metrics that are absent from the CV, DO NOT invent numbers. Tag it as "USER_VERIFICATION_REQUIRED" and suggest that the candidate verify their specific numbers.
4. Every recommendation MUST be strictly grounded in facts explicitly stated in the CV Context below.
5. Do NOT generate URLs or web links. Application code handles all navigation.

==================================================
CV Context:
==================================================
${cvText.trim()}

==================================================
Current LinkedIn Profile:
==================================================
${currentProfileFormatted.trim()}

==================================================
REQUIRED OUTPUT FORMAT:
==================================================
Return ONLY a valid, parseable JSON object without markdown formatting, code fences, or conversational preamble. The JSON must adhere strictly to this schema:

{
  "overallScore": 82,
  "scoreDimensions": {
    "headline": 75,
    "about": 80,
    "experience": 85,
    "skills": 90,
    "consistency": 80,
    "readability": 85
  },
  "summary": "High-level summary of the gap analysis and primary areas of improvement.",
  "strengths": [
    "Key verified strength 1",
    "Key verified strength 2"
  ],
  "gaps": [
    "Identified gap or missed opportunity 1",
    "Identified gap or missed opportunity 2"
  ],
  "headlineComparison": {
    "current": "current headline or empty string",
    "optimized": "punchy, high-impact recruiter-optimized headline (max 220 chars)",
    "rationale": "why this headline increases recruiter clicks and search indexing"
  },
  "aboutComparison": {
    "current": "current summary or empty string",
    "optimized": "engaging first-person narrative with hooks, core skills, and verified achievements",
    "rationale": "why this narrative converts profile viewers into interviews"
  },
  "sectionRecommendations": [
    {
      "section": "headline",
      "title": "Sharpen Target Positioning",
      "currentContent": "current headline text",
      "recommendedContent": "recommended headline text",
      "cvEvidence": ["specific fact from CV supporting this"],
      "reason": "explanation of recruiter search behavior",
      "improvements": ["key improvement point 1", "key improvement point 2"],
      "priority": "HIGH",
      "confidence": 95,
      "evidenceStatus": "SUPPORTED_BY_CV"
    },
    {
      "section": "about",
      "title": "Structure First-Person Hook & Core Strengths",
      "currentContent": "current about text",
      "recommendedContent": "recommended about text",
      "cvEvidence": ["specific fact from CV"],
      "reason": "explanation of improved engagement",
      "improvements": ["improvement 1"],
      "priority": "HIGH",
      "confidence": 90,
      "evidenceStatus": "SUPPORTED_BY_CV"
    },
    {
      "section": "experience",
      "title": "Highlight Verifiable Outcomes",
      "currentContent": "current experience bullet",
      "recommendedContent": "enhanced bullet with active verbs",
      "cvEvidence": ["verifiable context from CV"],
      "reason": "clarifies role impact",
      "improvements": ["action-oriented structure"],
      "priority": "MEDIUM",
      "confidence": 85,
      "evidenceStatus": "SUPPORTED_BY_CV"
    },
    {
      "section": "skills",
      "title": "Prioritize Top Industry Keywords",
      "currentContent": "current skills list",
      "recommendedContent": "reordered and focused skills list",
      "cvEvidence": ["technologies and tools explicitly listed in CV"],
      "reason": "aligns with ATS search queries",
      "improvements": ["top 5 skill alignment"],
      "priority": "LOW",
      "confidence": 90,
      "evidenceStatus": "SUPPORTED_BY_BOTH"
    }
  ],
  "recommendations": [
    {
      "section": "headline",
      "title": "Sharpen Target Positioning",
      "current": "current headline text",
      "suggested": "recommended headline text",
      "rationale": "explanation of recruiter search behavior"
    }
  ],
  "keywordAnalysis": {
    "matched": ["keywords present in both CV and LinkedIn"],
    "missing": ["high-value keywords present in CV but missing from LinkedIn"],
    "recommended": ["recommended keywords for target roles based on CV"]
  },
  "factualWarnings": [
    "Any reminder for the user to confirm unverified numbers, dates, or titles"
  ],
  "priorityActions": [
    "1. Update headline to target senior role",
    "2. Revise About section with core narrative",
    "3. Strengthen top experience bullets"
  ]
}
`;
}
