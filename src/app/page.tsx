'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';
import { CvUploadZone } from '@/components/CvUploadZone';
import { AiModeSelector } from '@/components/AiModeSelector';
import { AiSettingsModal } from '@/components/AiSettingsModal';
import { ProfileResultView } from '@/components/ProfileResultView';
import { PrivacyNotice } from '@/components/PrivacyNotice';
import {
  getStoredKeyForProvider,
  clearStoredKeyForProvider,
  getStoredModelsForProvider
} from '@/lib/ai/storage';
import { LinkedInProfilePackage, AIConfig, AIMode, AIProviderId } from '@/types';

export default function HomePage() {
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    mode: 'byok', // Preferred BYOK mode
    provider: 'gemini',
    model: '',
    apiKey: ''
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [generatedPackage, setGeneratedPackage] = useState<LinkedInProfilePackage | null>(null);
  const [modeUsed, setModeUsed] = useState<AIMode>('byok');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedProvider = (sessionStorage.getItem('cv2linkedin_ai_provider') as AIProviderId) || 'gemini';
        const savedKey = getStoredKeyForProvider(savedProvider) || (savedProvider === 'gemini' ? sessionStorage.getItem('cv2linkedin_byok_key') : '') || '';
        const models = getStoredModelsForProvider(savedProvider);
        let selectedModel = '';

        if (models.length > 0) {
          const rec = models.find((m: { recommended?: boolean }) => m.recommended) || models[0];
          selectedModel = rec?.id || '';
        } else if (savedProvider === 'gemini') {
          const cachedModelsStr = sessionStorage.getItem('cv2linkedin_discovered_models');
          if (cachedModelsStr) {
            const legacyModels = JSON.parse(cachedModelsStr);
            const rec = legacyModels.find((m: { recommended?: boolean }) => m.recommended) || legacyModels[0];
            selectedModel = rec?.id || '';
          }
        }

        setAiConfig(prev => ({
          ...prev,
          provider: savedProvider,
          model: selectedModel || prev.model,
          apiKey: savedKey || prev.apiKey
        }));
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      const handler = (e: Event) => {
        const customEv = e as CustomEvent<LinkedInProfilePackage>;
        if (customEv.detail) {
          setGeneratedPackage(customEv.detail);
          setModeUsed('byok');
        }
      };
      window.addEventListener('cv2linkedin:test-package', handler);
      return () => window.removeEventListener('cv2linkedin:test-package', handler);
    }
  }, []);

  const scrollToUpload = () => {
    const el = document.getElementById('upload-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleClearKey = () => {
    const currentProvider = aiConfig.provider || 'gemini';
    clearStoredKeyForProvider(currentProvider);
    if (currentProvider === 'gemini') {
      sessionStorage.removeItem('cv2linkedin_byok_key');
      sessionStorage.removeItem('cv2linkedin_discovered_models');
    }
    setAiConfig(prev => ({ ...prev, apiKey: '', model: '' }));
  };

  const handleProfileGenerated = (pkg: LinkedInProfilePackage, mode: AIMode) => {
    setGeneratedPackage(pkg);
    setModeUsed(mode);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setGeneratedPackage(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header onOpenSettings={() => setIsSettingsOpen(true)} aiConfig={aiConfig} />

      <AiSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={aiConfig}
        onChange={setAiConfig}
        onClearKey={handleClearKey}
      />

      <main style={{ flex: 1, paddingBottom: '5rem' }}>
        <div className="container">
          {!generatedPackage ? (
            <>
              <Hero onScrollToUpload={scrollToUpload} />

              <div style={{ marginBottom: '3.5rem' }}>
                <AiModeSelector config={aiConfig} onChange={setAiConfig} onClearKey={handleClearKey} />
                <CvUploadZone
                  aiConfig={aiConfig}
                  onProfileGenerated={handleProfileGenerated}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />
                <PrivacyNotice />
              </div>

              <div style={{ paddingTop: '2.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                <HowItWorks />
              </div>
            </>
          ) : (
            <div style={{ paddingTop: '3rem' }}>
              <ProfileResultView
                packageData={generatedPackage}
                onReset={handleReset}
                modeUsed={modeUsed}
                aiConfig={aiConfig}
              />
            </div>
          )}
        </div>
      </main>

      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        backgroundColor: '#ffffff',
        padding: '1.75rem 0',
        color: 'var(--text-muted)',
        fontSize: '0.85rem',
        textAlign: 'center'
      }}>
        <div className="container">
          <p>© {new Date().getFullYear()} CV2LinkedIn AI. Privacy-first, recruiter-optimized LinkedIn generation.</p>
        </div>
      </footer>
    </div>
  );
}
