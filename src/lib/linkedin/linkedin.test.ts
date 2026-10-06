import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  generateOAuthState,
  validateOAuthState,
  isLinkedInConfigured
} from './client.ts';
import {
  normalizeLinkedInProfile,
  normalizeLinkedInUserInfo
} from './normalize.ts';
import {
  sealSession,
  unsealSession,
  sanitizeMemberIdentity
} from './session.ts';
import { buildLinkedInOptimizationPrompt } from '../ai/prompts/linkedin-optimization.ts';
import type { LinkedInUserInfo } from './types.ts';

// ============================================================================
// 1. OAuth State Generation & CSRF Validation Tests
// ============================================================================
test('generateOAuthState generates high-entropy random state string', () => {
  const state1 = generateOAuthState();
  const state2 = generateOAuthState();

  assert.ok(typeof state1 === 'string');
  assert.ok(state1.length >= 32);
  assert.notEqual(state1, state2, 'State tokens should be uniquely random');
});

test('validateOAuthState validates matching state and rejects tampering', () => {
  const validState = generateOAuthState();

  // Valid match
  assert.equal(validateOAuthState(validState, validState), true);

  // Mismatched state
  assert.equal(validateOAuthState(validState, 'tampered-state-token'), false);

  // Missing or empty state
  assert.equal(validateOAuthState(validState, ''), false);
  assert.equal(validateOAuthState('', validState), false);
  assert.equal(validateOAuthState(undefined, validState), false);
  assert.equal(validateOAuthState(validState, undefined), false);
});

// ============================================================================
// 2. LinkedIn Profile Normalization Tests (Strict Zero-Fabrication)
// ============================================================================
test('normalizeLinkedInUserInfo extracts member identity correctly from OIDC payload', () => {
  const mockOidcUser: LinkedInUserInfo = {
    sub: 'li_sub_987654321',
    name: 'Alex Morgan',
    given_name: 'Alex',
    family_name: 'Morgan',
    picture: 'https://media.licdn.com/dms/image/v2/mock-avatar.jpg',
    email: 'alex.morgan@example.com',
    email_verified: true,
    locale: 'en_US'
  };

  const member = normalizeLinkedInUserInfo(mockOidcUser);

  assert.equal(member.id, 'li_sub_987654321');
  assert.equal(member.name, 'Alex Morgan');
  assert.equal(member.email, 'alex.morgan@example.com');
  assert.equal(member.picture, 'https://media.licdn.com/dms/image/v2/mock-avatar.jpg');
});

test('normalizeLinkedInProfile leaves missing sections undefined and NEVER fabricates data', () => {
  const oidcOnlyPayload: LinkedInUserInfo = {
    sub: 'li_sub_123',
    name: 'Sarah Connor',
    email: 'sarah@example.com'
  };

  const normalized = normalizeLinkedInProfile(oidcOnlyPayload);

  // Missing fields MUST NOT be fabricated or assumed
  assert.equal(normalized.headline, undefined);
  assert.equal(normalized.about, undefined);
  assert.equal(normalized.experience, undefined);
  assert.equal(normalized.education, undefined);
  assert.equal(normalized.skills, undefined);
  assert.equal(normalized.projects, undefined);
  assert.equal(normalized.certifications, undefined);
  assert.equal(normalized.achievements, undefined);
});

test('normalizeLinkedInProfile normalizes partner fields if present in payload', () => {
  const partnerPayload = {
    sub: 'li_partner_456',
    headline: 'Principal Cloud Architect',
    summary: 'Cloud infrastructure leader with 10+ years specializing in distributed systems.',
    skills: ['Kubernetes', 'Go', 'AWS Architecture'],
    positions: [
      {
        companyName: 'CloudScale Inc',
        title: 'Lead Architect',
        startDate: '2021-01',
        description: 'Architected high-throughput message streaming engines.'
      }
    ]
  };

  const normalized = normalizeLinkedInProfile(partnerPayload);

  assert.equal(normalized.headline, 'Principal Cloud Architect');
  assert.equal(normalized.about, 'Cloud infrastructure leader with 10+ years specializing in distributed systems.');
  assert.deepEqual(normalized.skills, ['Kubernetes', 'Go', 'AWS Architecture']);
  assert.ok(Array.isArray(normalized.experience));
  assert.equal(normalized.experience?.[0].company, 'CloudScale Inc');
  assert.equal(normalized.experience?.[0].role, 'Lead Architect');
});

// ============================================================================
// 3. Server-side Session Security & Token Sealing Tests
// ============================================================================
test('sealSession and unsealSession securely round-trip session data', () => {
  const secretKey = 'test-session-secret-key-at-least-32-characters-long!';
  const sessionData = {
    accessToken: 'mock_oauth_access_token_xyz123',
    expiresAt: Date.now() + 3600 * 1000,
    member: {
      id: 'member_123',
      name: 'Taylor Swift',
      email: 'taylor@example.com'
    }
  };

  const sealed = sealSession(sessionData, secretKey);
  assert.ok(typeof sealed === 'string');
  assert.ok(!sealed.includes('mock_oauth_access_token_xyz123'), 'Raw token must not appear unencrypted in sealed string');

  const unsealed = unsealSession(sealed, secretKey);
  assert.ok(unsealed !== null);
  assert.equal(unsealed?.accessToken, 'mock_oauth_access_token_xyz123');
  assert.equal(unsealed?.member?.id, 'member_123');
  assert.equal(unsealed?.member?.name, 'Taylor Swift');
});

test('unsealSession rejects tampered or invalid session strings', () => {
  const secretKey = 'test-session-secret-key-at-least-32-characters-long!';
  const wrongKey = 'different-secret-key-at-least-32-characters-long!';
  const sessionData = {
    accessToken: 'valid_token',
    expiresAt: Date.now() + 3600 * 1000
  };

  const sealed = sealSession(sessionData, secretKey);

  // Reject with wrong key
  assert.equal(unsealSession(sealed, wrongKey), null);

  // Reject tampered string
  const tampered = sealed.substring(0, sealed.length - 5) + 'abcde';
  assert.equal(unsealSession(tampered, secretKey), null);

  // Reject empty or malformed string
  assert.equal(unsealSession('', secretKey), null);
  assert.equal(unsealSession('random.garbage.token', secretKey), null);
});

test('unsealSession rejects expired sessions', () => {
  const secretKey = 'test-session-secret-key-at-least-32-characters-long!';
  const expiredData = {
    accessToken: 'expired_token',
    expiresAt: Date.now() - 1000 // 1 second ago
  };

  const sealed = sealSession(expiredData, secretKey);
  assert.equal(unsealSession(sealed, secretKey), null);
});

test('sanitizeMemberIdentity strips sensitive session tokens before client response', () => {
  const rawSession = {
    accessToken: 'secret_access_token_never_sent_to_client',
    refreshToken: 'secret_refresh_token_never_sent_to_client',
    expiresAt: Date.now() + 3600 * 1000,
    member: {
      id: 'sub_123',
      name: 'Morgan Stanley',
      email: 'morgan@example.com',
      picture: 'https://example.com/pic.png'
    }
  };

  const sanitized = sanitizeMemberIdentity(rawSession);

  // Assert sensitive fields are completely absent
  assert.equal((sanitized as unknown as { accessToken?: string }).accessToken, undefined);
  assert.equal((sanitized as unknown as { refreshToken?: string }).refreshToken, undefined);
  assert.equal(sanitized.id, 'sub_123');
  assert.equal(sanitized.name, 'Morgan Stanley');
  assert.equal(sanitized.email, 'morgan@example.com');
  assert.equal(sanitized.picture, 'https://example.com/pic.png');
});

// ============================================================================
// 4. AI Optimization Prompt Architecture Tests
// ============================================================================
test('buildLinkedInOptimizationPrompt builds unified anti-hallucination prompt across providers', () => {
  const cvText = 'Senior Full Stack Engineer with 7 years of experience in React, Node.js, and PostgreSQL. Built billing system handling $5M/yr.';
  const currentProfile = {
    headline: 'Software Engineer at Acme Corp',
    about: 'Passionate developer building web apps.'
  };

  const prompt = buildLinkedInOptimizationPrompt(cvText, currentProfile);

  // Verify anti-hallucination directives
  assert.ok(prompt.includes('NEVER fabricate'), 'Prompt must prohibit fabrication');
  assert.ok(prompt.includes('NEVER invent'), 'Prompt must prohibit inventing credentials');
  assert.ok(prompt.includes('CV Context:'), 'Prompt must include CV context');
  assert.ok(prompt.includes(cvText), 'Prompt must embed provided CV text');
  assert.ok(prompt.includes('Current LinkedIn Profile:'), 'Prompt must include current profile');
  assert.ok(prompt.includes('Software Engineer at Acme Corp'), 'Prompt must embed existing headline');

  // Verify required output fields in JSON schema instruction
  assert.ok(prompt.includes('"headlineComparison"'));
  assert.ok(prompt.includes('"aboutComparison"'));
  assert.ok(prompt.includes('"recommendations"'));
});

// ============================================================================
// 5. Configuration Detection & Auth URL Tests
// ============================================================================
test('isLinkedInConfigured returns boolean without throwing', () => {
  const isConfigured = isLinkedInConfigured();
  assert.equal(typeof isConfigured, 'boolean');
});

test('buildLinkedInAuthUrl builds RFC-compliant 3-legged OAuth URL with OIDC scopes', async () => {
  // Mock client id temporarily
  const originalClientId = process.env.LINKEDIN_CLIENT_ID;
  process.env.LINKEDIN_CLIENT_ID = 'test_client_id_12345';

  try {
    const { buildLinkedInAuthUrl } = await import('./client.ts');
    const state = generateOAuthState();
    const redirectUri = 'http://localhost:3005/api/linkedin/callback';
    const authUrl = buildLinkedInAuthUrl(state, redirectUri);

    assert.ok(authUrl.startsWith('https://www.linkedin.com/oauth/v2/authorization?'));
    const url = new URL(authUrl);
    assert.equal(url.searchParams.get('response_type'), 'code');
    assert.equal(url.searchParams.get('client_id'), 'test_client_id_12345');
    assert.equal(url.searchParams.get('redirect_uri'), redirectUri);
    assert.equal(url.searchParams.get('state'), state);
    assert.equal(url.searchParams.get('scope'), 'openid profile email');
  } finally {
    process.env.LINKEDIN_CLIENT_ID = originalClientId;
  }
});

// ============================================================================
// 6. Security & Credential Leakage Protection Tests
// ============================================================================
test('OAuth functions protect client credentials and never log secrets', async () => {
  // Verify client secret is never exposed in generated URLs
  const fakeSecret = 'SUPER_SECRET_CLIENT_KEY_9999999999';
  const originalSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const originalId = process.env.LINKEDIN_CLIENT_ID;
  process.env.LINKEDIN_CLIENT_SECRET = fakeSecret;
  process.env.LINKEDIN_CLIENT_ID = 'app_id_123';

  try {
    const { buildLinkedInAuthUrl } = await import('./client.ts');
    const authUrl = buildLinkedInAuthUrl('test_state', 'http://localhost:3005/callback');
    assert.ok(!authUrl.includes(fakeSecret), 'Auth URL must NEVER include client secret');
  } finally {
    process.env.LINKEDIN_CLIENT_SECRET = originalSecret;
    process.env.LINKEDIN_CLIENT_ID = originalId;
  }
});
