'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  Download,
  ExternalLink,
  Shield,
  Info
} from 'lucide-react';
import { LinkedInConnectionStatus, LinkedInProfileData } from '@/lib/linkedin/types';

export type LinkedInUIState = 'LOADING' | 'NOT_CONNECTED' | 'CONNECTED' | 'ERROR';

interface LinkedInConnectionProps {
  onProfileImported?: (profile: LinkedInProfileData) => void;
}

export const LinkedInConnection: React.FC<LinkedInConnectionProps> = ({ onProfileImported }) => {
  const [uiState, setUiState] = useState<LinkedInUIState>('LOADING');
  const [status, setStatus] = useState<LinkedInConnectionStatus | null>(null);
  const [importedProfile, setImportedProfile] = useState<LinkedInProfileData | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check connection status from server on mount
  const checkStatus = useCallback(async () => {
    try {
      setUiState('LOADING');
      setErrorMessage(null);

      // Check query parameters for callback results
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const errorParam = urlParams.get('linkedin_error');
        const connectedParam = urlParams.get('linkedin');

        if (errorParam) {
          const readableErrors: Record<string, string> = {
            not_configured: 'LinkedIn OAuth credentials (LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET) are not configured on this server.',
            consent_denied: 'LinkedIn connection was cancelled or permission was denied.',
            invalid_state: 'Security validation failed (CSRF state mismatch). Please try connecting again.',
            missing_code: 'LinkedIn authorization did not return an authorization code.',
            exchange_failed: 'Failed to exchange authorization code with LinkedIn servers.'
          };
          setErrorMessage(readableErrors[errorParam] || `LinkedIn error: ${errorParam}`);
          setUiState('ERROR');

          // Clean query params from URL without reload
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }

        if (connectedParam === 'connected') {
          // Clean query param
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }

      const res = await fetch('/api/linkedin/status');
      if (!res.ok) {
        throw new Error(`Failed to check status (HTTP ${res.status})`);
      }
      const data: LinkedInConnectionStatus = await res.json();
      setStatus(data);

      if (data.connected) {
        setUiState('CONNECTED');
      } else {
        setUiState('NOT_CONNECTED');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to connect to LinkedIn status service');
      setUiState('ERROR');
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Initiate OAuth flow
  const handleConnect = () => {
    if (status && !status.configured) {
      setErrorMessage('LinkedIn OAuth is not yet configured. Please set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in your .env.local file.');
      setUiState('ERROR');
      return;
    }
    // Redirect browser to 3-legged authorization route
    window.location.href = '/api/linkedin/auth';
  };

  // Disconnect session
  const handleDisconnect = async () => {
    try {
      setUiState('LOADING');
      const res = await fetch('/api/linkedin/disconnect', { method: 'POST' });
      if (!res.ok) {
        throw new Error('Failed to disconnect');
      }
      setStatus(prev => (prev ? { ...prev, connected: false, member: undefined } : null));
      setImportedProfile(null);
      setUiState('NOT_CONNECTED');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to disconnect LinkedIn account');
      setUiState('ERROR');
    }
  };

  // Import profile data
  const handleImportProfile = async () => {
    try {
      setImportLoading(true);
      setErrorMessage(null);
      const res = await fetch('/api/linkedin/profile');
      if (!res.ok) {
        if (res.status === 401) {
          setUiState('NOT_CONNECTED');
          throw new Error('LinkedIn session expired. Please reconnect.');
        }
        throw new Error(`Profile import failed (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.success && data.profile) {
        setImportedProfile(data.profile);
        if (onProfileImported) {
          onProfileImported(data.profile);
        }
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to import LinkedIn profile data');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div
      data-testid="linkedin-connection-container"
      className="card-clean"
      style={{
        padding: '1.5rem',
        marginBottom: '1.5rem',
        backgroundColor: '#ffffff',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px'
      }}
    >
      {/* ---------------------------------------------------- */}
      {/* STATE 1: LOADING */}
      {/* ---------------------------------------------------- */}
      {uiState === 'LOADING' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: '#0a66c2' }} />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Checking LinkedIn connection...
          </span>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* STATE 2: ERROR */}
      {/* ---------------------------------------------------- */}
      {uiState === 'ERROR' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
            <AlertCircle size={20} style={{ color: '#e11d48', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', fontWeight: '600', color: '#9f1239' }}>
                LinkedIn Connection Notice
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#881337', lineHeight: '1.4' }}>
                {errorMessage || 'An error occurred while connecting to LinkedIn.'}
              </p>
            </div>
          </div>

          {status && !status.configured && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '0.85rem',
                marginBottom: '1rem',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem', fontWeight: '600', color: 'var(--brand-navy)' }}>
                <Info size={14} />
                <span>How to configure LinkedIn OAuth:</span>
              </div>
              <ol style={{ margin: '0.25rem 0 0 1.25rem', padding: 0, lineHeight: '1.5' }}>
                <li>Register an app at <strong>developer.linkedin.com</strong></li>
                <li>Add the <strong>Sign In with LinkedIn using OpenID Connect</strong> product</li>
                <li>Add redirect URI: <code>http://localhost:3005/api/linkedin/callback</code></li>
                <li>Set <code>LINKEDIN_CLIENT_ID</code> and <code>LINKEDIN_CLIENT_SECRET</code> in your <code>.env.local</code> file</li>
              </ol>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={checkStatus}
              className="btn-ghost"
              style={{ fontSize: '0.825rem', padding: '0.4rem 0.85rem' }}
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setUiState('NOT_CONNECTED');
              }}
              className="btn-ghost"
              style={{ fontSize: '0.825rem', padding: '0.4rem 0.85rem' }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* STATE 3: NOT CONNECTED */}
      {/* ---------------------------------------------------- */}
      {uiState === 'NOT_CONNECTED' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  backgroundColor: '#0a66c2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '0.85rem'
                }}
              >
                in
              </div>
              <h4 style={{ margin: 0, fontSize: '0.975rem', fontWeight: '700', color: 'var(--brand-navy)' }}>
                LinkedIn
              </h4>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Connect your LinkedIn profile to optimize it with your CV and AI.
            </p>
          </div>

          <button
            type="button"
            data-testid="connect-linkedin-btn"
            onClick={handleConnect}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#0a66c2',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.55rem 1.15rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#004182'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#0a66c2'; }}
          >
            <span>Connect LinkedIn</span>
            <ExternalLink size={14} />
          </button>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* STATE 4: CONNECTED */}
      {/* ---------------------------------------------------- */}
      {uiState === 'CONNECTED' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <CheckCircle2 size={20} style={{ color: '#057642' }} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.975rem', fontWeight: '700', color: '#057642' }}>
                    LinkedIn Connected
                  </h4>
                  {status?.member?.name && (
                    <span
                      style={{
                        fontSize: '0.775rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        backgroundColor: '#e8f5e9',
                        color: '#1b5e20',
                        fontWeight: '500'
                      }}
                    >
                      {status.member.name}
                    </span>
                  )}
                </div>
                <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  Your profile is connected via official OpenID Connect.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                data-testid="import-profile-btn"
                onClick={handleImportProfile}
                disabled={importLoading}
                className="btn-ghost"
                style={{
                  fontSize: '0.825rem',
                  padding: '0.45rem 0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: 'var(--brand-navy)'
                }}
              >
                {importLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                <span>{importLoading ? 'Importing...' : 'Import Profile'}</span>
              </button>

              <button
                type="button"
                data-testid="disconnect-linkedin-btn"
                onClick={handleDisconnect}
                className="btn-ghost"
                style={{
                  fontSize: '0.825rem',
                  padding: '0.45rem 0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: '#9f1239'
                }}
              >
                <LogOut size={13} />
                <span>Disconnect</span>
              </button>
            </div>
          </div>

          {/* Imported Data Preview / Status Info */}
          {importedProfile && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '0.85rem',
                marginTop: '0.75rem',
                fontSize: '0.825rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem', color: 'var(--brand-navy)', fontWeight: '600' }}>
                <Shield size={14} style={{ color: 'var(--brand-teal)' }} />
                <span>Profile Verified & Ready for Comparison</span>
              </div>
              {importedProfile.headline ? (
                <div style={{ marginTop: '0.35rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Current Headline: </span>
                  <span style={{ color: 'var(--brand-navy)' }}>{importedProfile.headline}</span>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)' }}>
                  Basic identity verified via OpenID Connect. Note: Reading detailed career history directly requires LinkedIn Partner Program approval. You can compare the optimized sections below with your profile.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
