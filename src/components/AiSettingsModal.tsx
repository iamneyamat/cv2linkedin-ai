'use client';

import React, { useState, useEffect } from 'react';
import {
  Key,
  Server,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Sparkles,
  X,
  Cpu,
  RotateCw,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AIConfig, AIMode, AIProviderId, KeyTestState, DiscoveredModel } from '@/types';
import {
  getStoredKeyForProvider,
  setStoredKeyForProvider,
  clearStoredKeyForProvider,
  getStoredModelsForProvider,
  setStoredModelsForProvider
} from '@/lib/ai/storage';
import { ApiKeyTutorial } from './ApiKeyTutorial';

interface AiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AIConfig;
  onChange: (config: AIConfig) => void;
  onClearKey: () => void;
}

const PROVIDERS_INFO: Record<AIProviderId, { name: string; tag: string; placeholder: string; docUrl: string; desc: string }> = {
  gemini: {
    name: 'Google Gemini',
    tag: 'Free tier (15 RPM)',
    placeholder: 'AIzaSy...',
    docUrl: 'https://aistudio.google.com/app/apikey',
    desc: 'Fast multimodal & reasoning models from Google AI Studio.'
  },
  openai: {
    name: 'OpenAI',
    tag: 'Pay-as-you-go',
    placeholder: 'sk-...',
    docUrl: 'https://platform.openai.com/api-keys',
    desc: 'Industry-standard GPT & reasoning models from OpenAI.'
  },
  deepseek: {
    name: 'DeepSeek',
    tag: 'High efficiency',
    placeholder: 'sk-...',
    docUrl: 'https://platform.deepseek.com/api_keys',
    desc: 'Ultra cost-effective general chat & reasoning models.'
  }
};

export const AiSettingsModal: React.FC<AiSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  onClearKey
}) => {
  const [showKey, setShowKey] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [testState, setTestState] = useState<KeyTestState>({ status: 'idle' });
  const [availableModels, setAvailableModels] = useState<DiscoveredModel[]>([]);
  const [serverConfig, setServerConfig] = useState<{
    providers: Record<AIProviderId, { configured: boolean }>;
    defaultProvider: AIProviderId | null;
  } | null>(null);

  // Current active provider metadata
  const currentProviderId = config.provider || 'gemini';
  const providerMeta = PROVIDERS_INFO[currentProviderId];
  const isServerConfigured = Boolean(serverConfig?.providers?.[currentProviderId]?.configured);

  // Sync available models, server config, and provider key on open or provider change
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/ai/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.providers) {
          setServerConfig(data);
        }
      })
      .catch(() => {});


    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Load models and key for active provider
    const models = getStoredModelsForProvider(currentProviderId);
    setAvailableModels(models);

    const storedKey = getStoredKeyForProvider(currentProviderId);
    if (storedKey && storedKey !== config.apiKey) {
      onChange({ ...config, apiKey: storedKey });
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentProviderId, onClose]);

  if (!isOpen) return null;

  const handleModeChange = (mode: AIMode) => {
    setTestState({ status: 'idle' });
    onChange({ ...config, mode });
  };

  const handleProviderChange = (newProvider: AIProviderId) => {
    if (newProvider === config.provider) return;

    // 1. Save current provider's key if present
    if (config.apiKey) {
      setStoredKeyForProvider(config.provider, config.apiKey);
    }

    // 2. Load target provider's saved key and cached models
    const nextKey = getStoredKeyForProvider(newProvider);
    const nextModels = getStoredModelsForProvider(newProvider);

    setAvailableModels(nextModels);
    setTestState({ status: 'idle' });

    // 3. Reset incompatible model selection: choose recommended from new provider's cache if available
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
    setStoredKeyForProvider(currentProviderId, apiKey);
    setTestState({ status: 'idle' });
    onChange({ ...config, apiKey });
  };

  const handleModelChange = (model: string) => {
    setTestState({ status: 'idle' });
    onChange({ ...config, model });
  };

  const handleClear = () => {
    setAvailableModels([]);
    clearStoredKeyForProvider(currentProviderId);
    onClearKey();
    onChange({ ...config, apiKey: '', model: '' });
    setTestState({ status: 'idle' });
  };

  const handleTestKey = async () => {
    const isDeveloper = config.mode === 'developer' || config.mode === 'default';
    setTestState({
      status: 'testing',
      message: isDeveloper
        ? `Testing server connection to ${providerMeta.name}...`
        : `Connecting to ${providerMeta.name} and discovering available models...`
    });

    try {
      const res = await fetch('/api/ai/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: isDeveloper ? 'developer' : 'user',
          provider: currentProviderId,
          apiKey: isDeveloper ? undefined : config.apiKey?.trim()
        })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.valid) {
        const models: DiscoveredModel[] = data.models || [];
        setAvailableModels(models);
        setStoredModelsForProvider(currentProviderId, models);

        if (config.apiKey && !isDeveloper) {
          setStoredKeyForProvider(currentProviderId, config.apiKey.trim());
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
          message: data.message || `Connected to ${providerMeta.name}${sourceNotice}! Found ${models.length} model${models.length === 1 ? '' : 's'} available.`
        });
      } else {
        setTestState({
          status: 'invalid',
          message: data.error || `${providerMeta.name} API key validation failed. Please check your credentials.`
        });
      }
    } catch (networkErr: unknown) {
      const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
      setTestState({
        status: 'invalid',
        message: `Network error connecting to ${providerMeta.name}: ${msg}`
      });
    }
  };

  const handleRefreshModels = async () => {
    const isDeveloper = config.mode === 'developer' || config.mode === 'default';
    setTestState({ status: 'testing', message: `Refreshing models available for ${providerMeta.name}...` });

    try {
      const res = await fetch('/api/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: isDeveloper ? 'developer' : 'user',
          provider: currentProviderId,
          apiKey: isDeveloper ? undefined : config.apiKey?.trim()
        })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && Array.isArray(data.models)) {
        const models: DiscoveredModel[] = data.models;
        setAvailableModels(models);
        setStoredModelsForProvider(currentProviderId, models);

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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem'
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-settings-modal-title"
        data-testid="ai-settings-modal"
        className="card-clean"
        style={{
          width: '100%',
          maxWidth: '620px',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.18)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#fafbfc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: 'var(--brand-teal-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-teal)'
            }}>
              <Cpu size={18} />
            </div>
            <div>
              <h3 id="ai-settings-modal-title" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--brand-navy)', margin: 0 }}>
                AI Engine & Provider Settings
              </h3>
              <span style={{ fontSize: '0.785rem', color: 'var(--text-muted)' }}>
                Multi-provider BYOK architecture & session key manager
              </span>
            </div>
          </div>

          <button
            type="button"
            data-testid="close-ai-settings-btn"
            onClick={onClose}
            className="btn-ghost"
            style={{ padding: '0.4rem', borderRadius: '50%' }}
            aria-label="Close Modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: '75vh' }}>
          {/* 1. Mode Switch Tabs */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--brand-navy)', marginBottom: '0.4rem' }}>
              Execution Mode
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => handleModeChange('byok')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: config.mode === 'byok' ? '2px solid var(--brand-teal)' : '1px solid var(--border-subtle)',
                  backgroundColor: config.mode === 'byok' ? 'var(--brand-teal-light)' : '#ffffff',
                  color: config.mode === 'byok' ? 'var(--brand-teal)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <Key size={15} />
                <div>
                  <div style={{ fontWeight: 700 }}>User Key (BYOK)</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>Preferred • Free/low cost</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('developer')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: config.mode === 'developer' || config.mode === 'default' ? '2px solid var(--brand-teal)' : '1px solid var(--border-subtle)',
                  backgroundColor: config.mode === 'developer' || config.mode === 'default' ? 'var(--brand-teal-light)' : '#ffffff',
                  color: config.mode === 'developer' || config.mode === 'default' ? 'var(--brand-teal)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <Server size={15} />
                <div>
                  <div style={{ fontWeight: 700 }}>App / Developer Key</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>Optional server fallback</div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Provider Selection (3 Active Providers) */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--brand-navy)', marginBottom: '0.4rem' }}>
              Select AI Provider
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {(['gemini', 'openai', 'deepseek'] as AIProviderId[]).map((pId) => {
                const pInfo = PROVIDERS_INFO[pId];
                const isSelected = currentProviderId === pId;
                return (
                  <button
                    key={pId}
                    type="button"
                    data-testid={`provider-tab-${pId}`}
                    onClick={() => handleProviderChange(pId)}
                    style={{
                      padding: '0.65rem 0.5rem',
                      fontSize: '0.825rem',
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
                    <div style={{ fontSize: '0.685rem', color: isSelected ? 'var(--brand-teal)' : 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>
                      {pInfo.tag}
                    </div>
                  </button>
                );
              })}
            </div>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {providerMeta.desc}
            </p>
          </div>

          {/* 3. API Key Input (for BYOK mode) */}
          {config.mode === 'byok' ? (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--brand-navy)' }}>
                  Your {providerMeta.name} API Key
                </label>
                {config.apiKey && (
                  <button
                    type="button"
                    data-testid="modal-clear-key-btn"
                    onClick={handleClear}
                    style={{
                      border: 'none',
                      background: 'none',
                      fontSize: '0.75rem',
                      color: '#ef4444',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                      fontWeight: 600
                    }}
                  >
                    <Trash2 size={12} />
                    <span>Clear Key</span>
                  </button>
                )}
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  data-testid="modal-key-input"
                  placeholder={providerMeta.placeholder}
                  value={config.apiKey || ''}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 2.5rem 0.6rem 0.75rem',
                    fontSize: '0.85rem',
                    fontFamily: showKey ? 'monospace' : 'inherit',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    outline: 'none',
                    backgroundColor: '#ffffff'
                  }}
                />

                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)'
                  }}
                  title={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Tutorial Toggle */}
              <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setShowTutorial(!showTutorial)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.775rem',
                    color: 'var(--brand-teal)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontWeight: 600,
                    padding: 0
                  }}
                >
                  <HelpCircle size={13} />
                  <span>How to get an API key?</span>
                  {showTutorial ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                <a
                  href={providerMeta.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    textDecoration: 'underline'
                  }}
                >
                  <span>{providerMeta.name} Console</span>
                  <ExternalLink size={11} />
                </a>
              </div>

              {/* Collapsible Key Tutorial */}
              {showTutorial && (
                <ApiKeyTutorial initialProvider={currentProviderId} />
              )}
            </div>
          ) : (
            isServerConfigured ? (
              <div
                data-testid="modal-server-key-status-configured"
                style={{
                  marginBottom: '1.25rem',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--brand-emerald)' }} />
                  <span style={{ fontWeight: 700, color: '#166534' }}>✓ Developer / Demo Key Available</span>
                </div>
                <p style={{ margin: '0 0 0.25rem 0', color: '#15803d' }}>
                  Using the server-configured AI provider.
                </p>
                <p style={{ margin: 0, fontSize: '0.735rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Trial access may be limited by provider quota and availability.
                </p>
              </div>
            ) : (
              <div
                data-testid="modal-server-key-status-unconfigured"
                style={{
                  marginBottom: '1.25rem',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d97706' }} />
                  <span style={{ fontWeight: 600, color: '#92400e' }}>
                    Developer / Demo AI is not configured for this provider.
                  </span>
                </div>
                <p style={{ margin: '0 0 0.25rem 0', color: '#b45309' }}>
                  Please configure the provider API key in .env.local.
                </p>
                <p style={{ margin: 0, fontSize: '0.735rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Trial access may be limited by provider quota and availability.
                </p>
              </div>
            )
          )}

          {/* 4. Model Selection (Dynamic discovery per provider) */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--brand-navy)' }}>
                Models available for your {providerMeta.name} key
              </label>
              <button
                type="button"
                data-testid="modal-refresh-models-btn"
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
                title={`Fetch available models from ${providerMeta.name}`}
              >
                <RotateCw size={12} className={testState.status === 'testing' ? 'animate-spin' : ''} />
                <span>Refresh Models</span>
              </button>
            </div>

            <select
              data-testid="modal-model-select"
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
                    ? `Discovering available ${providerMeta.name} models...`
                    : `Connect your ${providerMeta.name} API key to discover available models`}
                </option>
              ) : (
                availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName} {m.recommended ? '(Recommended)' : ''} — {m.badge}
                  </option>
                ))
              )}
            </select>

            <p style={{ margin: '0.35rem 0 0', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              Availability depends on your {providerMeta.name} API key and account quota.
            </p>
          </div>

          {/* 5. Key Test Live Feedback Box */}
          {testState.status !== 'idle' && (
            <div style={{
              marginBottom: '1.25rem',
              padding: '0.75rem 1rem',
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
              alignItems: 'flex-start',
              gap: '0.65rem'
            }}>
              {testState.status === 'testing' && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--brand-teal)', marginTop: '2px' }} />}
              {testState.status === 'valid' && <CheckCircle2 size={16} style={{ color: 'var(--brand-emerald)', marginTop: '2px' }} />}
              {testState.status === 'invalid' && <AlertCircle size={16} style={{ color: '#ef4444', marginTop: '2px' }} />}
              <div style={{ fontSize: '0.825rem', lineHeight: 1.4, color: testState.status === 'invalid' ? '#b91c1c' : 'var(--brand-navy)' }}>
                {testState.message}
              </div>
            </div>
          )}

          {/* 6. Strict Privacy Notice Box */}
          <div style={{
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: '#f0fdfa',
            border: '1px solid #ccfbf1',
            fontSize: '0.785rem',
            color: '#115e59',
            lineHeight: 1.5
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, marginBottom: '0.2rem' }}>
              <ShieldCheck size={14} style={{ color: 'var(--brand-emerald)' }} />
              <span>Privacy & Ephemeral Storage Notice</span>
            </div>
            <p style={{ margin: 0 }}>
              Your API key is used only for the AI request and is not stored in our database. It is held in temporary browser session memory and sent directly to the server runtime only during an active request.
            </p>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#fafbfc'
        }}>
          <button
            type="button"
            data-testid="modal-test-key-btn"
            onClick={handleTestKey}
            disabled={testState.status === 'testing' || (config.mode === 'byok' && !config.apiKey?.trim())}
            className="btn-ghost"
            style={{
              padding: '0.55rem 1rem',
              fontSize: '0.85rem',
              opacity: (config.mode === 'byok' && !config.apiKey?.trim()) ? 0.6 : 1
            }}
          >
            {testState.status === 'testing' ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Testing Connection...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Test Connection</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="btn-primary"
            style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
          >
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
