'use client';

import React, { useState } from 'react';
import { X, FileText, Check, Sparkles, HelpCircle } from 'lucide-react';
import { parsePastedLinkedInProfile } from '@/lib/optimization/engine';
import { LinkedInProfileData } from '@/lib/linkedin/types';

interface ManualLinkedInImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (profile: LinkedInProfileData) => void;
  initialProfile?: LinkedInProfileData;
}

export const ManualLinkedInImportModal: React.FC<ManualLinkedInImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  initialProfile
}) => {
  const [tab, setTab] = useState<'paste' | 'manual'>('paste');
  const [pastedText, setPastedText] = useState('');
  const [headline, setHeadline] = useState(initialProfile?.headline || '');
  const [about, setAbout] = useState(initialProfile?.about || '');
  const [skills, setSkills] = useState(initialProfile?.skills?.join(', ') || '');
  const [experienceText, setExperienceText] = useState(
    initialProfile?.experience?.map(e => `${e.role} at ${e.company}\n${e.bullets.join('\n')}`).join('\n\n') || ''
  );

  if (!isOpen) return null;

  const handleSavePasted = () => {
    if (!pastedText.trim()) return;
    const parsed = parsePastedLinkedInProfile(pastedText);
    onImport(parsed);
    onClose();
  };

  const handleSaveManual = () => {
    const profile: LinkedInProfileData = {};
    if (headline.trim()) profile.headline = headline.trim();
    if (about.trim()) profile.about = about.trim();
    if (skills.trim()) {
      profile.skills = skills.split(/[,•|\n]+/).map(s => s.trim()).filter(Boolean);
    }
    if (experienceText.trim()) {
      profile.experience = [
        {
          company: 'Current Organization',
          role: 'Current Role',
          dates: 'Present',
          bullets: experienceText.split('\n').map(b => b.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean)
        }
      ];
    }
    onImport(profile);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '1rem'
      }}
    >
      <div
        data-testid="manual-linkedin-import-modal"
        className="card-clean animate-fadeIn"
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(10, 102, 194, 0.1)',
                color: '#0a66c2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700'
              }}
            >
              in
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--brand-navy)' }}>
                Import Your Current LinkedIn Profile
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Compare your actual profile content against your uploaded CV
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost"
            style={{ padding: '0.4rem', borderRadius: '8px' }}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Informative Explanation Notice */}
        <div
          style={{
            margin: '1.25rem 1.5rem 0.5rem',
            padding: '0.85rem 1rem',
            backgroundColor: '#f8fafc',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            fontSize: '0.825rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            gap: '0.6rem',
            lineHeight: '1.45'
          }}
        >
          <HelpCircle size={16} style={{ color: 'var(--brand-teal)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            LinkedIn limits access to detailed profile information for many applications. You can paste your current profile here for a more complete AI comparison.
          </div>
        </div>

        {/* Tabs */}
        <div style={{ padding: '0.75rem 1.5rem 0', display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setTab('paste')}
            className={tab === 'paste' ? 'btn-teal' : 'btn-ghost'}
            style={{ fontSize: '0.825rem', padding: '0.45rem 0.85rem' }}
          >
            <FileText size={14} />
            <span>Paste Profile Text</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('manual')}
            className={tab === 'manual' ? 'btn-teal' : 'btn-ghost'}
            style={{ fontSize: '0.825rem', padding: '0.45rem 0.85rem' }}
          >
            <span>Enter Sections Manually</span>
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {tab === 'paste' ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--brand-navy)', marginBottom: '0.35rem' }}>
                Copy and paste your profile sections below:
              </label>
              <textarea
                data-testid="pasted-profile-textarea"
                rows={9}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Example:&#10;Headline: Lead Software Engineer | React, Node.js&#10;&#10;About: Experienced engineer with 8 years building cloud platforms...&#10;&#10;Skills: TypeScript, PostgreSQL, AWS"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.875rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Tip: You can copy your headline, about summary, and key experience from your LinkedIn profile page.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: '600', color: 'var(--brand-navy)', marginBottom: '0.25rem' }}>
                  Headline
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Senior Software Engineer at Tech Co"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: '600', color: 'var(--brand-navy)', marginBottom: '0.25rem' }}>
                  About Summary
                </label>
                <textarea
                  rows={3}
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Your current LinkedIn About summary..."
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: '600', color: 'var(--brand-navy)', marginBottom: '0.25rem' }}>
                  Skills (comma separated)
                </label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. React, Node.js, Python, System Design"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: '600', color: 'var(--brand-navy)', marginBottom: '0.25rem' }}>
                  Key Experience Bullets
                </label>
                <textarea
                  rows={3}
                  value={experienceText}
                  onChange={(e) => setExperienceText(e.target.value)}
                  placeholder="Key positions or bullet points from your profile..."
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: '#fafbfc',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost"
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="analyze-pasted-btn"
            onClick={tab === 'paste' ? handleSavePasted : handleSaveManual}
            className="btn-teal"
            style={{ fontSize: '0.85rem', padding: '0.5rem 1.15rem' }}
          >
            <Sparkles size={14} />
            <span>Use Profile & Compare</span>
          </button>
        </div>
      </div>
    </div>
  );
};
