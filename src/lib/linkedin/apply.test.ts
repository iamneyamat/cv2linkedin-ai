import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeApplyProfileChanges } from './apply.ts';
import { getLinkedInCapabilities } from './capabilities.ts';
import { recordAuditLog, getAuditLogs, clearAuditLogs } from './audit.ts';
import type { LinkedInSessionData, LinkedInProfileData } from './types.ts';
import type { ProfileChangeItem } from './apply.ts';

const mockValidSession: LinkedInSessionData = {
  accessToken: 'valid-mock-access-token-xyz',
  expiresAt: Date.now() + 3600000,
  member: {
    id: 'mem-123',
    name: 'Sarah Connor',
    email: 'sarah@example.com'
  }
};

const mockExpiredSession: LinkedInSessionData = {
  accessToken: 'expired-token',
  expiresAt: Date.now() - 1000,
  member: {
    id: 'mem-123',
    name: 'Sarah Connor'
  }
};

test('1. Apply request rejected when session is missing', async () => {
  const result = await executeApplyProfileChanges({
    session: null,
    changes: [
      {
        recommendationId: 'rec-1',
        section: 'headline',
        oldValue: 'Old Title',
        newValue: 'New Title',
        userApproved: true
      }
    ]
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'NOT_AUTHENTICATED');
});

test('2. Apply request rejected when session is expired', async () => {
  const result = await executeApplyProfileChanges({
    session: mockExpiredSession,
    changes: [
      {
        recommendationId: 'rec-1',
        section: 'headline',
        oldValue: 'Old Title',
        newValue: 'New Title',
        userApproved: true
      }
    ]
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'SESSION_EXPIRED');
});

test('3. Apply request rejected when write capability is false / APPROVAL_REQUIRED (Self-serve mode)', async () => {
  const defaultCaps = getLinkedInCapabilities(); // status: APPROVAL_REQUIRED, canWriteHeadline: false

  const result = await executeApplyProfileChanges({
    session: mockValidSession,
    capabilities: defaultCaps,
    changes: [
      {
        recommendationId: 'rec-1',
        section: 'headline',
        oldValue: 'Engineer',
        newValue: 'Senior Engineer',
        userApproved: true
      }
    ]
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'LINKEDIN_WRITE_ACCESS_REQUIRED');
  assert.match(result.message, /additional API access/i);
});

test('4. Apply request rejected when section is unsupported / UNAVAILABLE', async () => {
  const result = await executeApplyProfileChanges({
    session: mockValidSession,
    changes: [
      {
        recommendationId: 'rec-honors',
        section: 'honors' as any,
        oldValue: 'None',
        newValue: 'Award 2024',
        userApproved: true
      }
    ]
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'UNSUPPORTED_SECTION');
});

test('5. Explicit user approval is required; rejects if userApproved is false', async () => {
  const mockCaps = {
    ...getLinkedInCapabilities(),
    status: 'AVAILABLE' as const,
    canWriteHeadline: true,
    sections: {
      headline: { read: true, write: true, status: 'AVAILABLE' as const }
    }
  };

  const result = await executeApplyProfileChanges({
    session: mockValidSession,
    capabilities: mockCaps,
    changes: [
      {
        recommendationId: 'rec-1',
        section: 'headline',
        oldValue: 'Engineer',
        newValue: 'Principal Engineer',
        userApproved: false
      }
    ]
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'USER_APPROVAL_REQUIRED');
});

test('6. USER_VERIFICATION_REQUIRED evidence status blocks apply', async () => {
  const mockCaps = {
    ...getLinkedInCapabilities(),
    status: 'AVAILABLE' as const,
    canWriteHeadline: true,
    sections: {
      headline: { read: true, write: true, status: 'AVAILABLE' as const }
    }
  };

  const result = await executeApplyProfileChanges({
    session: mockValidSession,
    capabilities: mockCaps,
    changes: [
      {
        recommendationId: 'rec-1',
        section: 'headline',
        oldValue: 'Engineer',
        newValue: 'Principal Cloud Architect',
        userApproved: true,
        evidenceStatus: 'USER_VERIFICATION_REQUIRED'
      }
    ]
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'USER_VERIFICATION_REQUIRED');
  assert.match(result.message, /requires manual user verification/i);
});

test('7. MISSING_EVIDENCE blocks apply', async () => {
  const mockCaps = {
    ...getLinkedInCapabilities(),
    status: 'AVAILABLE' as const,
    canWriteHeadline: true,
    sections: {
      headline: { read: true, write: true, status: 'AVAILABLE' as const }
    }
  };

  const result = await executeApplyProfileChanges({
    session: mockValidSession,
    capabilities: mockCaps,
    changes: [
      {
        recommendationId: 'rec-1',
        section: 'headline',
        oldValue: 'Engineer',
        newValue: 'Principal Cloud Architect',
        userApproved: true,
        evidenceStatus: 'MISSING_EVIDENCE'
      }
    ]
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'MISSING_EVIDENCE');
});

test('8. Optimistic concurrency check detects when profile changed since recommendation generation', async () => {
  const mockCaps = {
    ...getLinkedInCapabilities(),
    status: 'AVAILABLE' as const,
    canWriteHeadline: true,
    sections: {
      headline: { read: true, write: true, status: 'AVAILABLE' as const }
    }
  };

  const currentLinkedInProfile: LinkedInProfileData = {
    headline: 'Engineering Manager at NewCorp' // Changed by user externally
  };

  const result = await executeApplyProfileChanges({
    session: mockValidSession,
    capabilities: mockCaps,
    currentProfile: currentLinkedInProfile,
    changes: [
      {
        recommendationId: 'rec-1',
        section: 'headline',
        oldValue: 'Senior Engineer at OldCorp', // Stale oldValue
        newValue: 'Principal Architect',
        userApproved: true,
        evidenceStatus: 'SUPPORTED_BY_CV'
      }
    ]
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'CONCURRENCY_CONFLICT');
  assert.match(result.message, /profile has changed since this recommendation was generated/i);
});

test('9. Successful mutation in development mock mode returns updated status per section', async () => {
  const mockCaps = {
    ...getLinkedInCapabilities(),
    status: 'AVAILABLE' as const,
    canWriteHeadline: true,
    sections: {
      headline: { read: true, write: true, status: 'AVAILABLE' as const }
    }
  };

  const currentLinkedInProfile: LinkedInProfileData = {
    headline: 'Senior Cloud Architect'
  };

  const result = await executeApplyProfileChanges({
    session: mockValidSession,
    capabilities: mockCaps,
    currentProfile: currentLinkedInProfile,
    changes: [
      {
        recommendationId: 'rec-1',
        section: 'headline',
        oldValue: 'Senior Cloud Architect',
        newValue: 'Principal Distributed Systems Architect | Cloud & Go',
        userApproved: true,
        evidenceStatus: 'SUPPORTED_BY_CV'
      }
    ]
  });

  assert.equal(result.success, true);
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].section, 'headline');
  assert.equal(result.results[0].status, 'updated');
});

test('10. Partial failure handling: reports success for valid sections and failure for failed sections', async () => {
  const mockCaps = {
    ...getLinkedInCapabilities(),
    status: 'AVAILABLE' as const,
    canWriteHeadline: true,
    canWriteAbout: false, // About is restricted
    sections: {
      headline: { read: true, write: true, status: 'AVAILABLE' as const },
      about: { read: false, write: false, status: 'APPROVAL_REQUIRED' as const }
    }
  };

  const result = await executeApplyProfileChanges({
    session: mockValidSession,
    capabilities: mockCaps,
    currentProfile: {
      headline: 'Old Headline'
    },
    changes: [
      {
        recommendationId: 'rec-1',
        section: 'headline',
        oldValue: 'Old Headline',
        newValue: 'New Headline',
        userApproved: true,
        evidenceStatus: 'SUPPORTED_BY_CV'
      },
      {
        recommendationId: 'rec-2',
        section: 'about',
        oldValue: 'Old Summary',
        newValue: 'New Summary',
        userApproved: true,
        evidenceStatus: 'SUPPORTED_BY_CV'
      }
    ]
  });

  assert.equal(result.success, false); // Not all succeeded
  assert.equal(result.results.length, 2);

  const headlineResult = result.results.find(r => r.section === 'headline');
  const aboutResult = result.results.find(r => r.section === 'about');

  assert.equal(headlineResult?.status, 'updated');
  assert.equal(aboutResult?.status, 'failed');
  assert.equal(aboutResult?.errorCode, 'LINKEDIN_WRITE_ACCESS_REQUIRED');
});

test('11. Failed-change retry: allows retrying only the failed change independently', async () => {
  const mockCaps = {
    ...getLinkedInCapabilities(),
    status: 'AVAILABLE' as const,
    canWriteAbout: true,
    sections: {
      about: { read: true, write: true, status: 'AVAILABLE' as const }
    }
  };

  const result = await executeApplyProfileChanges({
    session: mockValidSession,
    capabilities: mockCaps,
    currentProfile: {
      about: 'Old Summary'
    },
    changes: [
      {
        recommendationId: 'rec-2',
        section: 'about',
        oldValue: 'Old Summary',
        newValue: 'New Summary',
        userApproved: true,
        evidenceStatus: 'SUPPORTED_BY_CV'
      }
    ]
  });

  assert.equal(result.success, true);
  assert.equal(result.results[0].section, 'about');
  assert.equal(result.results[0].status, 'updated');
});

test('12. In-memory audit trail records action history without secrets', () => {
  clearAuditLogs();

  const entry = recordAuditLog({
    section: 'headline',
    action: 'APPLY_PROFILE_CHANGE',
    status: 'SUCCESS',
    details: 'Headline updated from Old to New'
  });

  assert.ok(entry.id);
  assert.ok(entry.timestamp);

  const logs = getAuditLogs();
  assert.equal(logs.length, 1);
  assert.equal(logs[0].section, 'headline');

  const serialized = JSON.stringify(logs);
  assert.equal(serialized.includes('access_token'), false);
  assert.equal(serialized.includes('client_secret'), false);
  assert.equal(serialized.includes('password'), false);
});

test('13. Zero OAuth token or authorization header leakage in result payload', async () => {
  const mockCaps = {
    ...getLinkedInCapabilities(),
    status: 'AVAILABLE' as const,
    canWriteHeadline: true,
    sections: {
      headline: { read: true, write: true, status: 'AVAILABLE' as const }
    }
  };

  const result = await executeApplyProfileChanges({
    session: mockValidSession,
    capabilities: mockCaps,
    changes: [
      {
        recommendationId: 'rec-1',
        section: 'headline',
        oldValue: 'Title',
        newValue: 'New Title',
        userApproved: true,
        evidenceStatus: 'SUPPORTED_BY_CV'
      }
    ]
  });

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('valid-mock-access-token-xyz'), false);
  assert.equal(serialized.includes('Bearer'), false);
  assert.equal(serialized.includes('client_secret'), false);
});
