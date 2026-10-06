'use client';

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { AIConfig, LinkedInProfilePackage, GenerateProfileResponse, AIMode } from '@/types';

interface StagedFile {
  file: File;
  name: string;
  sizeFormatted: string;
}

interface CvUploadZoneProps {
  aiConfig: AIConfig;
  onProfileGenerated: (pkg: LinkedInProfilePackage, modeUsed: AIMode) => void;
  onOpenSettings?: () => void;
}

export const CvUploadZone: React.FC<CvUploadZoneProps> = ({ aiConfig, onProfileGenerated, onOpenSettings }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<StagedFile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Generation / Processing State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
  const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];
  const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const validateAndProcessFile = (file: File) => {
    setErrorMessage(null);

    // 1. File Type Validation
    const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    const isValidType = ALLOWED_EXTENSIONS.includes(extension) || ALLOWED_MIME_TYPES.includes(file.type);

    if (!isValidType) {
      setErrorMessage(`Unsupported file format "${extension}". Please upload a PDF (.pdf) or Word document (.docx).`);
      return;
    }

    // 2. File Size Validation
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(`File exceeds 5MB limit (${formatFileSize(file.size)}). Please upload a smaller document.`);
      return;
    }

    setSelectedFile({
      file,
      name: file.name,
      sizeFormatted: formatFileSize(file.size)
    });
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndProcessFile(files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndProcessFile(files[0]);
    }
    if (e.target) e.target.value = '';
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setErrorMessage(null);
    setIsGenerating(false);
  };

  const handleGenerateProfile = async () => {
    if (!selectedFile) return;

    const providerNames: Record<string, string> = {
      gemini: 'Google Gemini',
      openai: 'OpenAI',
      deepseek: 'DeepSeek'
    };
    const currentProviderName = providerNames[aiConfig.provider || 'gemini'] || 'AI';

    // Check BYOK requirement before sending
    if (aiConfig.mode === 'byok' && !aiConfig.apiKey?.trim()) {
      setErrorMessage(`Please configure and test your ${currentProviderName} API key first.`);
      return;
    }

    if (!aiConfig.model?.trim()) {
      setErrorMessage(`Please select an available ${currentProviderName} model in AI Settings first.`);
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setGenerationStep('Reading CV...');

    const stepInterval1 = setTimeout(() => {
      setGenerationStep('Analyzing experience...');
    }, 1500);

    const stepInterval2 = setTimeout(() => {
      setGenerationStep('Building LinkedIn profile...');
    }, 3500);

    const stepInterval3 = setTimeout(() => {
      setGenerationStep('Finalizing profile...');
    }, 6500);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile.file);
      formData.append('mode', aiConfig.mode);
      formData.append('provider', aiConfig.provider || 'gemini');

      if (aiConfig.mode === 'byok' && aiConfig.apiKey) {
        formData.append('apiKey', aiConfig.apiKey.trim());
      }
      if (aiConfig.model) {
        formData.append('model', aiConfig.model);
      }

      const res = await fetch('/api/generate-profile', {
        method: 'POST',
        body: formData
      });

      const result: GenerateProfileResponse = await res.json();

      clearTimeout(stepInterval1);
      clearTimeout(stepInterval2);
      clearTimeout(stepInterval3);

      if (!res.ok || !result.success || !result.data) {
        if (result.errorCode === 'NO_API_KEY') {
          setErrorMessage(`Please configure and test your ${currentProviderName} API key first.`);
        } else if (result.errorCode === 'INVALID_API_KEY') {
          setErrorMessage(`Invalid ${currentProviderName} API Key. Please verify your credentials.`);
        } else if (result.errorCode === 'RATE_LIMIT') {
          setErrorMessage(`${currentProviderName} rate limit or quota reached. Please wait a few moments and try again.`);
        } else if (result.errorCode === 'INVALID_MODEL') {
          setErrorMessage(`The selected ${currentProviderName} model is currently unavailable for your API key. Please open AI Settings to refresh available models.`);
        } else if (result.errorCode === 'PARSER_ERROR') {
          setErrorMessage(result.error || 'No readable text was found in this CV. Please ensure the document contains selectable text and is not an image scan.');
        } else {
          setErrorMessage(result.error || 'Could not generate the profile. Please try again.');
        }
        setIsGenerating(false);
        return;
      }

      // Success
      setIsGenerating(false);
      onProfileGenerated(result.data, result.modeUsed || 'byok');
    } catch {
      clearTimeout(stepInterval1);
      clearTimeout(stepInterval2);
      clearTimeout(stepInterval3);
      setErrorMessage('Unable to connect to profile generation service. Please check your network connection and try again.');
      setIsGenerating(false);
    }
  };

  const handleKeyDownDropzone = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  return (
    <div id="upload-section" style={{ maxWidth: '680px', margin: '0 auto' }}>
      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        data-testid="cv-file-input"
      />

      {/* Error Banner */}
      {errorMessage && (
        <div
          data-testid="generation-error-banner"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            marginBottom: '1.25rem',
            color: '#991b1b',
            fontSize: '0.9rem'
          }}
        >
          <AlertCircle size={18} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            {aiConfig.mode === 'developer' || aiConfig.mode === 'default' ? (
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                  Trial AI is currently unavailable.
                </div>
                <div style={{ fontSize: '0.85rem', color: '#7f1d1d' }}>
                  {errorMessage}
                </div>
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    data-testid="error-retry-btn"
                    onClick={handleGenerateProfile}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      backgroundColor: '#ffffff',
                      border: '1px solid #fca5a5',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.3rem 0.75rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#991b1b',
                      cursor: 'pointer'
                    }}
                  >
                    <RefreshCw size={12} />
                    <span>Retry</span>
                  </button>

                  {onOpenSettings && (
                    <button
                      type="button"
                      data-testid="error-use-byok-btn"
                      onClick={onOpenSettings}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        backgroundColor: 'var(--brand-teal)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.3rem 0.75rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      <span>Use My Own API Key</span>
                      <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div>
                  <span style={{ fontWeight: 600 }}>Error: </span>
                  {errorMessage}
                </div>
                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    style={{
                      marginTop: '0.5rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      backgroundColor: '#ffffff',
                      border: '1px solid #fca5a5',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#991b1b',
                      cursor: 'pointer'
                    }}
                  >
                    <span>Open AI Settings</span>
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Dropzone (When No File Selected) */}
      {!selectedFile && !isGenerating && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload your CV document. Click or press enter to browse."
          onKeyDown={handleKeyDownDropzone}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="upload-box card-clean"
          style={{
            padding: '3.5rem 2rem',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: isDragging ? 'var(--brand-teal-light)' : '#ffffff',
            border: isDragging ? '2px dashed var(--brand-teal)' : '2px dashed var(--border-subtle)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: isDragging ? '#ccfbf1' : 'var(--bg-surface-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            color: isDragging ? 'var(--brand-teal)' : 'var(--brand-navy)'
          }}>
            <UploadCloud size={32} />
          </div>

          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            color: 'var(--brand-navy)',
            marginBottom: '0.4rem'
          }}>
            Drag & Drop your CV here
          </h3>

          <p style={{
            fontSize: '0.925rem',
            color: 'var(--text-secondary)',
            marginBottom: '1.5rem'
          }}>
            or click to browse from your device
          </p>

          <button
            type="button"
            className="btn-primary"
            style={{ pointerEvents: 'none' }}
          >
            Browse Document
          </button>

          <div style={{
            marginTop: '1.75rem',
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <span>Accepted: PDF, DOCX</span>
            <span>•</span>
            <span>Maximum size: 5MB</span>
          </div>
        </div>
      )}

      {/* Generating / Loading State */}
      {isGenerating && (
        <div className="card-clean" style={{ padding: '3rem 2rem', textAlign: 'center', backgroundColor: '#ffffff' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            backgroundColor: 'var(--brand-teal-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            color: 'var(--brand-teal)'
          }}>
            <RefreshCw size={26} style={{ animation: 'spin 1.2s linear infinite' }} />
          </div>

          <h4 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--brand-navy)', marginBottom: '0.4rem' }}>
            Transforming Your CV with AI...
          </h4>
          <p style={{ fontSize: '0.9rem', color: 'var(--brand-teal)', fontWeight: 600, marginBottom: '1.75rem' }}>
            {generationStep}
          </p>

          <div style={{
            width: '100%',
            maxWidth: '380px',
            height: '6px',
            backgroundColor: 'var(--bg-surface-subtle)',
            borderRadius: '9999px',
            overflow: 'hidden',
            margin: '0 auto 1rem'
          }}>
            <div style={{
              width: '70%',
              height: '100%',
              backgroundColor: 'var(--brand-teal)',
              borderRadius: '9999px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Processing in memory • Not permanently stored
          </span>
        </div>
      )}

      {/* File Uploaded & Ready for AI Generation */}
      {selectedFile && !isGenerating && (
        <div className="card-clean" style={{ padding: '2rem 1.75rem', backgroundColor: '#ffffff' }}>
          {/* File Info Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '8px',
                backgroundColor: 'var(--brand-teal-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-teal)'
              }}>
                <FileText size={24} />
              </div>
              <div>
                <h4 style={{
                  fontSize: '1rem',
                  fontWeight: '700',
                  color: 'var(--brand-navy)',
                  wordBreak: 'break-all'
                }}>
                  {selectedFile.name}
                </h4>
                <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                  {selectedFile.sizeFormatted} • Ready for AI transformation
                </span>
              </div>
            </div>

            <div className="badge badge-teal" style={{ flexShrink: 0 }}>
              <CheckCircle2 size={13} />
              <span>CV Ready</span>
            </div>
          </div>

          {/* Selected Model / Config Status */}
          <div
            data-testid="selected-model-badge"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem',
              backgroundColor: aiConfig.model ? 'var(--bg-surface-subtle)' : '#fffbeb',
              border: aiConfig.model ? '1px solid var(--border-subtle)' : '1px solid #fef3c7',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
              fontSize: '0.85rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu size={16} style={{ color: aiConfig.model ? 'var(--brand-teal)' : '#d97706', flexShrink: 0 }} />
              {aiConfig.model ? (
                <span style={{ color: 'var(--brand-navy)' }}>
                  AI Provider: <strong>{aiConfig.provider === 'openai' ? 'OpenAI' : aiConfig.provider === 'deepseek' ? 'DeepSeek' : 'Google Gemini'}</strong> • Model: <strong>{aiConfig.model}</strong> • Mode: <strong>{aiConfig.mode === 'byok' ? 'User BYOK' : 'Developer Key'}</strong>
                </span>
              ) : (
                <span style={{ color: '#92400e', fontWeight: 500 }}>
                  No {aiConfig.provider === 'openai' ? 'OpenAI' : aiConfig.provider === 'deepseek' ? 'DeepSeek' : 'Google Gemini'} model selected. Please configure and test your API key.
                </span>
              )}
            </div>

            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                style={{
                  background: 'none',
                  border: 'none',
                  color: aiConfig.model ? 'var(--brand-teal)' : '#b45309',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {aiConfig.model ? 'Change Model' : 'Open AI Settings'}
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="btn-ghost"
            >
              <X size={15} />
              <span>Change File</span>
            </button>

            <button
              type="button"
              data-testid="generate-profile-btn"
              onClick={handleGenerateProfile}
              className="btn-teal"
              style={{ fontSize: '0.95rem' }}
            >
              <Sparkles size={16} />
              <span>Generate My LinkedIn Profile</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
