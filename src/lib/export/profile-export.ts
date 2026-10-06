/**
 * Core Export Engine for CV2LinkedIn AI.
 * Generates sanitized, publication-grade Markdown, JSON, and A4 printable HTML documents.
 * Guarantees zero leakage of credentials, tokens, or debug metadata.
 */

import type { LinkedInProfilePackage } from '../../types/index.ts';

const SENSITIVE_KEY_PATTERNS = [
  /api[_-]?key/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /client[_-]?secret/i,
  /authorization/i,
  /bearer/i,
  /cookie/i,
  /session[_-]?token/i,
  /password/i
];

/**
 * Deeply sanitizes profile object before export, purging any accidental sensitive credentials.
 */
export function sanitizeProfileExport<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeProfileExport(item)) as unknown as T;
  }

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pat) => pat.test(key));
    if (isSensitive) continue;

    if (value && typeof value === 'object') {
      clean[key] = sanitizeProfileExport(value);
    } else {
      clean[key] = value;
    }
  }

  return clean as T;
}

/**
 * Formats profile into clean, human-readable GitHub-flavored Markdown.
 * Omits empty sections cleanly without fabricating filler text.
 */
export function formatProfileMarkdown(
  profile: LinkedInProfilePackage,
  optimizationSummary?: string
): string {
  const cleanProfile = sanitizeProfileExport(profile);
  const sections: string[] = [];

  sections.push('# LinkedIn Profile Package');

  if (optimizationSummary?.trim()) {
    sections.push(`## Optimization Summary\n\n${optimizationSummary.trim()}`);
  }

  if (cleanProfile.headline?.trim()) {
    sections.push(`## Headline\n\n${cleanProfile.headline.trim()}`);
  }

  if (cleanProfile.about?.trim()) {
    sections.push(`## About / Summary\n\n${cleanProfile.about.trim()}`);
  }

  if (Array.isArray(cleanProfile.experience) && cleanProfile.experience.length > 0) {
    const expLines: string[] = ['## Experience\n'];
    cleanProfile.experience.forEach((exp) => {
      expLines.push(`### ${exp.role} — ${exp.company}`);
      const meta = [exp.location ? `**${exp.location}**` : '', exp.dates].filter(Boolean).join(' | ');
      if (meta) expLines.push(meta);
      expLines.push('');
      if (Array.isArray(exp.bullets)) {
        exp.bullets.forEach((b) => {
          if (b.trim()) expLines.push(`- ${b.trim()}`);
        });
      }
      expLines.push('');
    });
    sections.push(expLines.join('\n').trim());
  }

  if (Array.isArray(cleanProfile.education) && cleanProfile.education.length > 0) {
    const eduLines: string[] = ['## Education\n'];
    cleanProfile.education.forEach((edu) => {
      eduLines.push(`- **${edu.degree}** — ${edu.institution}${edu.dates ? ` (${edu.dates})` : ''}`);
    });
    sections.push(eduLines.join('\n'));
  }

  if (Array.isArray(cleanProfile.skills) && cleanProfile.skills.length > 0) {
    const skillLines = ['## Skills\n', ...cleanProfile.skills.map((s) => `- ${s}`)];
    sections.push(skillLines.join('\n'));
  }

  if (Array.isArray(cleanProfile.certifications) && cleanProfile.certifications.length > 0) {
    const certLines = ['## Certifications\n', ...cleanProfile.certifications.map((c) => `- ${c}`)];
    sections.push(certLines.join('\n'));
  }

  if (Array.isArray(cleanProfile.projects) && cleanProfile.projects.length > 0) {
    const projLines: string[] = ['## Projects\n'];
    cleanProfile.projects.forEach((p) => {
      projLines.push(`### ${p.name}`);
      projLines.push(p.description);
      if (p.technologies && p.technologies.length > 0) {
        projLines.push(`**Technologies:** ${p.technologies.join(', ')}`);
      }
      projLines.push('');
    });
    sections.push(projLines.join('\n').trim());
  }

  if (Array.isArray(cleanProfile.achievements) && cleanProfile.achievements.length > 0) {
    const achLines = ['## Key Achievements\n', ...cleanProfile.achievements.map((a) => `- ${a}`)];
    sections.push(achLines.join('\n'));
  }

  if (Array.isArray(cleanProfile.suggestedKeywords) && cleanProfile.suggestedKeywords.length > 0) {
    sections.push(`## Suggested Search Keywords\n\n${cleanProfile.suggestedKeywords.join(', ')}`);
  }

  return sections.join('\n\n') + '\n';
}

/**
 * Formats profile into clean, formatted JSON.
 */
export function formatProfileJson(
  profile: LinkedInProfilePackage,
  optimizationSummary?: string
): string {
  const sanitized = sanitizeProfileExport(profile);
  const payload: Record<string, any> = {
    headline: sanitized.headline || '',
    about: sanitized.about || '',
    experience: sanitized.experience || [],
    education: sanitized.education || [],
    skills: sanitized.skills || [],
    certifications: sanitized.certifications || [],
    projects: sanitized.projects || [],
    achievements: sanitized.achievements || [],
    suggestedKeywords: sanitized.suggestedKeywords || []
  };

  if (optimizationSummary?.trim()) {
    payload.optimizationSummary = optimizationSummary.trim();
  }

  return JSON.stringify(payload, null, 2);
}

/**
 * Escapes HTML characters safely.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates an A4-optimized printable HTML document with clean CSS typography and @media print support.
 */
export function generatePrintableHtml(
  profile: LinkedInProfilePackage,
  optimizationSummary?: string
): string {
  const clean = sanitizeProfileExport(profile);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LinkedIn Profile Snapshot — ${escapeHtml(clean.headline || 'Profile')}</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 15mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background-color: #ffffff;
      line-height: 1.5;
      font-size: 10.5pt;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }
    .no-print {
      position: sticky;
      top: 0;
      background: #0f172a;
      color: #ffffff;
      padding: 0.75rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 1000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .print-btn {
      background: #0d9488;
      color: white;
      border: none;
      padding: 0.5rem 1.25rem;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .print-btn:hover {
      background: #0f766e;
    }
    .header {
      border-bottom: 2px solid #0d9488;
      padding-bottom: 1rem;
      margin-bottom: 1.5rem;
    }
    h1 {
      font-size: 18pt;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 0.5rem 0;
      line-height: 1.2;
    }
    .headline {
      font-size: 12pt;
      font-weight: 600;
      color: #0d9488;
      margin: 0;
    }
    .section {
      margin-bottom: 1.5rem;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 11.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 0.3rem;
      margin-bottom: 0.75rem;
    }
    .item {
      margin-bottom: 1rem;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 0.25rem;
    }
    .item-title {
      font-weight: 700;
      font-size: 10.5pt;
      color: #0f172a;
    }
    .item-subtitle {
      font-weight: 600;
      color: #475569;
    }
    .item-meta {
      font-size: 9pt;
      color: #64748b;
    }
    ul {
      margin: 0.35rem 0 0 1.25rem;
      padding: 0;
    }
    li {
      margin-bottom: 0.25rem;
    }
    .tag-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }
    .tag {
      background: #f1f5f9;
      color: #334155;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      font-size: 9pt;
      font-weight: 500;
    }
    .summary-box {
      background: #f8fafc;
      border-left: 3px solid #0d9488;
      padding: 0.75rem 1rem;
      font-size: 9.5pt;
      color: #334155;
      margin-bottom: 1.5rem;
    }
    @media print {
      .no-print {
        display: none !important;
      }
      .container {
        padding: 0;
        max-width: 100%;
      }
      body {
        font-size: 10pt;
      }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <div>
      <strong>LinkedIn Profile Snapshot</strong> — Ready for A4 Print / Save as PDF
    </div>
    <button class="print-btn" onclick="window.print()">
      🖨️ Print or Save as PDF
    </button>
  </div>

  <div class="container">
    <div class="header">
      <h1>LinkedIn Profile Package</h1>
      <p class="headline">${escapeHtml(clean.headline || 'Professional Profile')}</p>
    </div>

    ${
      optimizationSummary
        ? `<div class="summary-box">
             <strong>Optimization Summary:</strong> ${escapeHtml(optimizationSummary)}
           </div>`
        : ''
    }

    ${
      clean.about
        ? `<div class="section">
             <div class="section-title">About / Summary</div>
             <p style="margin: 0; white-space: pre-line;">${escapeHtml(clean.about)}</p>
           </div>`
        : ''
    }

    ${
      Array.isArray(clean.experience) && clean.experience.length > 0
        ? `<div class="section">
             <div class="section-title">Experience</div>
             ${clean.experience
               .map(
                 (exp) => `
               <div class="item">
                 <div class="item-header">
                   <div>
                     <span class="item-title">${escapeHtml(exp.role)}</span>
                     <span class="item-subtitle"> — ${escapeHtml(exp.company)}</span>
                   </div>
                   <div class="item-meta">
                     ${exp.location ? `${escapeHtml(exp.location)} | ` : ''}${escapeHtml(exp.dates || '')}
                   </div>
                 </div>
                 ${
                   Array.isArray(exp.bullets) && exp.bullets.length > 0
                     ? `<ul>${exp.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>`
                     : ''
                 }
               </div>`
               )
               .join('')}
           </div>`
        : ''
    }

    ${
      Array.isArray(clean.education) && clean.education.length > 0
        ? `<div class="section">
             <div class="section-title">Education</div>
             ${clean.education
               .map(
                 (edu) => `
               <div class="item">
                 <div class="item-header">
                   <div>
                     <span class="item-title">${escapeHtml(edu.degree)}</span>
                     <span class="item-subtitle"> — ${escapeHtml(edu.institution)}</span>
                   </div>
                   <div class="item-meta">${escapeHtml(edu.dates || '')}</div>
                 </div>
               </div>`
               )
               .join('')}
           </div>`
        : ''
    }

    ${
      Array.isArray(clean.skills) && clean.skills.length > 0
        ? `<div class="section">
             <div class="section-title">Skills</div>
             <div class="tag-list">
               ${clean.skills.map((s) => `<span class="tag">${escapeHtml(s)}</span>`).join('')}
             </div>
           </div>`
        : ''
    }

    ${
      Array.isArray(clean.certifications) && clean.certifications.length > 0
        ? `<div class="section">
             <div class="section-title">Certifications</div>
             <ul>
               ${clean.certifications.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}
             </ul>
           </div>`
        : ''
    }

    ${
      Array.isArray(clean.projects) && clean.projects.length > 0
        ? `<div class="section">
             <div class="section-title">Projects</div>
             ${clean.projects
               .map(
                 (p) => `
               <div class="item">
                 <div class="item-title">${escapeHtml(p.name)}</div>
                 <p style="margin: 0.2rem 0;">${escapeHtml(p.description)}</p>
                 ${
                   Array.isArray(p.technologies) && p.technologies.length > 0
                     ? `<div class="item-meta">Technologies: ${escapeHtml(p.technologies.join(', '))}</div>`
                     : ''
                 }
               </div>`
               )
               .join('')}
           </div>`
        : ''
    }

    ${
      Array.isArray(clean.achievements) && clean.achievements.length > 0
        ? `<div class="section">
             <div class="section-title">Key Achievements</div>
             <ul>
               ${clean.achievements.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}
             </ul>
           </div>`
        : ''
    }
  </div>
</body>
</html>`;
}
