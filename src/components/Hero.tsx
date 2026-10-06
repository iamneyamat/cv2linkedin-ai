'use client';

import React from 'react';
import { ArrowDown, Sparkles } from 'lucide-react';

interface HeroProps {
  onScrollToUpload: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onScrollToUpload }) => {
  return (
    <section style={{
      textAlign: 'center',
      padding: '4.5rem 1rem 3rem',
      maxWidth: '820px',
      margin: '0 auto'
    }}>
      {/* Pill Badge */}
      <div style={{ display: 'inline-flex', marginBottom: '1.25rem' }}>
        <span className="badge badge-teal" style={{ padding: '0.4rem 0.9rem', fontSize: '0.825rem' }}>
          <Sparkles size={13} style={{ marginRight: '4px' }} />
          AI-Powered Profile Optimization
        </span>
      </div>

      {/* Main Heading */}
      <h1 className="hero-title" style={{
        fontSize: '3.125rem',
        fontWeight: '800',
        lineHeight: 1.15,
        letterSpacing: '-0.035em',
        color: 'var(--brand-navy)',
        marginBottom: '1.25rem'
      }}>
        Turn Your CV Into a{' '}
        <span style={{
          color: 'var(--brand-teal)',
          display: 'inline-block'
        }}>
          Professional LinkedIn Profile
        </span>
      </h1>

      {/* Subtitle */}
      <p style={{
        fontSize: '1.175rem',
        color: 'var(--text-secondary)',
        lineHeight: 1.65,
        maxWidth: '680px',
        margin: '0 auto 2.25rem'
      }}>
        Upload your CV and let AI transform your experience into a polished, recruiter-friendly LinkedIn profile.
      </p>

      {/* Primary CTA */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
        <button
          onClick={onScrollToUpload}
          className="btn-primary"
          style={{ fontSize: '1rem', padding: '0.95rem 2.2rem' }}
          type="button"
        >
          <span>Upload My CV</span>
          <ArrowDown size={16} />
        </button>
      </div>
    </section>
  );
};
