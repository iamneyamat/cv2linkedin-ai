'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Edit3,
  X,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  ArrowRight,
  Lock,
  RotateCcw
} from 'lucide-react';
import {
  OptimizationResult,
  SectionRecommendation,
  RecommendationPriority,
  EvidenceStatus
} from '@/lib/optimization/types';
import type { LinkedInCapabilities } from '@/lib/linkedin/capabilities';
import {
  CHECKLIST_SECTION_KEYS,
  initializeChecklistState,
  toggleChecklistItem,
  markSectionManuallyUpdated,
  getChecklistProgress,
  loadChecklistFromStorage,
  saveChecklistToStorage,
  clearChecklistFromStorage,
  type ChecklistState,
  type ChecklistSectionKey
} from '@/lib/checklist/checklist';
import type { LinkedInProfilePackage } from '@/types';

interface LinkedInOptimizerDashboardProps {
  result: OptimizationResult;
  profileData?: LinkedInProfilePackage;
  onClose?: () => void;
  onUpdateRecommendation?: (id: string, newContent: string) => void;
}

export const LinkedInOptimizerDashboard: React.FC<LinkedInOptimizerDashboardProps> = ({
  result,
  profileData,
  onClose,
  onUpdateRecommendation
}) => {
  const [recommendations, setRecommendations] = useState<SectionRecommendation[]>(
    result.sectionRecommendations || []
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [actionNotice, setActionNotice] = useState<{ id: string; message: string; type: 'success' | 'warning' } | null>(null);
  const [capabilities, setCapabilities] = useState<LinkedInCapabilities | null>(null);
  const [previewingRec, setPreviewingRec] = useState<SectionRecommendation | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // LinkedIn Profile Update Checklist State (Step 15 - Session Storage Only)
  const [checklist, setChecklist] = useState<ChecklistState>(() => {
    const saved = loadChecklistFromStorage();
    if (saved) return saved;
    const dummyProfile: LinkedInProfilePackage = profileData || {
      headline: '',
      about: '',
      experience: [],
      education: [],
      skills: [],
      certifications: [],
      projects: [],
      achievements: [],
      suggestedKeywords: []
    };
    return initializeChecklistState(dummyProfile);
  });

  const handleMarkAppliedManually = (rec: SectionRecommendation) => {
    setRecommendations((prev) =>
      prev.map((r) =>
        r.id === rec.id ? { ...r, userStatus: 'applied_manually' } : r
      )
    );

    const sectionKey = rec.section as ChecklistSectionKey;
    if (CHECKLIST_SECTION_KEYS.includes(sectionKey)) {
      setChecklist((prev) => {
        const updated = markSectionManuallyUpdated(prev, sectionKey);
        saveChecklistToStorage(updated);
        return updated;
      });
    }

    setActionNotice({
      id: rec.id,
      message: 'Marked as manually updated.',
      type: 'success'
    });
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleToggleChecklist = (sectionKey: ChecklistSectionKey, isDone: boolean) => {
    setChecklist((prev) => {
      const updated = toggleChecklistItem(prev, sectionKey, isDone);
      saveChecklistToStorage(updated);
      return updated;
    });

    if (isDone) {
      setRecommendations((prev) =>
        prev.map((r) =>
          r.section === sectionKey ? { ...r, userStatus: 'applied_manually' } : r
        )
      );
    }
  };

  const handleResetChecklist = () => {
    clearChecklistFromStorage();
    const dummyProfile: LinkedInProfilePackage = profileData || {
      headline: '',
      about: '',
      experience: [],
      education: [],
      skills: [],
      certifications: [],
      projects: [],
      achievements: [],
      suggestedKeywords: []
    };
    setChecklist(initializeChecklistState(dummyProfile));
  };

  useEffect(() => {
    fetch('/api/linkedin/capabilities')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.capabilities) {
          setCapabilities(data.capabilities);
        }
      })
      .catch(() => {});
  }, []);

  // Copy to clipboard helper
  const handleCopy = async (id: string, text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2500);
        return true;
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      setActionNotice({
        id,
        message: 'Could not copy automatically. Please use Copy instead.',
        type: 'warning'
      });
      setTimeout(() => setActionNotice(null), 4000);
      return false;
    }
  };

  // Mandatory Adjustment 3: Copy & Open LinkedIn with resilient error handling
  const handleCopyAndOpen = async (rec: SectionRecommendation) => {
    const textToCopy = rec.userStatus === 'edited' ? rec.recommendedContent : rec.recommendedContent;
    const copySuccess = await handleCopy(rec.id, textToCopy);

    // Open verified deep link in new tab
    try {
      const openedWindow = window.open(rec.deepEditUrl, '_blank', 'noopener,noreferrer');
      if (!openedWindow) {
        // Popup was blocked or browser prevented opening
        setActionNotice({
          id: rec.id,
          message: 'LinkedIn could not be opened automatically. Use the copied content and open LinkedIn manually.',
          type: 'warning'
        });
      } else {
        setActionNotice({
          id: rec.id,
          message: 'Copied to clipboard! Switched to LinkedIn editor.',
          type: 'success'
        });
      }
    } catch {
      setActionNotice({
        id: rec.id,
        message: 'LinkedIn could not be opened automatically. Use the copied content and open LinkedIn manually.',
        type: 'warning'
      });
    }

    setTimeout(() => setActionNotice(null), 4500);
  };

  const handleStartEdit = (rec: SectionRecommendation) => {
    setEditingId(rec.id);
    setEditText(rec.recommendedContent);
  };

  const handleSaveEdit = (id: string) => {
    setRecommendations(prev =>
      prev.map(r => (r.id === id ? { ...r, recommendedContent: editText, userStatus: 'edited' } : r))
    );
    if (onUpdateRecommendation) {
      onUpdateRecommendation(id, editText);
    }
    setEditingId(null);
  };

  const handleAccept = (id: string) => {
    setRecommendations(prev =>
      prev.map(r => (r.id === id ? { ...r, userStatus: 'accepted' } : r))
    );
  };

  const handleDismiss = (id: string) => {
    setRecommendations(prev =>
      prev.map(r => (r.id === id ? { ...r, userStatus: 'dismissed' } : r))
    );
  };

  const handleConfirmApply = async (rec: SectionRecommendation) => {
    setIsApplying(true);
    setApplyError(null);

    try {
      const res = await fetch('/api/linkedin/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changes: [
            {
              recommendationId: rec.id,
              section: rec.section,
              oldValue: rec.currentContent || '',
              newValue: rec.recommendedContent,
              userApproved: true,
              evidenceStatus: rec.evidenceStatus
            }
          ]
        })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        handleAccept(rec.id);
        setActionNotice({
          id: rec.id,
          message: `Successfully applied ${rec.section} update directly to LinkedIn!`,
          type: 'success'
        });
        setPreviewingRec(null);
      } else {
        setApplyError(data.message || data.error || 'Failed to apply profile changes to LinkedIn.');
      }
    } catch (err: unknown) {
      setApplyError(err instanceof Error ? err.message : 'Network error attempting to apply LinkedIn change.');
    } finally {
      setIsApplying(false);
    }
  };

  const getPriorityBadge = (priority: RecommendationPriority) => {
    switch (priority) {
      case 'HIGH':
        return (
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <span>🔴 HIGH PRIORITY</span>
          </span>
        );
      case 'MEDIUM':
        return (
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              backgroundColor: '#ffedd5',
              color: '#9a3412',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <span>🟠 MEDIUM PRIORITY</span>
          </span>
        );
      case 'LOW':
        return (
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              backgroundColor: '#fef9c3',
              color: '#854d0e',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <span>🟡 LOW PRIORITY</span>
          </span>
        );
    }
  };

  const getEvidenceBadge = (status: EvidenceStatus) => {
    switch (status) {
      case 'SUPPORTED_BY_CV':
        return (
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: '700',
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              backgroundColor: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0'
            }}
          >
            SUPPORTED BY CV
          </span>
        );
      case 'SUPPORTED_BY_LINKEDIN':
        return (
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: '700',
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              backgroundColor: '#eff6ff',
              color: '#1e40af',
              border: '1px solid #bfdbfe'
            }}
          >
            SUPPORTED BY LINKEDIN
          </span>
        );
      case 'SUPPORTED_BY_BOTH':
        return (
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: '700',
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              backgroundColor: '#f5f3ff',
              color: '#5b21b6',
              border: '1px solid #ddd6fe'
            }}
          >
            SUPPORTED BY BOTH
          </span>
        );
      case 'USER_VERIFICATION_REQUIRED':
        return (
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: '700',
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              backgroundColor: '#fffbeb',
              color: '#92400e',
              border: '1px solid #fde68a'
            }}
          >
            USER VERIFICATION REQUIRED
          </span>
        );
      case 'MISSING_EVIDENCE':
      default:
        return (
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: '700',
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca'
            }}
          >
            MISSING EVIDENCE
          </span>
        );
    }
  };

  const potentialImprovement = Math.max(0, 100 - result.overallScore);

  return (
    <div
      data-testid="linkedin-optimizer-dashboard"
      className="card-clean animate-fadeIn"
      style={{
        padding: '2rem',
        marginBottom: '2rem',
        backgroundColor: '#ffffff',
        border: '1px solid var(--border-subtle)',
        borderRadius: '16px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)'
      }}
    >
      {/* ---------------------------------------------------- */}
      {/* 1. Dashboard Header & Explainable Score */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1.5rem',
          paddingBottom: '1.75rem',
          borderBottom: '1px solid var(--border-subtle)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <Sparkles size={22} style={{ color: 'var(--brand-teal)' }} />
            <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800', color: 'var(--brand-navy)' }}>
              LinkedIn Optimization & Gap Analysis
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Comparing verified facts in your CV against your current LinkedIn positioning.
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost"
            style={{ padding: '0.4rem 0.6rem', borderRadius: '8px' }}
            aria-label="Close dashboard"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. Scorecard & Metrics */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
          marginTop: '1.5rem',
          marginBottom: '1.75rem'
        }}
      >
        {/* Main Score Card */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: 'linear-gradient(135deg, #f0fdfa 0%, #f8fafc 100%)',
            background: '#f0fdfa',
            border: '1px solid rgba(13, 148, 136, 0.2)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--brand-teal)' }}>
                AI Optimization Score
              </span>
              {potentialImprovement > 0 && (
                <span
                  style={{
                    fontSize: '0.775rem',
                    fontWeight: '700',
                    color: '#059669',
                    backgroundColor: '#d1fae5',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.2rem'
                  }}
                >
                  <TrendingUp size={12} />
                  <span>+{potentialImprovement} pts potential</span>
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', margin: '0.25rem 0' }}>
              <span data-testid="optimization-score-value" style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--brand-navy)' }}>
                {result.overallScore}
              </span>
              <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                / 100
              </span>
            </div>
          </div>

          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: '1.4' }}>
            This score is an AI-based optimization estimate, not an official LinkedIn score.
          </p>
        </div>

        {/* Score Dimensions Breakdown */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: '#f8fafc',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px'
          }}
        >
          <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--brand-navy)', marginBottom: '0.65rem' }}>
            Section Strength Breakdown
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem 1rem', fontSize: '0.825rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Headline:</span>
              <strong style={{ color: 'var(--brand-navy)' }}>{result.scoreDimensions?.headline || 75}%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>About:</span>
              <strong style={{ color: 'var(--brand-navy)' }}>{result.scoreDimensions?.about || 80}%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Experience:</span>
              <strong style={{ color: 'var(--brand-navy)' }}>{result.scoreDimensions?.experience || 85}%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Skills:</span>
              <strong style={{ color: 'var(--brand-navy)' }}>{result.scoreDimensions?.skills || 90}%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Consistency:</span>
              <strong style={{ color: 'var(--brand-navy)' }}>{result.scoreDimensions?.consistency || 80}%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Readability:</span>
              <strong style={{ color: 'var(--brand-navy)' }}>{result.scoreDimensions?.readability || 85}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. Strengths & Gaps Summary */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem'
        }}
      >
        {result.strengths && result.strengths.length > 0 && (
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '1rem 1.25rem' }}>
            <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '700', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={16} />
              <span>Verified Strengths</span>
            </h5>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.825rem', color: '#14532d', lineHeight: '1.5' }}>
              {result.strengths.map((str, idx) => (
                <li key={idx}>{str}</li>
              ))}
            </ul>
          </div>
        )}

        {result.gaps && result.gaps.length > 0 && (
          <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '1rem 1.25rem' }}>
            <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '700', color: '#9a3412', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertTriangle size={16} />
              <span>Identified Profile Gaps</span>
            </h5>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.825rem', color: '#7c2d12', lineHeight: '1.5' }}>
              {result.gaps.map((gap, idx) => (
                <li key={idx}>{gap}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Factual Warnings (Anti-hallucination alerts) */}
      {result.factualWarnings && result.factualWarnings.length > 0 && (
        <div
          style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '10px',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.75rem',
            fontSize: '0.825rem',
            color: '#1e40af',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem'
          }}
        >
          <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#2563eb' }} />
          <div>
            <strong>Factual Verification Notice: </strong>
            {result.factualWarnings.join(' • ')}
          </div>
        </div>
      )}

      {/* Capability Status Banner (Step 14) */}
      <div
        data-testid="capability-status-banner"
        style={{
          backgroundColor: capabilities?.status === 'AVAILABLE' ? '#f0fdf4' : '#f8fafc',
          border: capabilities?.status === 'AVAILABLE' ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.5rem',
          fontSize: '0.825rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={16} style={{ color: capabilities?.status === 'AVAILABLE' ? '#166534' : '#64748b' }} />
          <div>
            <strong style={{ color: capabilities?.status === 'AVAILABLE' ? '#166534' : 'var(--brand-navy)' }}>
              {capabilities?.status === 'AVAILABLE'
                ? 'LinkedIn Direct Write Available (Development Mode)'
                : 'Direct LinkedIn updates require additional LinkedIn API access.'}
            </strong>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
              {capabilities?.reason || 'Current self-serve LinkedIn developer access does not provide personal member profile write APIs.'}
            </div>
          </div>
        </div>
        <a
          href="https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="learn-api-access-link"
          style={{
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#0a66c2',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            textDecoration: 'none'
          }}
        >
          <span>Learn About LinkedIn API Access</span>
          <ExternalLink size={12} />
        </a>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3.5. LinkedIn Profile Update Checklist (Step 15) */}
      {/* ---------------------------------------------------- */}
      <div
        data-testid="linkedin-checklist-card"
        style={{
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          backgroundColor: '#ffffff',
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} style={{ color: 'var(--brand-teal)' }} />
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: 'var(--brand-navy)' }}>
                LinkedIn Profile Update Checklist
              </h4>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Direct self-serve LinkedIn write-back is unavailable. Apply changes manually on LinkedIn, then track your progress below.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              data-testid="checklist-progress-text"
              style={{
                fontSize: '0.825rem',
                fontWeight: '700',
                color: getChecklistProgress(checklist).percentage === 100 ? '#166534' : 'var(--brand-navy)'
              }}
            >
              {getChecklistProgress(checklist).completed} / {getChecklistProgress(checklist).total} updated ({getChecklistProgress(checklist).percentage}%)
            </span>
            <button
              type="button"
              data-testid="checklist-reset-btn"
              onClick={handleResetChecklist}
              className="btn-ghost"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--text-muted)' }}
              title="Reset checklist progress"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', marginBottom: '1.25rem' }}>
          <div
            data-testid="checklist-progress-bar"
            style={{
              height: '100%',
              width: `${getChecklistProgress(checklist).percentage}%`,
              backgroundColor: getChecklistProgress(checklist).percentage === 100 ? '#22c55e' : 'var(--brand-teal)',
              transition: 'width 0.3s ease'
            }}
          />
        </div>

        {/* Checklist items grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0.75rem' }}>
          {CHECKLIST_SECTION_KEYS.map((key) => {
            const item = checklist.items[key];
            if (!item) return null;
            const isDone = item.isDone;

            return (
              <div
                key={key}
                data-testid={`checklist-item-${key}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: isDone ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                  backgroundColor: isDone ? '#f0fdf4' : '#fafbfc',
                  gap: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                  <input
                    type="checkbox"
                    id={`check-box-${key}`}
                    data-testid={`checklist-toggle-${key}`}
                    checked={isDone}
                    onChange={(e) => handleToggleChecklist(key, e.target.checked)}
                    style={{ cursor: 'pointer', accentColor: 'var(--brand-teal)' }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <label
                      htmlFor={`check-box-${key}`}
                      style={{
                        margin: 0,
                        fontSize: '0.825rem',
                        fontWeight: '600',
                        color: isDone ? '#166534' : 'var(--brand-navy)',
                        cursor: 'pointer',
                        display: 'block',
                        textDecoration: isDone ? 'line-through' : 'none'
                      }}
                    >
                      {item.title}
                    </label>
                    {isDone && (
                      <span
                        data-testid={`checklist-status-${key}`}
                        style={{ fontSize: '0.7rem', color: '#166534', fontWeight: '500' }}
                      >
                        Marked as manually updated.
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                  {item.content && (
                    <button
                      type="button"
                      data-testid={`checklist-copy-${key}`}
                      onClick={() => handleCopy(`check-${key}`, item.content)}
                      className="btn-ghost"
                      style={{ fontSize: '0.725rem', padding: '0.2rem 0.45rem' }}
                      title="Copy section content"
                    >
                      <Copy size={12} />
                    </button>
                  )}
                  <a
                    href={item.deepEditUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`checklist-copy-open-${key}`}
                    onClick={() => {
                      if (item.content) handleCopy(`check-${key}`, item.content);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.725rem',
                      fontWeight: '600',
                      borderRadius: '4px',
                      backgroundColor: '#0a66c2',
                      color: '#ffffff',
                      textDecoration: 'none'
                    }}
                    title={`Open ${item.deepEditUrl}`}
                  >
                    <span>Open</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4. Section Recommendations & Side-by-Side Review */}
      {/* ---------------------------------------------------- */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--brand-navy)' }}>
            Section-by-Section Optimizations ({recommendations.filter(r => r.userStatus !== 'dismissed').length})
          </h4>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Review, edit, and apply approved copy directly to LinkedIn
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {recommendations.map((rec) => {
            if (rec.userStatus === 'dismissed') return null;

            const isEditing = editingId === rec.id;
            const isAccepted = rec.userStatus === 'accepted';
            const isCopied = copiedId === rec.id;
            const currentNotice = actionNotice?.id === rec.id ? actionNotice : null;

            return (
              <div
                key={rec.id}
                data-testid={`rec-card-${rec.section}`}
                style={{
                  border: isAccepted ? '1px solid #86efac' : '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  backgroundColor: isAccepted ? '#f0fdf4' : '#ffffff',
                  padding: '1.25rem 1.5rem',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.06em', color: 'var(--brand-teal)' }}>
                      {rec.section}
                    </span>
                    <h5 style={{ margin: 0, fontSize: '0.975rem', fontWeight: '700', color: 'var(--brand-navy)' }}>
                      {rec.title}
                    </h5>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {getEvidenceBadge(rec.evidenceStatus)}
                    {getPriorityBadge(rec.priority)}
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: 'var(--text-muted)',
                        backgroundColor: '#f1f5f9',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px'
                      }}
                    >
                      {rec.confidence}% Confidence
                    </span>
                  </div>
                </div>

                {/* Evidence & Finding Callout */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem',
                    fontSize: '0.825rem',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.25rem' }}>
                    <strong style={{ color: 'var(--brand-navy)' }}>Why: </strong>
                    <span>{rec.reason}</span>
                  </div>
                  {rec.cvEvidence && rec.cvEvidence.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                      <strong>CV Evidence: </strong>
                      <span>{rec.cvEvidence.join(' • ')}</span>
                    </div>
                  )}
                </div>

                {/* Side-by-Side Content Display */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1rem'
                  }}
                >
                  {/* Current LinkedIn Content */}
                  <div
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      backgroundColor: '#fafbfc'
                    }}
                  >
                    <span style={{ display: 'block', fontSize: '0.725rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      Current LinkedIn Content
                    </span>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line', lineHeight: '1.45' }}>
                      {rec.currentContent || <em style={{ color: 'var(--text-muted)' }}>No current text provided for this section.</em>}
                    </p>
                  </div>

                  {/* AI Recommendation Content */}
                  <div
                    style={{
                      border: '1px solid rgba(13, 148, 136, 0.3)',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      backgroundColor: '#f0fdfa'
                    }}
                  >
                    <span style={{ display: 'block', fontSize: '0.725rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--brand-teal)', marginBottom: '0.35rem' }}>
                      Recommended Content
                    </span>

                    {isEditing ? (
                      <div>
                        <textarea
                          data-testid={`edit-textarea-${rec.section}`}
                          rows={4}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            fontSize: '0.875rem',
                            borderRadius: '6px',
                            border: '1px solid var(--brand-teal)',
                            fontFamily: 'inherit'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(rec.id)}
                            className="btn-teal"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                          >
                            Save Changes
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="btn-ghost"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--brand-navy)', fontWeight: '500', whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                        {rec.recommendedContent}
                      </p>
                    )}
                  </div>
                </div>

                {/* Inline Action Notice if any */}
                {currentNotice && (
                  <div
                    style={{
                      padding: '0.4rem 0.75rem',
                      marginBottom: '0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      backgroundColor: currentNotice.type === 'success' ? '#f0fdf4' : '#fffbeb',
                      color: currentNotice.type === 'success' ? '#166534' : '#b45309',
                      border: currentNotice.type === 'success' ? '1px solid #bbf7d0' : '1px solid #fde68a'
                    }}
                  >
                    {currentNotice.message}
                  </div>
                )}

                {/* Card Action Buttons (Mandatory Adjustment 3 & Step 13) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {!isAccepted ? (
                      <button
                        type="button"
                        data-testid={`accept-rec-${rec.section}`}
                        onClick={() => handleAccept(rec.id)}
                        className="btn-ghost"
                        style={{ fontSize: '0.775rem', padding: '0.35rem 0.65rem', color: 'var(--brand-emerald)' }}
                      >
                        <Check size={13} />
                        <span>Accept</span>
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.775rem', color: '#166534', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Check size={13} />
                        <span>Applied to Profile</span>
                      </span>
                    )}

                    <button
                      type="button"
                      data-testid={`edit-rec-${rec.section}`}
                      onClick={() => handleStartEdit(rec)}
                      className="btn-ghost"
                      style={{ fontSize: '0.775rem', padding: '0.35rem 0.65rem' }}
                    >
                      <Edit3 size={13} />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      data-testid={`dismiss-rec-${rec.section}`}
                      onClick={() => handleDismiss(rec.id)}
                      className="btn-ghost"
                      style={{ fontSize: '0.775rem', padding: '0.35rem 0.65rem', color: 'var(--text-muted)' }}
                    >
                      <span>Dismiss</span>
                    </button>

                    {rec.userStatus === 'applied_manually' ? (
                      <span
                        data-testid={`applied-status-${rec.section}`}
                        style={{
                          fontSize: '0.775rem',
                          color: '#166534',
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          backgroundColor: '#dcfce7',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px'
                        }}
                      >
                        <CheckCircle2 size={13} />
                        <span>Marked as manually updated.</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        data-testid={`mark-applied-${rec.section}`}
                        onClick={() => handleMarkAppliedManually(rec)}
                        className="btn-ghost"
                        style={{ fontSize: '0.775rem', padding: '0.35rem 0.65rem', color: 'var(--brand-teal)' }}
                        title="Confirm you have applied this recommendation manually on LinkedIn"
                      >
                        <Check size={13} />
                        <span>Mark as Manually Updated</span>
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Section Capability Notice or Approve & Apply */}
                    {capabilities?.status === 'AVAILABLE' && capabilities?.sections?.[rec.section]?.write ? (
                      <button
                        type="button"
                        data-testid={`approve-apply-${rec.section}`}
                        onClick={() => {
                          setApplyError(null);
                          setPreviewingRec(rec);
                        }}
                        className="btn-teal"
                        style={{
                          fontSize: '0.775rem',
                          padding: '0.35rem 0.85rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <Sparkles size={13} />
                        <span>Approve & Apply</span>
                      </button>
                    ) : (
                      <div
                        data-testid={`write-unsupported-notice-${rec.section}`}
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <Lock size={12} style={{ color: '#94a3b8' }} />
                        <span>
                          {capabilities?.sections?.[rec.section]?.status === 'UNAVAILABLE'
                            ? 'Direct LinkedIn update is not supported for this section.'
                            : 'Direct LinkedIn update is not available for this section.'}
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      data-testid={`copy-rec-${rec.section}`}
                      onClick={() => handleCopy(rec.id, rec.recommendedContent)}
                      className="btn-ghost"
                      style={{ fontSize: '0.775rem', padding: '0.35rem 0.75rem' }}
                    >
                      {isCopied ? <Check size={13} /> : <Copy size={13} />}
                      <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                    </button>

                    {/* Mandatory Adjustment 3: Copy & Open LinkedIn */}
                    <button
                      type="button"
                      data-testid={`copy-open-${rec.section}`}
                      onClick={() => handleCopyAndOpen(rec)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        backgroundColor: '#0a66c2',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.35rem 0.85rem',
                        fontSize: '0.775rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#004182'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#0a66c2'; }}
                      title={`Copies recommended text and opens ${rec.deepEditUrl}`}
                    >
                      <ExternalLink size={13} />
                      <span>Copy & Open LinkedIn</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current vs Proposed Diff Preview Modal (Step 14) */}
      {previewingRec && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="change-preview-modal"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: '1rem'
          }}
        >
          <div
            className="card-clean animate-fadeIn"
            style={{
              width: '100%',
              maxWidth: '640px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: 'var(--brand-navy)' }}>
                  Review & Approve Change — {previewingRec.section.toUpperCase()}
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Carefully review current content vs proposed AI optimization before applying.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewingRec(null)}
                className="btn-ghost"
                style={{ padding: '0.35rem' }}
                aria-label="Close Preview"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error in modal if any */}
            {applyError && (
              <div
                data-testid="apply-error-notice"
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  fontSize: '0.825rem',
                  color: '#991b1b'
                }}
              >
                <strong>Error: </strong>
                {applyError}
              </div>
            )}

            {/* Evidence Warning */}
            {(previewingRec.evidenceStatus === 'USER_VERIFICATION_REQUIRED' || previewingRec.evidenceStatus === 'MISSING_EVIDENCE') && (
              <div
                data-testid="verification-required-warning"
                style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  fontSize: '0.825rem',
                  color: '#92400e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Manual Verification Required: </strong>
                  This recommendation requires manual user verification before it can be applied to LinkedIn.
                </span>
              </div>
            )}

            {/* Diff Comparison */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.85rem 1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.725rem', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em' }}>
                  CURRENT ON LINKEDIN
                </span>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.875rem', color: '#334155', whiteSpace: 'pre-line' }}>
                  {previewingRec.currentContent || '(Currently empty or not imported)'}
                </p>
              </div>

              <div style={{ padding: '0.85rem 1rem', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <span style={{ fontSize: '0.725rem', fontWeight: '700', color: '#166534', letterSpacing: '0.05em' }}>
                  PROPOSED OPTIMIZATION
                </span>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.875rem', color: '#14532d', whiteSpace: 'pre-line', fontWeight: '600' }}>
                  {previewingRec.recommendedContent}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setPreviewingRec(null)}
                className="btn-ghost"
                style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-apply-change-btn"
                disabled={isApplying || previewingRec.evidenceStatus === 'USER_VERIFICATION_REQUIRED' || previewingRec.evidenceStatus === 'MISSING_EVIDENCE'}
                onClick={() => handleConfirmApply(previewingRec)}
                className="btn-teal"
                style={{
                  fontSize: '0.85rem',
                  padding: '0.5rem 1.25rem',
                  opacity: (previewingRec.evidenceStatus === 'USER_VERIFICATION_REQUIRED' || previewingRec.evidenceStatus === 'MISSING_EVIDENCE') ? 0.5 : 1
                }}
              >
                {isApplying ? 'Applying to LinkedIn...' : 'Apply This Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
