import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getLinkedInCapabilities } from './capabilities.ts';

test('1. Default self-serve capability returns APPROVAL_REQUIRED and false for all write permissions', () => {
  // Ensure mock is disabled
  const prevEnv = process.env.LINKEDIN_WRITEBACK_MOCK;
  delete process.env.LINKEDIN_WRITEBACK_MOCK;

  try {
    const caps = getLinkedInCapabilities();
    assert.equal(caps.status, 'APPROVAL_REQUIRED');
    assert.equal(caps.canReadBasicProfile, true);
    assert.equal(caps.canReadDetailedProfile, false);
    assert.equal(caps.canWriteHeadline, false);
    assert.equal(caps.canWriteAbout, false);
    assert.equal(caps.canWriteExperience, false);
    assert.equal(caps.canWriteEducation, false);
    assert.equal(caps.canWriteSkills, false);
    assert.equal(caps.canWriteProjects, false);
    assert.equal(caps.canWriteCertifications, false);
    assert.equal(caps.canWriteLanguages, false);
    assert.equal(caps.canWriteHonors, false);
    assert.match(caps.reason, /self-serve/i);
    assert.match(caps.officialDocUrl, /learn\.microsoft\.com/i);
  } finally {
    if (prevEnv !== undefined) process.env.LINKEDIN_WRITEBACK_MOCK = prevEnv;
  }
});

test('2. Section-level capabilities track individual read/write and status attributes', () => {
  const caps = getLinkedInCapabilities();
  assert.ok(caps.sections);
  assert.equal(caps.sections.headline.write, false);
  assert.equal(caps.sections.headline.status, 'APPROVAL_REQUIRED');

  assert.equal(caps.sections.about.write, false);
  assert.equal(caps.sections.about.status, 'APPROVAL_REQUIRED');

  assert.equal(caps.sections.experience.write, false);
  assert.equal(caps.sections.experience.status, 'APPROVAL_REQUIRED');

  assert.equal(caps.sections.skills.write, false);
  assert.equal(caps.sections.skills.status, 'APPROVAL_REQUIRED');

  assert.equal(caps.sections.projects.write, false);
  assert.equal(caps.sections.projects.status, 'UNAVAILABLE');

  assert.equal(caps.sections.honors.write, false);
  assert.equal(caps.sections.honors.status, 'UNAVAILABLE');
});

test('3. Development mock capability enables write only when explicitly configured in non-production', () => {
  const prevEnv = process.env.NODE_ENV;
  const prevMock = process.env.LINKEDIN_WRITEBACK_MOCK;

  try {
    process.env.NODE_ENV = 'development';
    process.env.LINKEDIN_WRITEBACK_MOCK = 'true';

    const mockCaps = getLinkedInCapabilities({ allowMock: true });
    assert.equal(mockCaps.status, 'AVAILABLE');
    assert.equal(mockCaps.canWriteHeadline, true);
    assert.equal(mockCaps.canWriteAbout, true);
    assert.equal(mockCaps.sections.headline.write, true);
    assert.equal(mockCaps.sections.headline.status, 'AVAILABLE');
  } finally {
    process.env.NODE_ENV = prevEnv;
    if (prevMock !== undefined) process.env.LINKEDIN_WRITEBACK_MOCK = prevMock;
    else delete process.env.LINKEDIN_WRITEBACK_MOCK;
  }
});

test('4. Production environment strictly forbids mock capability override', () => {
  const prevEnv = process.env.NODE_ENV;
  const prevMock = process.env.LINKEDIN_WRITEBACK_MOCK;

  try {
    process.env.NODE_ENV = 'production';
    process.env.LINKEDIN_WRITEBACK_MOCK = 'true';

    const prodCaps = getLinkedInCapabilities({ allowMock: true });
    assert.equal(prodCaps.status, 'APPROVAL_REQUIRED');
    assert.equal(prodCaps.canWriteHeadline, false);
    assert.equal(prodCaps.sections.headline.write, false);
  } finally {
    process.env.NODE_ENV = prevEnv;
    if (prevMock !== undefined) process.env.LINKEDIN_WRITEBACK_MOCK = prevMock;
    else delete process.env.LINKEDIN_WRITEBACK_MOCK;
  }
});

test('5. Zero secret leakage in capability metadata', () => {
  const caps = getLinkedInCapabilities();
  const serialized = JSON.stringify(caps);
  assert.equal(serialized.includes('access_token'), false);
  assert.equal(serialized.includes('refresh_token'), false);
  assert.equal(serialized.includes('client_secret'), false);
  assert.equal(serialized.includes('authorization'), false);
});
