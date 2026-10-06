/**
 * Dedicated LinkedIn Profile AI Prompt Engine & Schema Normalizer.
 * Enforces strict anti-hallucination rules and structured JSON generation.
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

export interface LinkedInProfileGeneratedOutput {
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

/**
 * Builds system instruction and candidate prompt.
 */
export function buildLinkedInProfilePrompt(cvText: string): {
  systemInstruction: string;
  userPrompt: string;
} {
  const systemInstruction = `You are an elite LinkedIn profile consultant and executive career branding strategist.
Your task is to transform the candidate's authentic CV text into a polished, recruiter-ready LinkedIn profile package.

STRICT ANTI-HALLUCINATION RULES:
1. Never invent companies that are not in the CV.
2. Never invent job titles that are not supported by the CV.
3. Never invent dates, employment durations, or graduation years.
4. Never invent degrees or educational institutions.
5. Never invent certifications, licenses, or credentials.
6. Never invent achievements, prizes, or awards.
7. Never invent numerical metrics, percentages, dollar amounts, or statistics (e.g. if the CV says "managed social media", DO NOT invent "grew following by 300%").
8. Never invent revenue, budgets, or sales numbers.
9. Never invent employee or team sizes not stated in the CV.
10. Never invent technologies or tools that are not mentioned or clearly implied by the candidate's experience.

PROFESSIONAL POSITIONING & POLISHING:
- Headline: Maximum 220 characters. High impact, recruiter-friendly, reflecting the candidate's actual target role and core strengths.
- About: A compelling, authentic first-person professional narrative (hook, core competencies, highlighted accomplishments from CV, tools/technologies, and networking invitation).
- Experience: Preserve the candidate's actual company, role, location, and dates. Rewrite weak bullet points into strong professional statements using action verbs. Use the STAR-style structure (Situation, Task, Action, Result) ONLY when sufficient factual information exists in the CV.
- Education, Skills, Certifications, Projects, Achievements: Faithfully extract and cleanly organize what is authentic to the candidate.
- Suggested Keywords: 5-10 strategic ATS and LinkedIn search keywords matching the candidate's actual background.

OUTPUT FORMAT:
Return pure, valid JSON with no markdown wrapping, matching this exact schema:
{
  "headline": "string (under 220 characters)",
  "about": "string (engaging first-person narrative)",
  "experience": [
    {
      "company": "string",
      "role": "string",
      "location": "string",
      "dates": "string",
      "bullets": ["string", "string"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "dates": "string"
    }
  ],
  "skills": ["string", "string"],
  "certifications": ["string"],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "technologies": ["string"]
    }
  ],
  "achievements": ["string"],
  "suggestedKeywords": ["string"]
}`;

  const userPrompt = `Candidate CV Document Text:\n\n"""\n${cvText}\n"""\n\nAnalyze the CV text above and generate the LinkedIn profile JSON package according to the strict instructions.`;

  return { systemInstruction, userPrompt };
}

/**
 * Validates, normalizes, and repairs raw JSON response from Gemini.
 */
export function validateAndNormalizeProfileOutput(
  rawText: string
): LinkedInProfileGeneratedOutput {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('AI returned an invalid profile format. Please try again.');
  }

  // 1. Strip markdown fences if present
  let cleanText = rawText.trim();
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?\s*\n?/i, '');
    cleanText = cleanText.replace(/\n?```\s*$/i, '');
    cleanText = cleanText.trim();
  }

  // 2. Parse JSON
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleanText);
  } catch {
    throw new Error('AI returned an invalid profile format. Please try again.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI returned an invalid profile format. Please try again.');
  }

  // 3. Validate required fields
  const headline = typeof parsed.headline === 'string' ? parsed.headline.trim() : '';
  const about = typeof parsed.about === 'string' ? parsed.about.trim() : '';

  if (!headline || !about) {
    throw new Error('AI returned an invalid profile format. Please try again.');
  }

  // 4. Normalize Experience array
  const rawExperience = Array.isArray(parsed.experience) ? parsed.experience : [];
  const experience: GeneratedExperienceItem[] = rawExperience.map((exp: Record<string, unknown>) => ({
    company: String(exp?.company || 'Company').trim(),
    role: String(exp?.role || 'Professional Role').trim(),
    location: exp?.location ? String(exp.location).trim() : undefined,
    dates: String(exp?.dates || '').trim(),
    bullets: Array.isArray(exp?.bullets)
      ? exp.bullets.map(b => String(b).trim()).filter(Boolean)
      : []
  }));

  // 5. Normalize Education array
  const rawEducation = Array.isArray(parsed.education) ? parsed.education : [];
  const education: GeneratedEducationItem[] = rawEducation.map((edu: Record<string, unknown>) => ({
    institution: String(edu?.institution || 'Institution').trim(),
    degree: String(edu?.degree || 'Degree').trim(),
    dates: String(edu?.dates || '').trim()
  }));

  // 6. Normalize Skills array
  const skills = Array.isArray(parsed.skills)
    ? parsed.skills.map(s => String(s).trim()).filter(Boolean)
    : [];

  // 7. Normalize Certifications array
  const certifications = Array.isArray(parsed.certifications)
    ? parsed.certifications.map(c => String(c).trim()).filter(Boolean)
    : [];

  // 8. Normalize Projects array
  const rawProjects = Array.isArray(parsed.projects) ? parsed.projects : [];
  const projects: GeneratedProjectItem[] = rawProjects.map((p: Record<string, unknown>) => ({
    name: String(p?.name || 'Project').trim(),
    description: String(p?.description || '').trim(),
    technologies: Array.isArray(p?.technologies)
      ? p.technologies.map(t => String(t).trim()).filter(Boolean)
      : []
  }));

  // 9. Normalize Achievements array
  const achievements = Array.isArray(parsed.achievements)
    ? parsed.achievements.map(a => String(a).trim()).filter(Boolean)
    : [];

  // 10. Normalize Suggested Keywords array
  const suggestedKeywords = Array.isArray(parsed.suggestedKeywords)
    ? parsed.suggestedKeywords.map(k => String(k).trim()).filter(Boolean)
    : [];

  return {
    headline: headline.length > 220 ? headline.slice(0, 220) : headline,
    about,
    experience,
    education,
    skills,
    certifications,
    projects,
    achievements,
    suggestedKeywords
  };
}
