'use client';

import React, { useState, useEffect } from 'react';
import {
  Key,
  Server,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  RotateCw
} from 'lucide-react';
import { AIMode, AIConfig, AIProviderId, KeyTestState, DiscoveredModel } from '@/types';
import {
  getStoredKeyForProvider,
  setStoredKeyForProvider,
  clearStoredKeyForProvider,
  getStoredModelsForProvider,
  setStoredModelsForProvider
} from '@/lib/ai/storage';

interface AiModeSelectorProps {
  config: AIConfig;
  onChange: (config: AIConfig) => void;
  onClearKey?: () => void;
}

const PROVIDER_METADATA: Record<AIProviderId, { name: string; tag: string; placeholder: string; docUrl: string; desc: string }> = {
  gemini: {
    name: 'Google Gemini',
    tag: 'Free tier (15 RPM)',
    placeholder: 'AIzaSy...',
    docUrl: 'https://aistudio.google.com/app/apikey',
    desc: 'Google AI Studio'
  },
  openai: {
    name: 'OpenAI',
    tag: 'Pay-as-you-go',
    placeholder: 'sk-...',
    docUrl: 'https://platform.openai.com/api-keys',
    desc: 'OpenAI Platform'
  },
  deepseek: {
    name: 'DeepSeek',
    tag: 'Cost-effective',
    placeholder: 'sk-...',
    docUrl: 'https://platform.deepseek.com/api_keys',
    desc: 'DeepSeek Platform'
  }
};

export const AiModeSelector: React.FC<AiModeSelectorProps> = ({ config, onChange, onClearKey }) => {
  const [showKey, setShowKey] = useState(false);
  const [testState, setTestState] = useState<KeyTestState>({ status: 'idle' });
  const [availableModels, setAvailableModels] = useState<DiscoveredModel[]>([]);
  const [serverConfig, setServerConfig] = useState<{
    providers: Record<AIProviderId, { configured: boolean }>;
    defaultProvider: AIProviderId | null;
  } | null>(null);

  const currentProvider = config.provider || 'gemini';
  const providerInfo = PROVIDER_METADATA[currentProvider];
  const isServerConfigured = Boolean(serverConfig?.providers?.[currentProvider]?.configured);

  // Fetch safe server AI config once on mount
  useEffect(() => {
    fetch('/api/ai/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.providers) {
          setServerConfig(data);
        }
      })
      .catch(() => {});
  }, []);

  // Sync session storage on initial mount and when provider changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = (sessionStorage.getItem('cv2linkedin_ai_mode') as AIMode) || config.mode || 'byok';
      const savedProvider = (sessionStorage.getItem('cv2linkedin_ai_provider') as AIProviderId) || currentProvider;

      const storedKey = getStoredKeyForProvider(savedProvider);
      const cachedModels = getStoredModelsForProvider(savedProvider);
      setAvailableModels(cachedModels);

      let selectedModel = config.model;
      if (!selectedModel && cachedModels.length > 0) {
        const rec = cachedModels.find(m => m.recommended) || cachedModels[0];
        selectedModel = rec?.id || '';
      }

      onChange({
        ...config,
        mode: savedMode,
        provider: savedProvider,
        apiKey: storedKey || config.apiKey,
        model: selectedModel || config.model
      });
    }
  }, [currentProvider]);

  const handleModeChange = (mode: AIMode) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('cv2linkedin_ai_mode', mode);
    }
    setTestState({ status: 'idle' });
    onChange({ ...config, mode });
  };

  const handleProviderChange = (newProvider: AIProviderId) => {
    if (newProvider === config.provider) return;

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('cv2linkedin_ai_provider', newProvider);
      if (config.apiKey) {
        setStoredKeyForProvider(config.provider, config.apiKey);
      }
    }

    const nextKey = getStoredKeyForProvider(newProvider);
    const nextModels = getStoredModelsForProvider(newProvider);

    setAvailableModels(nextModels);
    setTestState({ status: 'idle' });

    // Incompatible model reset: auto-select recommended model from new provider if available
    const recommended = nextModels.find(m => m.recommended) || nextModels[0];
    const nextModel = recommended ? recommended.id : '';

    onChange({
      ...config,
      provider: newProvider,
      apiKey: nextKey,
      model: nextModel
    });
  };

  const handleKeyChange = (apiKey: string) => {
    setStoredKeyForProvider(currentProvider, apiKey);
    setTestState({ status: 'idle' });
    onChange({ ...config, apiKey });
  };

  const handleClearKey = () => {
    clearStoredKeyForProvider(currentProvider);
    setAvailableModels([]);
    setTestState({ status: 'idle' });
    if (onClearKey) {
      onClearKey();
    } else {
      onChange({ ...config, apiKey: '', model: '' });
    }
  };

  const handleModelChange = (model: string) => {
    setTestState({ status: 'idle' });
    onChange({ ...config, model });
  };

  const handleTestKey = async () => {
    const isDeveloper = config.mode === 'developer' || config.mode === 'default';
    setTestState({
      status: 'testing',
      message: isDeveloper
        ? `Testing server connection to ${providerInfo.name}...`
        : `Testing connection to ${providerInfo.name}...`
    });

    try {
      const res = await fetch('/api/ai/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: isDeveloper ? 'developer' : 'user',
          provider: currentProvider,
          apiKey: isDeveloper ? undefined : config.apiKey?.trim()
        })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.valid) {
        const models: DiscoveredModel[] = data.models || [];
        setAvailableModels(models);
        setStoredModelsForProvider(currentProvider, models);

        if (config.apiKey && !isDeveloper) {
          setStoredKeyForProvider(currentProvider, config.apiKey.trim());
        }

        const recommended = models.find(m => m.recommended) || models[0];
        const chosenModel = recommended ? recommended.id : (data.model || config.model);

        onChange({
          ...config,
          model: chosenModel
        });

        const sourceNotice = data.credentialSource === 'default' ? ' (Developer / Demo Key)' : '';
        setTestState({
          status: 'valid',
          message: data.message || `Connected to ${providerInfo.name}${sourceNotice}! Found ${models.length} model${models.length === 1 ? '' : 's'} available.`
        });
      } else {
        setTestState({
          status: 'invalid',
          message: data.error || `${providerInfo.name} API key validation failed. Please check your credentials.`
        });
      }
    } catch (networkErr: unknown) {
      const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
      setTestState({
        status: 'invalid',
        message: `Network error connecting to ${providerInfo.name}: ${msg}`
      });
    }
  };

  const handleRefreshModels = async () => {
    const isDeveloper = config.mode === 'developer' || config.mode === 'default';
    setTestState({ status: 'testing', message: `Refreshing ${providerInfo.name} models...` });

    try {
      const res = await fetch('/api/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: isDeveloper ? 'developer' : 'user',
          provider: currentProvider,
          apiKey: isDeveloper ? undefined : config.apiKey?.trim()
        })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && Array.isArray(data.models)) {
        const models: DiscoveredModel[] = data.models;
        setAvailableModels(models);
        setStoredModelsForProvider(currentProvider, models);

        const exists = models.some(m => m.id === config.model);
        if (!exists) {
          const recommended = models.find(m => m.recommended) || models[0];
          if (recommended) {
            onChange({ ...config, model: recommended.id });
          }
        }

        setTestState({
          status: 'valid',
          message: `Refreshed successfully! Found ${models.length} model${models.length === 1 ? '' : 's'}.`
        });
      } else {
        setTestState({
          status: 'invalid',
          message: data.error || `Could not load models. Try refreshing or check your API configuration.`
        });
      }
    } catch {
      setTestState({
        status: 'invalid',
        message: `Could not load models. Try refreshing or check your API configuration.`
      });
    }
  };

  return (
    <div className="card-clean" style={{
      maxWidth: '680px',
      margin: '0 auto 2rem',
      padding: '1.5rem',
      backgroundColor: '#ffffff'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.25rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={18} style={{ color: 'var(--brand-teal)' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--brand-navy)', margin: 0 }}>
            AI Engine Configuration
          </h3>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Session Memory Only • Zero Permanent Storage
        </div>
      </div>

      {/* Mode Selection */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button
            type="button"
            data-testid="mode-tab-byok"
            onClick={() => handleModeChange('byok')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: config.mode === 'byok' ? '2px solid var(--brand-teal)' : '1px solid var(--border-subtle)',
              backgroundColor: config.mode === 'byok' ? 'var(--brand-teal-light)' : '#ffffff',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease'
            }}
          >
            <Key size={18} style={{ color: config.mode === 'byok' ? 'var(--brand-teal)' : 'var(--text-secondary)' }} />
            <div>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: config.mode === 'byok' ? 'var(--brand-navy)' : 'var(--text-secondary)'
              }}>
                User API Key (BYOK)
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Your own key • Preferred & free/low cost
              </div>
            </div>
          </button>

          <button
            type="button"
            data-testid="mode-tab-developer"
            onClick={() => handleModeChange('developer')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: config.mode === 'developer' || config.mode === 'default' ? '2px solid var(--brand-teal)' : '1px solid var(--border-subtle)',
              backgroundColor: config.mode === 'developer' || config.mode === 'default' ? 'var(--brand-teal-light)' : '#ffffff',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease'
            }}
          >
            <Server size={18} style={{ color: config.mode === 'developer' || config.mode === 'default' ? 'var(--brand-teal)' : 'var(--text-secondary)' }} />
            <div>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: config.mode === 'developer' || config.mode === 'default' ? 'var(--brand-navy)' : 'var(--text-secondary)'
              }}>
                Developer / Demo Key
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Optional server fallback key
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Provider Selector (3 Options) */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--brand-navy)', marginBottom: '0.4rem' }}>
          Select AI Provider
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          {(['gemini', 'openai', 'deepseek'] as AIProviderId[]).map((pId) => {
            const pInfo = PROVIDER_METADATA[pId];
            const isSelected = currentProvider === pId;
            return (
              <button
                key={pId}
                type="button"
                data-testid={`inline-provider-${pId}`}
                onClick={() => handleProviderChange(pId)}
                style={{
                  padding: '0.55rem 0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: isSelected ? '2px solid var(--brand-teal)' : '1px solid var(--border-subtle)',
                  backgroundColor: isSelected ? 'var(--brand-teal-light)' : '#ffffff',
                  color: isSelected ? 'var(--brand-teal)' : 'var(--brand-navy)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <div>{pInfo.name}</div>
                <div style={{ fontSize: '0.675rem', color: isSelected ? 'var(--brand-teal)' : 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>
                  {pInfo.tag}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* API Key or Developer Notice */}
      {config.mode === 'developer' || config.mode === 'default' ? (
        isServerConfigured ? (
          <div
            data-testid="server-key-status-configured"
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem 1rem',
              marginBottom: '1rem',
              fontSize: '0.825rem',
              color: 'var(--text-secondary)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--brand-emerald)'
                }} />
                <span style={{ fontWeight: 700, color: '#166534' }}>✓ Developer / Demo Key Available</span>
              </div>
              <button
                type="button"
                data-testid="inline-test-server-key-btn"
                onClick={handleTestKey}
                disabled={testState.status === 'testing'}
                className="btn-ghost"
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
              >
                {testState.status === 'testing' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                <span>Test Server Key</span>
              </button>
            </div>
            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.785rem', color: '#15803d', lineHeight: 1.5 }}>
              Using the server-configured AI provider.
            </p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Trial access may be limited by provider quota and availability.
            </p>
          </div>
        ) : (
          <div
            data-testid="server-key-status-unconfigured"
            style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem 1rem',
              marginBottom: '1rem',
              fontSize: '0.825rem',
              color: 'var(--text-secondary)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#d97706'
                }} />
                <span style={{ fontWeight: 600, color: '#92400e' }}>
                  Developer / Demo AI is not configured for this provider.
                </span>
              </div>
              <button
                type="button"
                data-testid="inline-test-server-key-btn"
                onClick={handleTestKey}
                disabled={testState.status === 'testing'}
                className="btn-ghost"
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
              >
                {testState.status === 'testing' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                <span>Test Server Key</span>
              </button>
            </div>
            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.785rem', color: '#b45309', lineHeight: 1.5 }}>
              Please configure the provider API key in .env.local.
            </p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Trial access may be limited by provider quota and availability.
            </p>
          </div>
        )
      ) : (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.825rem',
              fontWeight: 600,
              color: 'var(--brand-navy)'
            }}>
              Your {providerInfo.name} API Key
            </label>

            {config.apiKey && (
              <button
                type="button"
                data-testid="inline-clear-key-btn"
                onClick={handleClearKey}
                style={{
                  border: 'none',
                  background: 'none',
                  fontSize: '0.75rem',
                  color: '#ef4444',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontWeight: 600
                }}
                title="Remove API key from current session"
              >
                <Trash2 size={12} />
                <span>Clear Key</span>
              </button>
            )}
          </div>

          <form onSubmit={(e) => e.preventDefault()} style={{ margin: 0, position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '0.45rem' }}>
            <input
              data-testid="inline-key-input"
              type={showKey ? 'text' : 'password'}
              placeholder={providerInfo.placeholder}
              value={config.apiKey || ''}
              onChange={(e) => handleKeyChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 6.5rem 0.55rem 0.75rem',
                fontSize: '0.875rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: '#ffffff',
                color: 'var(--brand-navy)',
                outline: 'none',
                fontFamily: 'monospace'
              }}
            />

            <div style={{
              position: 'absolute',
              right: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="btn-ghost"
                style={{ padding: '0.25rem 0.4rem', border: 'none' }}
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>

              <button
                type="button"
                data-testid="inline-test-key-btn"
                onClick={handleTestKey}
                disabled={testState.status === 'testing' || !config.apiKey?.trim()}
                className="btn-teal"
                style={{
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.75rem',
                  opacity: !config.apiKey?.trim() ? 0.6 : 1
                }}
              >
                {testState.status === 'testing' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                <span>Test</span>
              </button>
            </div>
          </form>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.4rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)'
          }}>
            <span>Saved in active browser tab only • Never stored in database</span>
            <a
              href={providerInfo.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--brand-teal)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
                textDecoration: 'underline'
              }}
            >
              <span>Get {providerInfo.name} Key</span>
              <ExternalLink size={10} />
            </a>
          </div>
        </div>
      )}

      {/* Model Selection Dropdown */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.825rem',
            fontWeight: 600,
            color: 'var(--brand-navy)'
          }}>
            Models available for {providerInfo.name}
          </label>

          <button
            type="button"
            data-testid="inline-refresh-models-btn"
            onClick={handleRefreshModels}
            disabled={testState.status === 'testing' || (config.mode === 'byok' && !config.apiKey?.trim())}
            style={{
              border: 'none',
              background: 'none',
              fontSize: '0.75rem',
              color: 'var(--brand-teal)',
              cursor: (config.mode === 'byok' && !config.apiKey?.trim()) ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontWeight: 600,
              opacity: (config.mode === 'byok' && !config.apiKey?.trim()) ? 0.5 : 1
            }}
            title={`Refresh available models from ${providerInfo.name}`}
          >
            <RotateCw size={12} className={testState.status === 'testing' ? 'animate-spin' : ''} />
            <span>Refresh Models</span>
          </button>
        </div>

        <select
          data-testid="inline-model-select"
          value={config.model || ''}
          onChange={(e) => handleModelChange(e.target.value)}
          disabled={availableModels.length === 0}
          style={{
            width: '100%',
            padding: '0.55rem 0.75rem',
            fontSize: '0.85rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: availableModels.length === 0 ? '#f8fafc' : '#ffffff',
            color: availableModels.length === 0 ? 'var(--text-muted)' : 'var(--brand-navy)',
            cursor: availableModels.length === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          {availableModels.length === 0 ? (
            <option value="">
              {testState.status === 'testing'
                ? `Discovering available ${providerInfo.name} models...`
                : (config.mode === 'developer' || config.mode === 'default')
                ? `Click "Test Server Key" or "Refresh Models" to discover models`
                : `Connect your ${providerInfo.name} API key to discover available models`}
            </option>
          ) : (
            availableModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName} {m.recommended ? '(Recommended)' : ''} — {m.badge}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Live Feedback Banner */}
      {testState.status !== 'idle' && (
        <div style={{
          padding: '0.65rem 0.85rem',
          borderRadius: 'var(--radius-sm)',
          backgroundColor:
            testState.status === 'valid'
              ? '#ecfdf5'
              : testState.status === 'invalid'
              ? '#fef2f2'
              : '#f8fafc',
          border:
            testState.status === 'valid'
              ? '1px solid #a7f3d0'
              : testState.status === 'invalid'
              ? '1px solid #fecaca'
              : '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.825rem',
          color: testState.status === 'invalid' ? '#b91c1c' : 'var(--brand-navy)',
          marginBottom: '0.75rem'
        }}>
          {testState.status === 'testing' && <Loader2 size={15} className="animate-spin" style={{ color: 'var(--brand-teal)' }} />}
          {testState.status === 'valid' && <CheckCircle2 size={15} style={{ color: 'var(--brand-emerald)' }} />}
          {testState.status === 'invalid' && <AlertCircle size={15} style={{ color: '#ef4444' }} />}
          <span>{testState.message}</span>
        </div>
      )}

      {/* Privacy Notice */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.55rem 0.85rem',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: '#f0fdfa',
        border: '1px solid #ccfbf1',
        fontSize: '0.785rem',
        color: '#115e59'
      }}>
        <ShieldCheck size={14} style={{ color: 'var(--brand-emerald)', flexShrink: 0 }} />
        <span>Your API key is used only for the AI request and is not stored in our database.</span>
      </div>
    </div>
  );
};
