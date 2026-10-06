import type { LinkedInProfileData, LinkedInUserInfo, LinkedInMemberIdentity } from './types.ts';
import type { GeneratedExperienceItem, GeneratedEducationItem, GeneratedProjectItem } from '../../types/index.ts';

/**
 * Normalizes raw LinkedIn OIDC UserInfo into member identity.
 */
export function normalizeLinkedInUserInfo(raw: LinkedInUserInfo): LinkedInMemberIdentity {
  return {
    id: raw.sub || '',
    name: raw.name || [raw.given_name, raw.family_name].filter(Boolean).join(' ') || 'LinkedIn Member',
    email: raw.email,
    picture: raw.picture,
    connectedAt: new Date().toISOString()
  };
}

/**
 * Normalizes LinkedIn API data into the provider-independent internal profile schema.
 *
 * CRITICAL RULE:
 * Only populate fields actually present from LinkedIn API.
 * NEVER fabricate, infer, or hallucinate missing fields.
 * If LinkedIn returns only OIDC basic data, career sections MUST remain undefined.
 */
export function normalizeLinkedInProfile(raw: unknown): LinkedInProfileData {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const data = raw as Record<string, unknown>;
  const profile: LinkedInProfileData = {};

  // 1. Headline (Only populate if present as non-empty string)
  if (typeof data.headline === 'string' && data.headline.trim()) {
    profile.headline = data.headline.trim();
  }

  // 2. About / Summary
  const rawAbout = typeof data.about === 'string' ? data.about : typeof data.summary === 'string' ? data.summary : null;
  if (rawAbout && rawAbout.trim()) {
    profile.about = rawAbout.trim();
  }

  // 3. Experience / Positions
  const rawPositions = Array.isArray(data.positions) ? data.positions : Array.isArray(data.experience) ? data.experience : null;
  if (rawPositions && rawPositions.length > 0) {
    const experiences: GeneratedExperienceItem[] = [];
    for (const pos of rawPositions) {
      if (pos && typeof pos === 'object') {
        const p = pos as Record<string, unknown>;
        const company = String(p.companyName || p.company || '').trim();
        const role = String(p.title || p.role || '').trim();
        if (company || role) {
          experiences.push({
            company: company || 'Company',
            role: role || 'Role',
            location: typeof p.location === 'string' ? p.location : undefined,
            dates: typeof p.dates === 'string' ? p.dates : typeof p.startDate === 'string' ? `${p.startDate} - ${p.endDate || 'Present'}` : '',
            bullets: Array.isArray(p.bullets)
              ? p.bullets.map(String)
              : typeof p.description === 'string' && p.description.trim()
                ? [p.description.trim()]
                : []
          });
        }
      }
    }
    if (experiences.length > 0) {
      profile.experience = experiences;
    }
  }

  // 4. Education
  const rawEdu = Array.isArray(data.education) ? data.education : null;
  if (rawEdu && rawEdu.length > 0) {
    const education: GeneratedEducationItem[] = [];
    for (const item of rawEdu) {
      if (item && typeof item === 'object') {
        const ed = item as Record<string, unknown>;
        const institution = String(ed.schoolName || ed.institution || '').trim();
        const degree = String(ed.degreeName || ed.degree || '').trim();
        if (institution || degree) {
          education.push({
            institution: institution || 'Institution',
            degree: degree || 'Degree',
            dates: typeof ed.dates === 'string' ? ed.dates : typeof ed.startDate === 'string' ? `${ed.startDate} - ${ed.endDate || ''}` : ''
          });
        }
      }
    }
    if (education.length > 0) {
      profile.education = education;
    }
  }

  // 5. Skills
  const rawSkills = Array.isArray(data.skills) ? data.skills : null;
  if (rawSkills && rawSkills.length > 0) {
    const skills = rawSkills
      .map(s => (typeof s === 'string' ? s : typeof s === 'object' && s && 'name' in s ? String((s as Record<string, unknown>).name) : ''))
      .map(s => s.trim())
      .filter(Boolean);
    if (skills.length > 0) {
      profile.skills = skills;
    }
  }

  // 6. Certifications
  const rawCerts = Array.isArray(data.certifications) ? data.certifications : null;
  if (rawCerts && rawCerts.length > 0) {
    const certs = rawCerts
      .map(c => (typeof c === 'string' ? c : typeof c === 'object' && c && 'name' in c ? String((c as Record<string, unknown>).name) : ''))
      .map(c => c.trim())
      .filter(Boolean);
    if (certs.length > 0) {
      profile.certifications = certs;
    }
  }

  // 7. Projects
  const rawProjects = Array.isArray(data.projects) ? data.projects : null;
  if (rawProjects && rawProjects.length > 0) {
    const projects: GeneratedProjectItem[] = [];
    for (const item of rawProjects) {
      if (item && typeof item === 'object') {
        const pr = item as Record<string, unknown>;
        const name = String(pr.name || pr.title || '').trim();
        const description = String(pr.description || '').trim();
        if (name) {
          projects.push({
            name,
            description,
            technologies: Array.isArray(pr.technologies) ? pr.technologies.map(String) : undefined
          });
        }
      }
    }
    if (projects.length > 0) {
      profile.projects = projects;
    }
  }

  // 8. Achievements
  const rawAchievements = Array.isArray(data.achievements) ? data.achievements : null;
  if (rawAchievements && rawAchievements.length > 0) {
    const achievements = rawAchievements.map(String).map(a => a.trim()).filter(Boolean);
    if (achievements.length > 0) {
      profile.achievements = achievements;
    }
  }

  return profile;
}
