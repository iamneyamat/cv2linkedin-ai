import React from 'react';
import { Upload, Cpu, CheckCircle } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Upload CV',
      desc: 'Drop your PDF or DOCX file (up to 5MB). Our parser instantly extracts your professional history.',
      icon: <Upload size={20} style={{ color: 'var(--brand-teal)' }} />
    },
    {
      num: '02',
      title: 'AI Builds Your Profile',
      desc: 'Smart algorithms convert bullet points into high-impact STAR achievements, headlines, and skills.',
      icon: <Cpu size={20} style={{ color: '#6366f1' }} />
    },
    {
      num: '03',
      title: 'Review & Improve',
      desc: 'Review formatted sections ready for LinkedIn, customize options, and copy with a single click.',
      icon: <CheckCircle size={20} style={{ color: 'var(--brand-emerald)' }} />
    }
  ];

  return (
    <section style={{ maxWidth: '960px', margin: '0 auto 4rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700', color: 'var(--brand-teal)' }}>
          Simple 3-Step Process
        </h2>
      </div>

      <div className="steps-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1.25rem'
      }}>
        {steps.map((step) => (
          <div
            key={step.num}
            className="card-clean"
            style={{
              padding: '1.75rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: '800',
                  color: 'var(--brand-teal)',
                  letterSpacing: '0.05em'
                }}>
                  {step.num}
                </span>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {step.icon}
                </div>
              </div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '700',
                color: 'var(--brand-navy)',
                marginBottom: '0.5rem'
              }}>
                {step.title}
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.55
              }}>
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
