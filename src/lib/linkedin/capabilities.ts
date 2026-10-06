/**
 * Server-Authoritative LinkedIn Capability Engine.
 *
 * Implements strict capability determination and permission gates according to
 * official LinkedIn OpenID Connect and Partner Program documentation.
 *
 * Legal / Security Principle:
 * Self-serve LinkedIn developer apps DO NOT possess member profile write permissions.
 * The server must NEVER fabricate write access or expose raw credentials.
 */

export type CapabilityStatus = 'AVAILABLE' | 'APPROVAL_REQUIRED' | 'UNAVAILABLE';

export interface SectionCapability {
  read: boolean;
  write: boolean;
  status: CapabilityStatus;
  reason?: string;
}

export interface LinkedInCapabilities {
  status: CapabilityStatus;
  canReadBasicProfile: boolean;
  canReadDetailedProfile: boolean;
  canWriteHeadline: boolean;
  canWriteAbout: boolean;
  canWriteExperience: boolean;
  canWriteEducation: boolean;
  canWriteSkills: boolean;
  canWriteProjects: boolean;
  canWriteCertifications: boolean;
  canWriteLanguages: boolean;
  canWriteHonors: boolean;
  sections: Record<string, SectionCapability>;
  reason: string;
  officialDocUrl: string;
}

/**
 * Resolves the server-authoritative LinkedIn capabilities.
 *
 * In production or default self-serve mode, write operations are strictly false,
 * reflecting the reality that LinkedIn provides no public member profile write API.
 *
 * Mock write capabilities are only permissible in non-production environments when
 * explicitly enabled via LINKEDIN_WRITEBACK_MOCK=true for automated test assertions.
 */
export function getLinkedInCapabilities(options?: { allowMock?: boolean }): LinkedInCapabilities {
  const isProd = process.env.NODE_ENV === 'production';
  const isMockEnabled = !isProd && (process.env.LINKEDIN_WRITEBACK_MOCK === 'true' || Boolean(options?.allowMock && process.env.LINKEDIN_WRITEBACK_MOCK === 'true'));

  if (isMockEnabled) {
    return {
      status: 'AVAILABLE',
      canReadBasicProfile: true,
      canReadDetailedProfile: true,
      canWriteHeadline: true,
      canWriteAbout: true,
      canWriteExperience: true,
      canWriteEducation: true,
      canWriteSkills: true,
      canWriteProjects: false,
      canWriteCertifications: false,
      canWriteLanguages: false,
      canWriteHonors: false,
      sections: {
        headline: { read: true, write: true, status: 'AVAILABLE' },
        about: { read: true, write: true, status: 'AVAILABLE' },
        experience: { read: true, write: true, status: 'AVAILABLE' },
        education: { read: true, write: true, status: 'AVAILABLE' },
        skills: { read: true, write: true, status: 'AVAILABLE' },
        projects: { read: false, write: false, status: 'UNAVAILABLE', reason: 'No active LinkedIn API exists for member projects' },
        certifications: { read: false, write: false, status: 'UNAVAILABLE', reason: 'No public write API exists for certifications' },
        languages: { read: false, write: false, status: 'UNAVAILABLE', reason: 'No public write API exists for languages' },
        honors: { read: false, write: false, status: 'UNAVAILABLE', reason: 'No active LinkedIn API exists for honors' }
      },
      reason: 'Development mock write capability active for testing.',
      officialDocUrl: 'https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access'
    };
  }

  // Production / Official Self-Serve Mode (Strict Compliance)
  return {
    status: 'APPROVAL_REQUIRED',
    canReadBasicProfile: true,
    canReadDetailedProfile: false,
    canWriteHeadline: false,
    canWriteAbout: false,
    canWriteExperience: false,
    canWriteEducation: false,
    canWriteSkills: false,
    canWriteProjects: false,
    canWriteCertifications: false,
    canWriteLanguages: false,
    canWriteHonors: false,
    sections: {
      headline: {
        read: false,
        write: false,
        status: 'APPROVAL_REQUIRED',
        reason: 'Requires LinkedIn Partner Program approval'
      },
      about: {
        read: false,
        write: false,
        status: 'APPROVAL_REQUIRED',
        reason: 'Requires LinkedIn Partner Program approval'
      },
      experience: {
        read: false,
        write: false,
        status: 'APPROVAL_REQUIRED',
        reason: 'Requires Talent Solutions partner approval'
      },
      education: {
        read: false,
        write: false,
        status: 'APPROVAL_REQUIRED',
        reason: 'Requires Talent Solutions partner approval'
      },
      skills: {
        read: false,
        write: false,
        status: 'APPROVAL_REQUIRED',
        reason: 'Requires Talent Solutions partner approval'
      },
      projects: {
        read: false,
        write: false,
        status: 'UNAVAILABLE',
        reason: 'No active LinkedIn API exists for member projects'
      },
      certifications: {
        read: false,
        write: false,
        status: 'UNAVAILABLE',
        reason: 'No public write API exists for certifications'
      },
      languages: {
        read: false,
        write: false,
        status: 'UNAVAILABLE',
        reason: 'No public write API exists for languages'
      },
      honors: {
        read: false,
        write: false,
        status: 'UNAVAILABLE',
        reason: 'No active LinkedIn API exists for honors'
      }
    },
    reason: 'Current self-serve LinkedIn developer access does not provide personal member profile write APIs.',
    officialDocUrl: 'https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access'
  };
}
