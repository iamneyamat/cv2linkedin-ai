import React from 'react';
import { ShieldCheck, Sparkles, Key, Settings } from 'lucide-react';
import { AIConfig } from '@/types';

interface HeaderProps {
  onOpenSettings?: () => void;
  aiConfig?: AIConfig;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, aiConfig }) => {
  const hasUserKey = aiConfig?.mode === 'byok' && Boolean(aiConfig?.apiKey?.trim());

  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      backgroundColor: '#ffffff',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div className="container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '70px'
      }}>
        {/* Logo */}
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #0f172a 0%, #0d9488 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: '800',
            fontSize: '1rem',
            letterSpacing: '-0.02em',
            boxShadow: '0 2px 5px rgba(15, 23, 42, 0.15)'
          }}>
            C2L
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--brand-navy)' }}>
              CV2LinkedIn <span style={{ color: 'var(--brand-teal)' }}>AI</span>
            </span>
          </div>
        </a>

        {/* Right Badges & AI Settings Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="badge badge-teal hide-mobile">
            <Sparkles size={13} />
            <span>Free Tier Ready</span>
          </span>

          <div className="badge badge-slate hide-mobile" title="Your documents are never permanently stored">
            <ShieldCheck size={14} style={{ color: 'var(--brand-emerald)' }} />
            <span>Zero Storage Policy</span>
          </div>

          {onOpenSettings && (
            <button
              type="button"
              data-testid="header-ai-settings-btn"
              onClick={onOpenSettings}
              className="btn-ghost"
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: '0.8125rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: hasUserKey ? 'var(--brand-teal-light)' : '#ffffff',
                color: hasUserKey ? 'var(--brand-teal)' : 'var(--brand-navy)'
              }}
              title="Open AI Engine & API Key Settings"
            >
              <Settings size={14} />
              <span>AI Settings</span>
              {hasUserKey && (
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--brand-emerald)'
                }} title="BYOK Key Active" />
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
