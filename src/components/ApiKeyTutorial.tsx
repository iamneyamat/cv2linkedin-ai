'use client';

import React, { useState } from 'react';
import { ExternalLink, ShieldAlert, Sparkles, Key, CheckCircle2 } from 'lucide-react';
import { AIProviderId } from '@/types';

interface ApiKeyTutorialProps {
  initialProvider?: AIProviderId;
}

interface ProviderTutorialInfo {
  name: string;
  url: string;
  createButtonText: string;
  keyPrefixHint: string;
  pricingNote: string;
  steps: string[];
}

const TUTORIAL_DATA: Record<AIProviderId, ProviderTutorialInfo> = {
  gemini: {
    name: 'Google Gemini',
    url: 'https://aistudio.google.com/app/apikey',
    createButtonText: 'Create API Key',
    keyPrefixHint: 'Starts with "AIzaSy..."',
    pricingNote: 'Free tier available (15 RPM) through Google AI Studio.',
    steps: [
      'Step 1: Open the official Google AI Studio API key page.',
      'Step 2: Create or sign in to your Google account.',
      'Step 3: Click "Create API key" and select your project.',
      'Step 4: Copy the generated API key.',
      'Step 5: Return here and paste it into the Gemini API Key field above.',
      'Step 6: Click "Test Connection" to verify your key.',
      'Step 7: Select one of the models discovered for your account.'
    ]
  },
  openai: {
    name: 'OpenAI',
    url: 'https://platform.openai.com/api-keys',
    createButtonText: 'Create new secret key',
    keyPrefixHint: 'Starts with "sk-..."',
    pricingNote: 'Pay-as-you-go credit required on your OpenAI account.',
    steps: [
      'Step 1: Open the official OpenAI Platform API keys page.',
      'Step 2: Create or sign in to your OpenAI account.',
      'Step 3: Click "+ Create new secret key".',
      'Step 4: Copy the generated secret key.',
      'Step 5: Return here and paste it into the OpenAI API Key field above.',
      'Step 6: Click "Test Connection" to verify your key.',
      'Step 7: Select one of the models discovered for your account.'
    ]
  },
  deepseek: {
    name: 'DeepSeek',
    url: 'https://platform.deepseek.com/api_keys',
    createButtonText: 'Create API Key',
    keyPrefixHint: 'Starts with "sk-..."',
    pricingNote: 'Ultra cost-effective balance via DeepSeek Platform.',
    steps: [
      'Step 1: Open the official DeepSeek Platform API keys page.',
      'Step 2: Create or sign in to your DeepSeek account.',
      'Step 3: Click "Create API key" and give it a label.',
      'Step 4: Copy the displayed secret key.',
      'Step 5: Return here and paste it into the DeepSeek API Key field above.',
      'Step 6: Click "Test Connection" to verify your key.',
      'Step 7: Select one of the models discovered for your account.'
    ]
  }
};

export const ApiKeyTutorial: React.FC<ApiKeyTutorialProps> = ({ initialProvider = 'gemini' }) => {
  const [activeTab, setActiveTab] = useState<AIProviderId>(initialProvider);
  const info = TUTORIAL_DATA[activeTab];

  return (
    <div style={{
      marginTop: '1.25rem',
      backgroundColor: '#f8fafc',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      padding: '1.25rem',
      fontSize: '0.85rem'
    }}>
      {/* Provider Selector Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        {(['gemini', 'openai', 'deepseek'] as AIProviderId[]).map((pId) => (
          <button
            key={pId}
            type="button"
            onClick={() => setActiveTab(pId)}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontWeight: 600,
              border: activeTab === pId ? '1px solid var(--brand-teal)' : '1px solid var(--border-subtle)',
              backgroundColor: activeTab === pId ? 'var(--brand-teal-light)' : '#ffffff',
              color: activeTab === pId ? 'var(--brand-teal)' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {TUTORIAL_DATA[pId].name}
          </button>
        ))}
      </div>

      {/* Security Warning */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.5rem',
        padding: '0.65rem 0.85rem',
        backgroundColor: '#fffbeb',
        border: '1px solid #fef3c7',
        borderRadius: 'var(--radius-sm)',
        color: '#92400e',
        fontSize: '0.785rem',
        marginBottom: '1rem',
        lineHeight: 1.45
      }}>
        <ShieldAlert size={16} style={{ flexShrink: 0, color: '#d97706', marginTop: '1px' }} />
        <div>
          <strong>Security Notice:</strong> Never share your API key with anyone. CV2LinkedIn AI uses your key only for your AI request and does not permanently store it.
        </div>
      </div>

      {/* Step by Step Guide */}
      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--brand-navy)', marginBottom: '0.65rem' }}>
        How to get your {info.name} API Key:
      </h4>

      <ol style={{ paddingLeft: '1.25rem', margin: '0 0 1rem', lineHeight: 1.6, color: 'var(--brand-navy)' }}>
        {info.steps.map((step, idx) => (
          <li key={idx} style={{ marginBottom: '0.35rem' }}>
            {step}
          </li>
        ))}
      </ol>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '0.75rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid var(--border-subtle)'
      }}>
        <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
          {info.keyPrefixHint} • {info.pricingNote}
        </span>

        <a
          href={info.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost"
          style={{
            fontSize: '0.8rem',
            padding: '0.35rem 0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--brand-teal)',
            borderColor: 'var(--brand-teal)'
          }}
        >
          <span>Open {info.name} Console</span>
          <ExternalLink size={13} />
        </a>
      </div>
    </div>
  );
};
