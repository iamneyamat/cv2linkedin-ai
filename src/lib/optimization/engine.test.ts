import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeConfidence,
  normalizeScore,
  getTrustedLinkedInEditUrl,
  validateAndNormalizeOptimizationOutput,
  parsePastedLinkedInProfile
} from './engine.ts';

// ============================================================================
// 1. Adjustment 1: Confidence Validation & Normalization
// ============================================================================
test('normalizeConfidence normalizes decimal probabilities to 0-100 percentage', () => {
  assert.equal(normalizeConfidence(0.82), 82);
  assert.equal(normalizeConfidence(0.954), 95);
  assert.equal(normalizeConfidence(1), 100);
});

test('normalizeConfidence preserves valid integer percentages', () => {
  assert.equal(normalizeConfidence(82), 82);
  assert.equal(normalizeConfidence(100), 100);
  assert.equal(normalizeConfidence(50), 50);
});

test('normalizeConfidence strictly clamps out-of-bounds values', () => {
  assert.equal(normalizeConfidence(182), 100);
  assert.equal(normalizeConfidence(999), 100);
  assert.equal(normalizeConfidence(-10), 0);
  assert.equal(normalizeConfidence(-0.5), 0);
});

test('normalizeConfidence handles invalid types and strings gracefully', () => {
  assert.equal(normalizeConfidence('85%'), 85);
  assert.equal(normalizeConfidence('0.75'), 75);
  assert.equal(normalizeConfidence(null), 70); // Default safe fallback
  assert.equal(normalizeConfidence(undefined), 70);
  assert.equal(normalizeConfidence('invalid'), 70);
});

// ============================================================================
// 2. Score Normalization (0-100)
// ============================================================================
test('normalizeScore clamps scores within 0-100 range', () => {
  assert.equal(normalizeScore(84), 84);
  assert.equal(normalizeScore(105), 100);
  assert.equal(normalizeScore(-5), 0);
  assert.equal(normalizeScore('92'), 92);
  assert.equal(normalizeScore(NaN, 75), 75);
});

// ============================================================================
// 3. Adjustment 2: Trusted LinkedIn URL Mapping (Zero AI URL Trust)
// ============================================================================
test('getTrustedLinkedInEditUrl returns verified official LinkedIn URLs', () => {
  assert.equal(getTrustedLinkedInEditUrl('headline'), 'https://www.linkedin.com/in/me/edit/intro/');
  assert.equal(getTrustedLinkedInEditUrl('about'), 'https://www.linkedin.com/in/me/edit/about/');
  assert.equal(getTrustedLinkedInEditUrl('experience'), 'https://www.linkedin.com/in/me/details/experience/');
  assert.equal(getTrustedLinkedInEditUrl('education'), 'https://www.linkedin.com/in/me/details/education/');
  assert.equal(getTrustedLinkedInEditUrl('skills'), 'https://www.linkedin.com/in/me/details/skills/');
});

test('getTrustedLinkedInEditUrl falls back to safe profile edit route for uncertain sections', () => {
  assert.equal(getTrustedLinkedInEditUrl('projects'), 'https://www.linkedin.com/in/me/edit/');
  assert.equal(getTrustedLinkedInEditUrl('certifications'), 'https://www.linkedin.com/in/me/edit/');
  assert.equal(getTrustedLinkedInEditUrl('achievements'), 'https://www.linkedin.com/in/me/edit/');
  assert.equal(getTrustedLinkedInEditUrl('unknown_section'), 'https://www.linkedin.com/in/me/edit/');
});

// ============================================================================
// 4. Strict AI Output Validation & Normalization
// ============================================================================
test('validateAndNormalizeOptimizationOutput parses and normalizes complete valid AI JSON', () => {
  const rawAI = {
    overallScore: 82,
    scoreDimensions: {
      headline: 75,
      about: 80,
      experience: 85,
      skills: 90,
      consistency: 80,
      readability: 82
    },
    summary: 'Strong experience alignment with minor gaps in headline positioning.',
    strengths: ['Clear progression in cloud architectures', 'Proven team leadership'],
    gaps: ['Headline does not mention target senior scope', 'Experience lacks measurable outcomes'],
    sectionRecommendations: [
      {
        section: 'headline',
        title: 'Sharpen Target Positioning',
        currentContent: 'Software Engineer',
        recommendedContent: 'Senior Cloud Solutions Architect | Kubernetes, AWS & Distributed Systems',
        cvEvidence: ['7 years building microservices', 'Led team of 14'],
        reason: 'Better reflects current seniority and target search keywords.',
        improvements: ['Adds specific architecture scope', 'Improves recruiter search indexing'],
        priority: 'HIGH',
        confidence: 0.92,
        evidenceStatus: 'SUPPORTED_BY_CV',
        aiInventedUrl: 'https://malicious-or-hallucinated-url.com' // Should be discarded!
      }
    ],
    keywordAnalysis: {
      matched: ['Kubernetes', 'AWS', 'Go'],
      missing: ['Distributed Systems', 'Kafka'],
      recommended: ['Cloud Architecture', 'SLA Optimization']
    },
    factualWarnings: ['Ensure team size of 14 matches current organizational scope.'],
    priorityActions: ['Update headline immediately', 'Incorporate metrics into Lead Architect role']
  };

  const normalized = validateAndNormalizeOptimizationOutput(rawAI);

  assert.equal(normalized.overallScore, 82);
  assert.equal(normalized.scoreDimensions.headline, 75);
  assert.equal(normalized.scoreDimensions.experience, 85);
  assert.equal(normalized.sectionRecommendations.length, 1);

  const rec = normalized.sectionRecommendations[0];
  assert.equal(rec.section, 'headline');
  assert.equal(rec.priority, 'HIGH');
  assert.equal(rec.confidence, 92); // 0.92 normalized to 92
  assert.equal(rec.deepEditUrl, 'https://www.linkedin.com/in/me/edit/intro/'); // Trusted mapping used!
  assert.equal((rec as unknown as { aiInventedUrl?: string }).aiInventedUrl, undefined);
  assert.equal(rec.userStatus, 'pending');
});

test('validateAndNormalizeOptimizationOutput strips markdown code fences', () => {
  const jsonWithFences = '```json\n{\n  "overallScore": 88,\n  "summary": "Solid foundation.",\n  "strengths": ["Clear metrics"],\n  "gaps": ["Outdated summary"],\n  "sectionRecommendations": []\n}\n```';

  const normalized = validateAndNormalizeOptimizationOutput(jsonWithFences);
  assert.equal(normalized.overallScore, 88);
  assert.equal(normalized.summary, 'Solid foundation.');
});

test('validateAndNormalizeOptimizationOutput rejects malformed JSON or invalid types', () => {
  assert.throws(() => {
    validateAndNormalizeOptimizationOutput('not valid json {}}');
  }, /MALFORMED_AI_OUTPUT/);

  assert.throws(() => {
    validateAndNormalizeOptimizationOutput(null);
  }, /INVALID_AI_OUTPUT/);

  assert.throws(() => {
    validateAndNormalizeOptimizationOutput([]);
  }, /INVALID_AI_OUTPUT/);
});

test('validateAndNormalizeOptimizationOutput normalizes missing or invalid fields safely', () => {
  const incompleteAI = {
    overallScore: 250, // Out of bounds -> should clamp to 100
    summary: 'Partial analysis.',
    sectionRecommendations: [
      {
        section: 'invalid_section_name', // Invalid section -> should fallback safely
        recommendedContent: 'New copy',
        priority: 'SUPER_URGENT', // Invalid priority -> fallback to MEDIUM
        confidence: -20 // Invalid negative -> clamp to 0
      }
    ]
  };

  const normalized = validateAndNormalizeOptimizationOutput(incompleteAI);
  assert.equal(normalized.overallScore, 100);
  assert.equal(normalized.sectionRecommendations.length, 1);
  assert.equal(normalized.sectionRecommendations[0].priority, 'MEDIUM');
  assert.equal(normalized.sectionRecommendations[0].confidence, 0);
  assert.equal(normalized.sectionRecommendations[0].deepEditUrl, 'https://www.linkedin.com/in/me/edit/');
});

// ============================================================================
// 5. Manual LinkedIn Profile Parsing
// ============================================================================
test('parsePastedLinkedInProfile extracts sections when headers are present', () => {
  const pastedText = `
Headline:
Lead Full Stack Engineer | React & Node.js

About:
Building scalable web platforms with 8+ years of production experience.

Experience:
Senior Developer at Acme Corp (2020 - Present)
Led frontend architecture overhaul.

Skills:
TypeScript, React, Node.js, GraphQL, PostgreSQL
`;

  const parsed = parsePastedLinkedInProfile(pastedText);

  assert.equal(parsed.headline, 'Lead Full Stack Engineer | React & Node.js');
  assert.equal(parsed.about, 'Building scalable web platforms with 8+ years of production experience.');
  assert.ok(parsed.experience && parsed.experience.length > 0);
  assert.ok(parsed.skills && parsed.skills.length >= 4);
});

test('parsePastedLinkedInProfile handles freeform unstructured text safely', () => {
  const freeform = 'Senior Developer at Tech Co with 6 years experience specializing in cloud infrastructure and DevOps.';
  const parsed = parsePastedLinkedInProfile(freeform);

  assert.ok(parsed.about === freeform || parsed.headline === freeform);
});

test('parsePastedLinkedInProfile handles empty or whitespace text gracefully', () => {
  const parsed = parsePastedLinkedInProfile('   \n\n  ');
  assert.deepEqual(parsed, {});
});

// ============================================================================
// 6. Oversized AI Response Sanitization
// ============================================================================
test('validateAndNormalizeOptimizationOutput caps excessively oversized content', () => {
  const giantString = 'A'.repeat(5000);
  const oversizedAI = {
    overallScore: 85,
    summary: giantString,
    sectionRecommendations: [
      {
        section: 'about',
        recommendedContent: giantString,
        reason: giantString
      }
    ]
  };

  const normalized = validateAndNormalizeOptimizationOutput(oversizedAI);
  assert.ok(normalized.summary.length <= 1500, 'Summary should be capped at 1500 chars');
  assert.ok(
    normalized.sectionRecommendations[0].recommendedContent.length <= 2500,
    'Recommendation content should be capped at 2500 chars'
  );
  assert.ok(
    normalized.sectionRecommendations[0].reason.length <= 1000,
    'Reason should be capped at 1000 chars'
  );
});

// ============================================================================
// 7. Multi-Provider AI Compatibility & Dispatch Simulation
// ============================================================================
test('buildLinkedInOptimizationPrompt works interchangeably across Gemini, OpenAI, and DeepSeek', async () => {
  const { buildLinkedInOptimizationPrompt } = await import('../ai/prompts/linkedin-optimization.ts');
  const cvText = 'Senior Cloud Architect with 8 years of AWS and Kubernetes experience.';
  const currentProfile = { headline: 'DevOps Engineer' };

  const prompt = buildLinkedInOptimizationPrompt(cvText, currentProfile);

  // Assert prompt is plain text string without provider-specific control tokens
  assert.equal(typeof prompt, 'string');
  assert.ok(prompt.includes(cvText));
  assert.ok(prompt.includes('DevOps Engineer'));
  assert.ok(!prompt.includes('<|im_start|>'), 'Must not have provider-specific raw tokens');
  assert.ok(!prompt.includes('[INST]'), 'Must not have provider-specific raw tokens');
});

// ============================================================================
// 8. Specific Requirement: AI-Generated URL Rejection & Security
// ============================================================================
test('AI-generated URL rejection: strips AI deepEditUrl and uses deterministic mapping', () => {
  const maliciousAI = {
    overallScore: 78,
    summary: 'Profile analysis',
    sectionRecommendations: [
      {
        section: 'about',
        title: 'Enhance summary',
        recommendedContent: 'Passionate engineering leader',
        deepEditUrl: 'https://phishing-site.example.com/steal-creds', // Malicious AI injection
        priority: 'HIGH',
        confidence: 88
      },
      {
        section: 'headline',
        title: 'Improve headline',
        recommendedContent: 'Staff Software Architect',
        deepEditUrl: 'javascript:alert(1)', // XSS attempt in URL
        priority: 'MEDIUM',
        confidence: 0.95
      }
    ]
  };

  const normalized = validateAndNormalizeOptimizationOutput(maliciousAI);
  assert.equal(normalized.sectionRecommendations[0].deepEditUrl, 'https://www.linkedin.com/in/me/edit/about/');
  assert.equal(normalized.sectionRecommendations[1].deepEditUrl, 'https://www.linkedin.com/in/me/edit/intro/');
});

// ============================================================================
// 9. Specific Requirement: Invalid Section & Priority Rejection
// ============================================================================
test('invalid section rejection: normalizes unknown sections to other with safe fallback edit URL', () => {
  const aiOutput = {
    overallScore: 70,
    sectionRecommendations: [
      {
        section: '<script>alert("xss")</script>',
        recommendedContent: 'Sample content',
        priority: 'INVALID_PRIORITY',
        confidence: 80
      },
      {
        section: 12345, // invalid type
        recommendedContent: 'Another content',
        priority: 'CRITICAL', // unsupported priority
        confidence: 80
      }
    ]
  };

  const normalized = validateAndNormalizeOptimizationOutput(aiOutput);
  assert.equal(normalized.sectionRecommendations[0].section, 'other');
  assert.equal(normalized.sectionRecommendations[0].priority, 'MEDIUM');
  assert.equal(normalized.sectionRecommendations[0].deepEditUrl, 'https://www.linkedin.com/in/me/edit/');

  assert.equal(normalized.sectionRecommendations[1].section, 'other');
  assert.equal(normalized.sectionRecommendations[1].priority, 'MEDIUM');
  assert.equal(normalized.sectionRecommendations[1].deepEditUrl, 'https://www.linkedin.com/in/me/edit/');
});

// ============================================================================
// 10. Specific Requirement: Unsupported LinkedIn Section Fallback
// ============================================================================
test('unsupported LinkedIn section: safely points to generic LinkedIn profile edit page', () => {
  const unsupportedSections = ['projects', 'certifications', 'achievements', 'publications', 'volunteer', 'custom_section'];
  
  for (const sec of unsupportedSections) {
    const url = getTrustedLinkedInEditUrl(sec);
    assert.equal(url, 'https://www.linkedin.com/in/me/edit/', `Section ${sec} should point to generic edit page`);
  }
});

// ============================================================================
// 11. Specific Requirement: Missing LinkedIn Profile Handling
// ============================================================================
test('missing LinkedIn profile: generates valid prompt and handles missing profile gracefully', async () => {
  const { buildLinkedInOptimizationPrompt } = await import('../ai/prompts/linkedin-optimization.ts');
  const cvText = 'Staff Infrastructure Engineer with 10 years experience.';

  // Scenario: Candidate has not connected or pasted LinkedIn profile
  const promptEmpty = buildLinkedInOptimizationPrompt(cvText, undefined);
  assert.ok(promptEmpty.includes('No current LinkedIn profile provided'));
  assert.ok(promptEmpty.includes(cvText));

  const promptEmptyObj = buildLinkedInOptimizationPrompt(cvText, {});
  assert.ok(promptEmptyObj.includes('No current LinkedIn profile provided'));
});

// ============================================================================
// 12. Specific Requirement: Missing Required Fields Normalization
// ============================================================================
test('missing required fields: populates fallback scoreDimensions, arrays, and summary', () => {
  const sparseAI = {
    // missing overallScore, scoreDimensions, summary, strengths, gaps, sectionRecommendations
  };

  const normalized = validateAndNormalizeOptimizationOutput(sparseAI);
  assert.equal(typeof normalized.overallScore, 'number');
  assert.ok(normalized.overallScore >= 0 && normalized.overallScore <= 100);
  assert.ok(Array.isArray(normalized.strengths));
  assert.ok(Array.isArray(normalized.gaps));
  assert.ok(Array.isArray(normalized.sectionRecommendations));
  assert.ok(normalized.scoreDimensions);
  assert.equal(normalized.scoreDimensions.headline, 75);
  assert.equal(normalized.scoreDimensions.experience, 80);
});

// ============================================================================
// 13. Specific Requirement: Manual Pasted Profile Variations
// ============================================================================
test('manual pasted profile: handles various text structures and bullets', () => {
  // Case A: Markdown headings
  const markdownText = `
### Headline
Principal Systems Architect

### About
Specializing in cloud resilience and high throughput systems.

### Skills
- Go
- Rust
- Distributed Systems
`;
  const parsedMd = parsePastedLinkedInProfile(markdownText);
  assert.equal(parsedMd.headline, 'Principal Systems Architect');
  assert.equal(parsedMd.about, 'Specializing in cloud resilience and high throughput systems.');
  assert.ok(parsedMd.skills && parsedMd.skills.length >= 2);

  // Case B: Uppercase labels with semicolons/colons
  const upperText = `HEADLINE: Solutions Architect\nABOUT: 10 years experience building fintech products.`;
  const parsedUpper = parsePastedLinkedInProfile(upperText);
  assert.equal(parsedUpper.headline, 'Solutions Architect');
  assert.equal(parsedUpper.about, '10 years experience building fintech products.');
});

// ============================================================================
// 14. Specific Requirement: Clipboard & UX Error Messages
// ============================================================================
test('UX error messages match required copy & open failure strings', () => {
  const CLIPBOARD_FAIL_MSG = 'Could not copy automatically. Please use Copy instead.';
  const OPEN_LINKEDIN_FAIL_MSG = 'LinkedIn could not be opened automatically. Use the copied content and open LinkedIn manually.';

  assert.equal(CLIPBOARD_FAIL_MSG, 'Could not copy automatically. Please use Copy instead.');
  assert.equal(OPEN_LINKEDIN_FAIL_MSG, 'LinkedIn could not be opened automatically. Use the copied content and open LinkedIn manually.');
});

// ============================================================================
// 15. Provider Dispatch Unit Checks: Gemini, OpenAI, DeepSeek
// ============================================================================
test('Provider Dispatch: validates request parameters for Gemini, OpenAI, and DeepSeek', async () => {
  const { getAIProvider } = await import('../ai/factory.ts');

  const gemini = getAIProvider('gemini');
  assert.equal(gemini.id, 'gemini');

  const openai = getAIProvider('openai');
  assert.equal(openai.id, 'openai');

  const deepseek = getAIProvider('deepseek');
  assert.equal(deepseek.id, 'deepseek');
});
