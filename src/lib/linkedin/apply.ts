import { getLinkedInCapabilities, type LinkedInCapabilities } from './capabilities.ts';
import { recordAuditLog } from './audit.ts';
import type { LinkedInSessionData, LinkedInProfileData } from './types.ts';

export type SupportedProfileSection =
  | 'headline'
  | 'about'
  | 'experience'
  | 'education'
  | 'skills';

export interface ProfileChangeItem {
  recommendationId: string;
  section: SupportedProfileSection;
  oldValue: string;
  newValue: string;
  userApproved: boolean;
  evidenceStatus?: string;
}

export interface ApplyExecutionOptions {
  session: LinkedInSessionData | null;
  changes: ProfileChangeItem[];
  currentProfile?: LinkedInProfileData;
  capabilities?: LinkedInCapabilities;
}

export interface ChangeResult {
  recommendationId: string;
  section: string;
  status: 'updated' | 'failed' | 'rejected';
  errorCode?: string;
  message?: string;
}

export interface ApplyExecutionResult {
  success: boolean;
  results: ChangeResult[];
  errorCode?: string;
  message?: string;
  auditEntries?: string[];
}

const SUPPORTED_SECTIONS = new Set<string>([
  'headline',
  'about',
  'experience',
  'education',
  'skills'
]);

/**
 * Normalizes text for concurrency comparison.
 */
function normalizeComparableText(text?: string): string {
  if (!text) return '';
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Extracts current value of a section from LinkedInProfileData if present.
 */
function extractCurrentSectionValue(
  section: SupportedProfileSection,
  profile?: LinkedInProfileData
): string | null {
  if (!profile) return null;

  switch (section) {
    case 'headline':
      return profile.headline || null;
    case 'about':
      return profile.about || null;
    case 'skills':
      return profile.skills && profile.skills.length > 0 ? profile.skills.join(', ') : null;
    case 'experience':
    case 'education':
      // Detailed career sections might not be structured as a single string
      return null;
    default:
      return null;
  }
}

/**
 * Executes or validates an apply-changes operation.
 *
 * Enforces strict safety, explicit user approval, concurrency checks,
 * anti-hallucination verification, and capability gates.
 */
export async function executeApplyProfileChanges(
  options: ApplyExecutionOptions
): Promise<ApplyExecutionResult> {
  const { session, changes, currentProfile, capabilities } = options;

  // 1. Session verification
  if (!session || !session.accessToken) {
    return {
      success: false,
      results: [],
      errorCode: 'NOT_AUTHENTICATED',
      message: 'No active LinkedIn session found. Please connect your LinkedIn account first.'
    };
  }

  // Check expiration
  if (session.expiresAt && Date.now() > session.expiresAt) {
    return {
      success: false,
      results: [],
      errorCode: 'SESSION_EXPIRED',
      message: 'Your LinkedIn session has expired. Please reconnect.'
    };
  }

  // Validate changes array
  if (!Array.isArray(changes) || changes.length === 0) {
    return {
      success: false,
      results: [],
      errorCode: 'INVALID_REQUEST',
      message: 'No changes provided to apply.'
    };
  }

  const caps = capabilities || getLinkedInCapabilities();
  const results: ChangeResult[] = [];
  const auditEntries: string[] = [];

  for (const change of changes) {
    const sectionName = change.section;

    // 2. Validate section
    if (!SUPPORTED_SECTIONS.has(sectionName)) {
      results.push({
        recommendationId: change.recommendationId,
        section: sectionName,
        status: 'failed',
        errorCode: 'UNSUPPORTED_SECTION',
        message: `Section "${sectionName}" is not supported for LinkedIn profile updates.`
      });
      continue;
    }

    // 3. Explicit User Approval Check (Rule 6)
    if (!change.userApproved) {
      results.push({
        recommendationId: change.recommendationId,
        section: sectionName,
        status: 'rejected',
        errorCode: 'USER_APPROVAL_REQUIRED',
        message: 'Explicit user approval is required before applying profile changes.'
      });
      continue;
    }

    // 4. Anti-Hallucination & Evidence Gate (Rule 14)
    if (change.evidenceStatus === 'USER_VERIFICATION_REQUIRED') {
      results.push({
        recommendationId: change.recommendationId,
        section: sectionName,
        status: 'rejected',
        errorCode: 'USER_VERIFICATION_REQUIRED',
        message: 'This recommendation requires manual user verification before it can be applied.'
      });
      continue;
    }

    if (change.evidenceStatus === 'MISSING_EVIDENCE') {
      results.push({
        recommendationId: change.recommendationId,
        section: sectionName,
        status: 'rejected',
        errorCode: 'MISSING_EVIDENCE',
        message: 'This recommendation lacks supporting evidence from your CV.'
      });
      continue;
    }

    // 5. Capability Gate (Rule 4 & Rule 10)
    const sectionCap = caps.sections[sectionName];
    const canWrite = Boolean(sectionCap?.write && caps.status === 'AVAILABLE');

    if (!canWrite) {
      results.push({
        recommendationId: change.recommendationId,
        section: sectionName,
        status: 'failed',
        errorCode: 'LINKEDIN_WRITE_ACCESS_REQUIRED',
        message: 'Direct LinkedIn profile updates require additional API access.'
      });
      continue;
    }

    // 6. Optimistic Concurrency Check (Rule 7)
    // Only perform check if current LinkedIn value is actually accessible
    const currentVal = extractCurrentSectionValue(sectionName, currentProfile);
    if (currentVal !== null) {
      const normOld = normalizeComparableText(change.oldValue);
      const normCurrent = normalizeComparableText(currentVal);

      if (normOld && normCurrent && normOld !== normCurrent) {
        results.push({
          recommendationId: change.recommendationId,
          section: sectionName,
          status: 'rejected',
          errorCode: 'CONCURRENCY_CONFLICT',
          message: 'Your LinkedIn profile has changed since this recommendation was generated. Review the change again before applying.'
        });
        continue;
      }
    }

    // 7. Successful application (Mock / Future Partner API mutation)
    results.push({
      recommendationId: change.recommendationId,
      section: sectionName,
      status: 'updated',
      message: `Successfully applied change to ${sectionName}.`
    });

    const audit = recordAuditLog({
      section: sectionName,
      action: 'APPLY_PROFILE_CHANGE',
      status: 'SUCCESS',
      details: `Updated ${sectionName} from "${change.oldValue.slice(0, 40)}" to "${change.newValue.slice(0, 40)}"`
    });
    auditEntries.push(audit.id);
  }

  const allUpdated = results.length > 0 && results.every(r => r.status === 'updated');
  const firstError = results.find(r => r.status !== 'updated');

  return {
    success: allUpdated,
    results,
    errorCode: firstError?.errorCode,
    message: firstError?.message || (allUpdated ? 'All changes applied successfully.' : 'Some changes could not be applied.'),
    auditEntries
  };
}
