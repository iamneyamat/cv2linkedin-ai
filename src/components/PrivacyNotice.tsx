import React from 'react';
import { ShieldCheck, Lock, Cpu, Clock } from 'lucide-react';

export const PrivacyNotice: React.FC = () => {
  return (
    <div style={{
      maxWidth: '680px',
      margin: '2rem auto 0',
      padding: '1.25rem 1.5rem',
      backgroundColor: '#ffffff',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        marginBottom: '0.75rem',
        color: 'var(--brand-navy)'
      }}>
        <ShieldCheck size={18} style={{ color: 'var(--brand-teal)' }} />
        <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>
          Privacy & Security Architecture
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '0.75rem',
        fontSize: '0.8125rem',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          <Cpu size={14} style={{ color: 'var(--brand-teal)', flexShrink: 0, marginTop: '3px' }} />
          <span><strong>In-Memory CV Processing:</strong> Your CV is processed temporarily in memory and is not permanently stored by this application.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          <Clock size={14} style={{ color: 'var(--brand-teal)', flexShrink: 0, marginTop: '3px' }} />
          <span><strong>Session-Only BYOK:</strong> User API keys exist only in your browser tab runtime and are not stored in our database.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          <Lock size={14} style={{ color: 'var(--brand-teal)', flexShrink: 0, marginTop: '3px' }} />
          <span><strong>Direct Transmission:</strong> Your API key is used only for the AI request and is sent to the server only when executing your active request.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          <ShieldCheck size={14} style={{ color: 'var(--brand-teal)', flexShrink: 0, marginTop: '3px' }} />
          <span><strong>Zero Permanent Retention:</strong> CV2LinkedIn AI does not permanently store your CV, personal information, or API credentials.</span>
        </div>
      </div>
    </div>
  );
};
