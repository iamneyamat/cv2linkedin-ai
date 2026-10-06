import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLinkedInProfilePrompt,
  validateAndNormalizeProfileOutput
} from './linkedin-profile.ts';

test('buildLinkedInProfilePrompt includes anti-hallucination guardrails and CV text', () => {
  const { systemInstruction, userPrompt } = buildLinkedInProfilePrompt('Experienced Python engineer at Acme Corp 2020-2023.');

  assert.ok(systemInstruction.includes('Never invent companies'));
  assert.ok(systemInstruction.includes('Never invent numerical metrics'));
  assert.ok(userPrompt.includes('Acme Corp'));
});

test('validateAndNormalizeProfileOutput parses clean JSON and normalizes arrays', () => {
  const sampleJson = JSON.stringify({
    headline: 'Senior Python Engineer | Cloud Architecture',
    about: 'Experienced software engineer specializing in scalable backend systems.',
    experience: [
      {
        company: 'Acme Corp',
        role: 'Senior Engineer',
        location: 'Remote',
        dates: '2020 - 2023',
        bullets: ['Engineered high-throughput event processing pipelines.']
      }
    ],
    education: [
      {
        institution: 'Tech University',
        degree: 'B.S. in Computer Science',
        dates: '2016 - 2020'
      }
    ],
    skills: ['Python', 'Docker', 'AWS'],
    certifications: ['AWS Solutions Architect'],
    projects: [],
    achievements: [],
    suggestedKeywords: ['Cloud', 'Microservices']
  });

  const parsed = validateAndNormalizeProfileOutput(sampleJson);
  assert.equal(parsed.headline, 'Senior Python Engineer | Cloud Architecture');
  assert.equal(parsed.experience.length, 1);
  assert.equal(parsed.experience[0].company, 'Acme Corp');
  assert.deepEqual(parsed.skills, ['Python', 'Docker', 'AWS']);
  assert.deepEqual(parsed.suggestedKeywords, ['Cloud', 'Microservices']);
});

test('validateAndNormalizeProfileOutput handles markdown fenced code blocks', () => {
  const fenced = '```json\n{"headline": "Lead Architect", "about": "Leader...", "experience": [], "education": [], "skills": []}\n```';
  const parsed = validateAndNormalizeProfileOutput(fenced);
  assert.equal(parsed.headline, 'Lead Architect');
  assert.deepEqual(parsed.certifications, []);
  assert.deepEqual(parsed.projects, []);
  assert.deepEqual(parsed.achievements, []);
  assert.deepEqual(parsed.suggestedKeywords, []);
});

test('validateAndNormalizeProfileOutput rejects malformed JSON', () => {
  assert.throws(
    () => validateAndNormalizeProfileOutput('not a valid json'),
    /AI returned an invalid profile format/i
  );
});

test('validateAndNormalizeProfileOutput rejects output missing headline or about', () => {
  assert.throws(
    () => validateAndNormalizeProfileOutput(JSON.stringify({ experience: [] })),
    /AI returned an invalid profile format/i
  );
});
