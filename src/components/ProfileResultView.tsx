'use client';

import React, { useState } from 'react';
import {
  LinkedInProfilePackage,
  GeneratedExperienceItem,
  GeneratedProjectItem,
  AIMode
} from '@/types';
import {
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Briefcase,
  GraduationCap,
  Award,
  Code,
  FileText,
  Tag,
  Trophy,
  Edit3,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Printer,
  Download
} from 'lucide-react';
import { LinkedInConnection } from '@/components/LinkedInConnection';
import { ManualLinkedInImportModal } from '@/components/ManualLinkedInImportModal';
import { LinkedInOptimizerDashboard } from '@/components/LinkedInOptimizerDashboard';
import { OptimizationResult } from '@/lib/optimization/types';
import { LinkedInProfileData } from '@/lib/linkedin/types';
import { AIConfig } from '@/types';
import {
  formatProfileMarkdown,
  formatProfileJson,
  generatePrintableHtml
} from '@/lib/export/profile-export';

interface ProfileResultViewProps {
  packageData: LinkedInProfilePackage;
  onReset: () => void;
  modeUsed?: AIMode;
  aiConfig?: AIConfig;
}

export const ProfileResultView: React.FC<ProfileResultViewProps> = ({
  packageData,
  onReset,
  modeUsed = 'byok',
  aiConfig
}) => {
  // Local editable copy of the generated profile
  const [profile, setProfile] = useState<LinkedInProfilePackage>({
    headline: packageData.headline || '',
    about: packageData.about || '',
    experience: Array.isArray(packageData.experience) ? [...packageData.experience] : [],
    education: Array.isArray(packageData.education) ? [...packageData.education] : [],
    skills: Array.isArray(packageData.skills) ? [...packageData.skills] : [],
    certifications: Array.isArray(packageData.certifications) ? [...packageData.certifications] : [],
    projects: Array.isArray(packageData.projects) ? [...packageData.projects] : [],
    achievements: Array.isArray(packageData.achievements) ? [...packageData.achievements] : [],
    suggestedKeywords: Array.isArray(packageData.suggestedKeywords) ? [...packageData.suggestedKeywords] : []
  });

  // Section edit toggles
  const [editingHeadline, setEditingHeadline] = useState(false);
  const [editingAbout, setEditingAbout] = useState(false);
  const [editingSkills, setEditingSkills] = useState(false);
  const [editingExperienceIndex, setEditingExperienceIndex] = useState<number | null>(null);
  const [editingProjectIndex, setEditingProjectIndex] = useState<number | null>(null);

  // Optimizer & Manual Import States
  const [importedProfile, setImportedProfile] = useState<LinkedInProfileData | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationError, setOptimizationError] = useState<string | null>(null);

  // Copy feedback state
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = async (text: string, sectionId: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // Fallback
    }
    setCopiedSection(sectionId);
    setTimeout(() => {
      setCopiedSection(null);
    }, 2000);
  };

  const handleExportMarkdown = () => {
    const md = formatProfileMarkdown(profile, optimizationResult?.summary);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'linkedin-profile-package.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const jsonStr = formatProfileJson(profile, optimizationResult?.summary);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'linkedin-profile-package.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    const html = generatePrintableHtml(profile, optimizationResult?.summary);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
    }
  };

  // Format full profile text for copying
  const generateFullProfileText = (): string => {
    let out = `LINKEDIN PROFILE PACKAGE\n=================================\n\n`;

    out += `HEADLINE:\n${profile.headline}\n\n`;
    out += `ABOUT / SUMMARY:\n${profile.about}\n\n`;

    out += `EXPERIENCE:\n`;
    profile.experience.forEach((exp, i) => {
      out += `\n${i + 1}. ${exp.role} at ${exp.company}`;
      if (exp.dates) out += ` (${exp.dates})`;
      if (exp.location) out += ` - ${exp.location}`;
      out += `\n`;
      exp.bullets.forEach((b) => {
        out += `   • ${b}\n`;
      });
    });

    if (profile.education.length > 0) {
      out += `\nEDUCATION:\n`;
      profile.education.forEach((edu) => {
        out += `• ${edu.degree} - ${edu.institution} (${edu.dates})\n`;
      });
    }

    if (profile.skills.length > 0) {
      out += `\nSKILLS:\n${profile.skills.join(', ')}\n`;
    }

    if (profile.certifications.length > 0) {
      out += `\nCERTIFICATIONS:\n${profile.certifications.map((c) => `• ${c}`).join('\n')}\n`;
    }

    if (profile.projects.length > 0) {
      out += `\nPROJECTS:\n`;
      profile.projects.forEach((p) => {
        out += `• ${p.name}: ${p.description}`;
        if (p.technologies && p.technologies.length > 0) {
          out += ` (Tech: ${p.technologies.join(', ')})`;
        }
        out += `\n`;
      });
    }

    if (profile.achievements.length > 0) {
      out += `\nACHIEVEMENTS:\n${profile.achievements.map((a) => `• ${a}`).join('\n')}\n`;
    }

    if (profile.suggestedKeywords.length > 0) {
      out += `\nSUGGESTED KEYWORDS:\n${profile.suggestedKeywords.join(', ')}\n`;
    }

    return out;
  };

  const handleRunOptimization = async (customProfile?: LinkedInProfileData) => {
    try {
      setIsOptimizing(true);
      setOptimizationError(null);

      const targetLinkedIn = customProfile || importedProfile || {
        headline: profile.headline,
        about: profile.about
      };

      const cvContext = generateFullProfileText();

      const res = await fetch('/api/linkedin/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvText: cvContext,
          linkedinProfile: targetLinkedIn,
          provider: aiConfig?.provider || 'gemini',
          apiKey: aiConfig?.apiKey,
          model: aiConfig?.model,
          mode: aiConfig?.mode || modeUsed
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Optimization failed');
      }

      setOptimizationResult(data.result || data.data);
    } catch (err: unknown) {
      setOptimizationError(err instanceof Error ? err.message : 'Failed to analyze profile gaps');
    } finally {
      setIsOptimizing(false);
    }
  };

  const formatExperienceText = (exp: GeneratedExperienceItem): string => {
    let text = `${exp.role} | ${exp.company}\n${exp.dates}`;
    if (exp.location) text += ` | ${exp.location}`;
    text += `\n\n`;
    text += exp.bullets.map((b) => `• ${b}`).join('\n');
    return text;
  };

  const handleUpdateExperienceBullets = (index: number, newBulletsText: string) => {
    const updated = [...profile.experience];
    updated[index] = {
      ...updated[index],
      bullets: newBulletsText
        .split('\n')
        .map((b) => b.replace(/^[•\-\*]\s*/, '').trim())
        .filter(Boolean)
    };
    setProfile({ ...profile, experience: updated });
  };

  const handleUpdateSkills = (skillsText: string) => {
    const newSkills = skillsText
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    setProfile({ ...profile, skills: newSkills });
  };

  const handleUpdateProject = (index: number, name: string, desc: string) => {
    const updated = [...profile.projects];
    updated[index] = {
      ...updated[index],
      name,
      description: desc
    };
    setProfile({ ...profile, projects: updated });
  };

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto 4rem', padding: '0 1rem' }}>
      {/* Top Header Card */}
      <div
        className="card-clean"
        style={{
          padding: '1.75rem 2rem',
          marginBottom: '2rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          backgroundColor: '#ffffff',
          borderLeft: '4px solid var(--brand-teal)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Sparkles size={20} style={{ color: 'var(--brand-teal)' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--brand-navy)', margin: 0 }}>
              LinkedIn Profile Preview
            </h3>
            <span className="badge badge-teal" style={{ fontSize: '0.75rem' }}>
              Generated
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Review, edit your sections, and copy directly into your LinkedIn profile.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
          <button
            type="button"
            data-testid="copy-full-profile-btn"
            onClick={() => copyToClipboard(generateFullProfileText(), 'full')}
            className="btn-teal"
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            {copiedSection === 'full' ? <Check size={15} /> : <Copy size={15} />}
            <span>{copiedSection === 'full' ? 'Copied Full Profile!' : 'Copy Full Profile'}</span>
          </button>

          <button
            type="button"
            data-testid="start-over-btn"
            onClick={onReset}
            className="btn-ghost"
            style={{ fontSize: '0.85rem', padding: '0.5rem 0.85rem' }}
            title="Start Over with a new CV"
          >
            <RotateCcw size={14} />
            <span>Start Over</span>
          </button>
        </div>
      </div>

      {/* LinkedIn OAuth Connection & Import Module */}
      <LinkedInConnection onProfileImported={(p) => setImportedProfile(p)} />

      {/* Export Your Profile Card (Step 15) */}
      <div
        data-testid="export-profile-card"
        className="card-clean"
        style={{
          padding: '1.25rem 1.75rem',
          marginBottom: '1.75rem',
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
            <FileText size={18} style={{ color: 'var(--brand-teal)' }} />
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--brand-navy)' }}>
              Export Your Profile
            </h4>
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Download your clean LinkedIn profile package in Markdown or JSON, or generate an A4 printable PDF.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            data-testid="export-markdown-btn"
            onClick={handleExportMarkdown}
            className="btn-ghost"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
            title="Download clean Markdown document (.md)"
          >
            <Download size={14} />
            <span>Markdown (.md)</span>
          </button>

          <button
            type="button"
            data-testid="export-json-btn"
            onClick={handleExportJson}
            className="btn-ghost"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
            title="Download structured JSON (.json)"
          >
            <Code size={14} />
            <span>JSON (.json)</span>
          </button>

          <button
            type="button"
            data-testid="export-pdf-btn"
            onClick={handleExportPdf}
            className="btn-ghost"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
            title="Open printable A4 layout to print or save as PDF"
          >
            <Printer size={14} />
            <span>Printable PDF</span>
          </button>
        </div>
      </div>

      {/* Manual Import & Gap Analysis Trigger Card */}
      {!optimizationResult && (
        <div
          data-testid="optimizer-trigger-card"
          className="card-clean"
          style={{
            padding: '1.5rem',
            marginBottom: '1.5rem',
            backgroundColor: '#f8fafc',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Sparkles size={18} style={{ color: 'var(--brand-teal)' }} />
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--brand-navy)' }}>
                  AI LinkedIn Optimizer & CV Gap Analysis
                </h4>
                {importedProfile && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '999px',
                      backgroundColor: '#e0f2fe',
                      color: '#0369a1'
                    }}
                  >
                    Current Profile Ready
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Compare verified facts from your CV against your current LinkedIn profile to uncover missing strengths and keywords.
              </p>
              {optimizationError && (
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.825rem', color: '#b91c1c' }}>
                  {optimizationError}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                data-testid="manual-import-trigger-btn"
                onClick={() => setIsManualModalOpen(true)}
                className="btn-ghost"
                style={{ fontSize: '0.825rem', padding: '0.5rem 0.9rem' }}
              >
                <span>{importedProfile ? 'Edit Current Profile' : 'Paste Current Profile'}</span>
              </button>

              <button
                type="button"
                data-testid="analyze-profile-gaps-btn"
                disabled={isOptimizing}
                onClick={() => handleRunOptimization()}
                className="btn-teal"
                style={{ fontSize: '0.85rem', padding: '0.5rem 1.15rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Sparkles size={15} />
                <span>{isOptimizing ? 'Analyzing Gaps...' : 'Analyze Profile Gaps'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Render Optimizer Dashboard when generated */}
      {optimizationResult && (
        <LinkedInOptimizerDashboard
          result={optimizationResult}
          profileData={profile}
          onClose={() => setOptimizationResult(null)}
        />
      )}

      {/* Manual LinkedIn Profile Import Modal */}
      <ManualLinkedInImportModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onImport={(p) => {
          setImportedProfile(p);
          handleRunOptimization(p);
        }}
        initialProfile={importedProfile || undefined}
      />

      {/* 1. LinkedIn Headline */}
      <div className="card-clean" style={{ padding: '1.5rem', marginBottom: '1.5rem', backgroundColor: '#ffffff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} style={{ color: 'var(--brand-teal)' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--brand-navy)', margin: 0 }}>
              LinkedIn Headline
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ({profile.headline.length}/220 chars)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              data-testid="edit-headline-btn"
              onClick={() => setEditingHeadline(!editingHeadline)}
              className="btn-ghost"
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.775rem' }}
            >
              <Edit3 size={13} />
              <span>{editingHeadline ? 'Done' : 'Edit'}</span>
            </button>

            <button
              type="button"
              data-testid="copy-headline-btn"
              onClick={() => copyToClipboard(profile.headline, 'headline')}
              className="btn-ghost"
              style={{
                padding: '0.25rem 0.65rem',
                fontSize: '0.775rem',
                color: copiedSection === 'headline' ? 'var(--brand-emerald)' : 'var(--brand-navy)'
              }}
            >
              {copiedSection === 'headline' ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedSection === 'headline' ? 'Copied!' : 'Copy'}</span>
            </button>

            <a
              href="https://www.linkedin.com/in/me/edit/intro/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
              style={{
                padding: '0.25rem 0.65rem',
                fontSize: '0.775rem',
                color: 'var(--brand-navy)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                textDecoration: 'none'
              }}
              title="Open LinkedIn Intro Editor in new tab"
            >
              <ExternalLink size={13} />
              <span>LinkedIn</span>
            </a>
          </div>
        </div>

        {editingHeadline ? (
          <textarea
            data-testid="headline-input"
            value={profile.headline}
            maxLength={220}
            onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
            style={{
              width: '100%',
              minHeight: '70px',
              padding: '0.65rem',
              fontSize: '0.95rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--brand-teal)',
              fontFamily: 'inherit',
              lineHeight: 1.5,
              outline: 'none'
            }}
          />
        ) : (
          <p
            data-testid="headline-display"
            style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: 'var(--brand-navy)',
              lineHeight: 1.5,
              margin: 0,
              backgroundColor: '#f8fafc',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            {profile.headline}
          </p>
        )}
      </div>

      {/* 2. About Section */}
      <div className="card-clean" style={{ padding: '1.5rem', marginBottom: '1.5rem', backgroundColor: '#ffffff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} style={{ color: 'var(--brand-teal)' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--brand-navy)', margin: 0 }}>
              About Summary
            </h4>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              data-testid="edit-about-btn"
              onClick={() => setEditingAbout(!editingAbout)}
              className="btn-ghost"
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.775rem' }}
            >
              <Edit3 size={13} />
              <span>{editingAbout ? 'Done' : 'Edit'}</span>
            </button>

            <button
              type="button"
              data-testid="copy-about-btn"
              onClick={() => copyToClipboard(profile.about, 'about')}
              className="btn-ghost"
              style={{
                padding: '0.25rem 0.65rem',
                fontSize: '0.775rem',
                color: copiedSection === 'about' ? 'var(--brand-emerald)' : 'var(--brand-navy)'
              }}
            >
              {copiedSection === 'about' ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedSection === 'about' ? 'Copied!' : 'Copy'}</span>
            </button>

            <a
              href="https://www.linkedin.com/in/me/edit/about/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
              style={{
                padding: '0.25rem 0.65rem',
                fontSize: '0.775rem',
                color: 'var(--brand-navy)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                textDecoration: 'none'
              }}
              title="Open LinkedIn About Editor in new tab"
            >
              <ExternalLink size={13} />
              <span>LinkedIn</span>
            </a>
          </div>
        </div>

        {editingAbout ? (
          <textarea
            data-testid="about-input"
            value={profile.about}
            onChange={(e) => setProfile({ ...profile, about: e.target.value })}
            style={{
              width: '100%',
              minHeight: '160px',
              padding: '0.75rem',
              fontSize: '0.9rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--brand-teal)',
              fontFamily: 'inherit',
              lineHeight: 1.6,
              outline: 'none'
            }}
          />
        ) : (
          <div
            data-testid="about-display"
            style={{
              fontSize: '0.925rem',
              color: 'var(--brand-navy)',
              lineHeight: 1.65,
              whiteSpace: 'pre-line',
              backgroundColor: '#f8fafc',
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            {profile.about}
          </div>
        )}
      </div>

      {/* 3. Experience */}
      <div className="card-clean" style={{ padding: '1.5rem', marginBottom: '1.5rem', backgroundColor: '#ffffff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Briefcase size={18} style={{ color: 'var(--brand-teal)' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--brand-navy)', margin: 0 }}>
              Experience ({profile.experience.length})
            </h4>
          </div>

          <button
            type="button"
            data-testid="copy-experience-btn"
            onClick={() =>
              copyToClipboard(
                profile.experience.map((e) => formatExperienceText(e)).join('\n\n---\n\n'),
                'experience'
              )
            }
            className="btn-ghost"
            style={{
              padding: '0.25rem 0.65rem',
              fontSize: '0.775rem',
              color: copiedSection === 'experience' ? 'var(--brand-emerald)' : 'var(--brand-navy)'
            }}
          >
            {copiedSection === 'experience' ? <Check size={13} /> : <Copy size={13} />}
            <span>{copiedSection === 'experience' ? 'Copied All Experience!' : 'Copy All'}</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {profile.experience.map((exp, idx) => (
            <div
              key={idx}
              style={{
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: '#ffffff'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div>
                  <h5 style={{ margin: '0 0 0.2rem', fontSize: '0.95rem', fontWeight: '700', color: 'var(--brand-navy)' }}>
                    {exp.role}
                  </h5>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--brand-teal)' }}>{exp.company}</span>
                    {exp.dates && <span> • {exp.dates}</span>}
                    {exp.location && <span> • {exp.location}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={() => setEditingExperienceIndex(editingExperienceIndex === idx ? null : idx)}
                    className="btn-ghost"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                  >
                    <Edit3 size={12} />
                    <span>{editingExperienceIndex === idx ? 'Done' : 'Edit'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(formatExperienceText(exp), `exp-${idx}`)}
                    className="btn-ghost"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                  >
                    {copiedSection === `exp-${idx}` ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedSection === `exp-${idx}` ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {editingExperienceIndex === idx ? (
                <div style={{ marginTop: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Edit bullet points (one per line):
                  </label>
                  <textarea
                    defaultValue={exp.bullets.join('\n')}
                    onBlur={(e) => handleUpdateExperienceBullets(idx, e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '100px',
                      padding: '0.5rem',
                      fontSize: '0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--brand-teal)',
                      fontFamily: 'inherit',
                      lineHeight: 1.5,
                      outline: 'none'
                    }}
                  />
                </div>
              ) : (
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--brand-navy)', lineHeight: 1.55 }}>
                  {exp.bullets.map((b, bIdx) => (
                    <li key={bIdx} style={{ marginBottom: '0.35rem' }}>
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Education */}
      {profile.education.length > 0 && (
        <div className="card-clean" style={{ padding: '1.5rem', marginBottom: '1.5rem', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <GraduationCap size={18} style={{ color: 'var(--brand-teal)' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--brand-navy)', margin: 0 }}>
                Education ({profile.education.length})
              </h4>
            </div>

            <button
              type="button"
              onClick={() =>
                copyToClipboard(
                  profile.education.map((e) => `${e.degree} - ${e.institution} (${e.dates})`).join('\n'),
                  'education'
                )
              }
              className="btn-ghost"
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.775rem' }}
            >
              {copiedSection === 'education' ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedSection === 'education' ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {profile.education.map((edu, idx) => (
              <div
                key={idx}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.875rem'
                }}
              >
                <span style={{ fontWeight: 700, color: 'var(--brand-navy)' }}>{edu.degree}</span>
                <span style={{ color: 'var(--text-secondary)' }}> — {edu.institution}</span>
                {edu.dates && <span style={{ color: 'var(--text-muted)' }}> ({edu.dates})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Skills */}
      <div className="card-clean" style={{ padding: '1.5rem', marginBottom: '1.5rem', backgroundColor: '#ffffff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Tag size={18} style={{ color: 'var(--brand-teal)' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--brand-navy)', margin: 0 }}>
              Skills ({profile.skills.length})
            </h4>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setEditingSkills(!editingSkills)}
              className="btn-ghost"
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.775rem' }}
            >
              <Edit3 size={13} />
              <span>{editingSkills ? 'Done' : 'Edit'}</span>
            </button>

            <button
              type="button"
              data-testid="copy-skills-btn"
              onClick={() => copyToClipboard(profile.skills.join(', '), 'skills')}
              className="btn-ghost"
              style={{
                padding: '0.25rem 0.65rem',
                fontSize: '0.775rem',
                color: copiedSection === 'skills' ? 'var(--brand-emerald)' : 'var(--brand-navy)'
              }}
            >
              {copiedSection === 'skills' ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedSection === 'skills' ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {editingSkills ? (
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Edit skills (comma separated):
            </label>
            <textarea
              defaultValue={profile.skills.join(', ')}
              onBlur={(e) => handleUpdateSkills(e.target.value)}
              style={{
                width: '100%',
                minHeight: '70px',
                padding: '0.5rem',
                fontSize: '0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--brand-teal)',
                fontFamily: 'inherit',
                outline: 'none'
              }}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
            {profile.skills.map((skill, idx) => (
              <span
                key={idx}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--brand-teal-light)',
                  color: 'var(--brand-teal)',
                  fontWeight: 600,
                  fontSize: '0.8125rem'
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 6. Certifications */}
      {profile.certifications.length > 0 && (
        <div className="card-clean" style={{ padding: '1.5rem', marginBottom: '1.5rem', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={18} style={{ color: 'var(--brand-teal)' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--brand-navy)', margin: 0 }}>
                Certifications ({profile.certifications.length})
              </h4>
            </div>

            <button
              type="button"
              onClick={() => copyToClipboard(profile.certifications.join('\n'), 'certifications')}
              className="btn-ghost"
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.775rem' }}
            >
              {copiedSection === 'certifications' ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedSection === 'certifications' ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {profile.certifications.map((cert, idx) => (
              <div
                key={idx}
                style={{
                  padding: '0.65rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--brand-navy)'
                }}
              >
                • {cert}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Featured Projects */}
      {profile.projects.length > 0 && (
        <div className="card-clean" style={{ padding: '1.5rem', marginBottom: '1.5rem', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Code size={18} style={{ color: 'var(--brand-teal)' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--brand-navy)', margin: 0 }}>
                Projects ({profile.projects.length})
              </h4>
            </div>

            <button
              type="button"
              onClick={() =>
                copyToClipboard(
                  profile.projects.map((p) => `${p.name}: ${p.description}`).join('\n\n'),
                  'projects'
                )
              }
              className="btn-ghost"
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.775rem' }}
            >
              {copiedSection === 'projects' ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedSection === 'projects' ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {profile.projects.map((proj, idx) => (
              <div
                key={idx}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: '#ffffff'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--brand-navy)' }}>
                    {proj.name}
                  </h5>
                  <button
                    type="button"
                    onClick={() => setEditingProjectIndex(editingProjectIndex === idx ? null : idx)}
                    className="btn-ghost"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                  >
                    <Edit3 size={12} />
                    <span>{editingProjectIndex === idx ? 'Done' : 'Edit'}</span>
                  </button>
                </div>

                {editingProjectIndex === idx ? (
                  <div>
                    <input
                      type="text"
                      defaultValue={proj.name}
                      onBlur={(e) => handleUpdateProject(idx, e.target.value, proj.description)}
                      style={{
                        width: '100%',
                        padding: '0.4rem',
                        marginBottom: '0.4rem',
                        fontSize: '0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--brand-teal)'
                      }}
                    />
                    <textarea
                      defaultValue={proj.description}
                      onBlur={(e) => handleUpdateProject(idx, proj.name, e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: '60px',
                        padding: '0.4rem',
                        fontSize: '0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--brand-teal)',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                ) : (
                  <p style={{ margin: '0 0 0.35rem', fontSize: '0.85rem', color: 'var(--brand-navy)', lineHeight: 1.5 }}>
                    {proj.description}
                  </p>
                )}

                {proj.technologies && proj.technologies.length > 0 && (
                  <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                    Technologies: {proj.technologies.join(', ')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. Achievements */}
      {profile.achievements.length > 0 && (
        <div className="card-clean" style={{ padding: '1.5rem', marginBottom: '1.5rem', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trophy size={18} style={{ color: 'var(--brand-teal)' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--brand-navy)', margin: 0 }}>
                Achievements ({profile.achievements.length})
              </h4>
            </div>

            <button
              type="button"
              onClick={() => copyToClipboard(profile.achievements.join('\n'), 'achievements')}
              className="btn-ghost"
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.775rem' }}
            >
              {copiedSection === 'achievements' ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedSection === 'achievements' ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {profile.achievements.map((ach, idx) => (
              <div
                key={idx}
                style={{
                  padding: '0.65rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.85rem',
                  color: 'var(--brand-navy)'
                }}
              >
                🏆 {ach}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 9. Suggested Keywords */}
      {profile.suggestedKeywords.length > 0 && (
        <div className="card-clean" style={{ padding: '1.5rem', marginBottom: '1.5rem', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Tag size={18} style={{ color: 'var(--brand-teal)' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--brand-navy)', margin: 0 }}>
                Suggested Keywords ({profile.suggestedKeywords.length})
              </h4>
            </div>

            <button
              type="button"
              onClick={() => copyToClipboard(profile.suggestedKeywords.join(', '), 'keywords')}
              className="btn-ghost"
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.775rem' }}
            >
              {copiedSection === 'keywords' ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedSection === 'keywords' ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
            {profile.suggestedKeywords.map((kw, idx) => (
              <span
                key={idx}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#f1f5f9',
                  color: 'var(--brand-navy)',
                  fontWeight: 600,
                  fontSize: '0.8125rem'
                }}
              >
                #{kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Sticky Action Bar */}
      <div
        className="card-clean"
        style={{
          padding: '1.25rem 1.75rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.85rem',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
          <ShieldCheck size={16} style={{ color: 'var(--brand-teal)' }} />
          <span>Your CV is processed temporarily in memory and is not permanently stored by this application.</span>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="btn-ghost"
          style={{ fontSize: '0.85rem' }}
        >
          <RotateCcw size={14} />
          <span>Generate Another Profile</span>
        </button>
      </div>
    </div>
  );
};
