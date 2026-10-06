import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHECKLIST_SECTION_KEYS,
  initializeChecklistState,
  toggleChecklistItem,
  markSectionManuallyUpdated,
  getChecklistProgress,
  loadChecklistFromStorage,
  saveChecklistToStorage,
  clearChecklistFromStorage,
  type ChecklistState
} from './checklist.ts';
import type { LinkedInProfilePackage } from '../../types/index.ts';

const mockProfile: LinkedInProfilePackage = {
  headline: 'Principal Distributed Systems Architect',
  about: 'Engineering leader with 12+ years experience.',
  experience: [
    {
      company: 'Nexus Scale Labs',
      role: 'Principal Architect',
      dates: '2021 - Present',
      bullets: ['Built messaging platform.']
    }
  ],
  education: [
    {
      institution: 'UC Berkeley',
      degree: 'B.S. CS',
      dates: '2013 - 2017'
    }
  ],
  skills: ['Go', 'Kubernetes'],
  certifications: ['AWS Solutions Architect'],
  projects: [
    {
      name: 'RaftMesh',
      description: 'Distributed consensus engine'
    }
  ],
  achievements: ['Speaker at GopherCon'],
  suggestedKeywords: ['Distributed Systems']
};

test('1. Checklist initializes with all 8 standard LinkedIn profile sections', () => {
  const state = initializeChecklistState(mockProfile);

  assert.equal(CHECKLIST_SECTION_KEYS.length, 8);
  for (const key of CHECKLIST_SECTION_KEYS) {
    assert.ok(state.items[key], `Checklist must have entry for section ${key}`);
    assert.equal(state.items[key].isDone, false);
    assert.ok(state.items[key].title);
    assert.ok(state.items[key].deepEditUrl.startsWith('https://www.linkedin.com/'));
  }
  assert.equal(state.items.headline.content, 'Principal Distributed Systems Architect');
});

test('2. Progress calculation accurately tracks completed checklist items', () => {
  const state = initializeChecklistState(mockProfile);
  let progress = getChecklistProgress(state);
  assert.equal(progress.total, 8);
  assert.equal(progress.completed, 0);
  assert.equal(progress.percentage, 0);

  // Toggle one item
  const updated1 = toggleChecklistItem(state, 'headline', true);
  progress = getChecklistProgress(updated1);
  assert.equal(progress.completed, 1);
  assert.equal(progress.percentage, 13); // 1/8 * 100 rounded

  // Toggle another
  const updated2 = toggleChecklistItem(updated1, 'about', true);
  progress = getChecklistProgress(updated2);
  assert.equal(progress.completed, 2);
  assert.equal(progress.percentage, 25);
});

test('3. markSectionManuallyUpdated transitions status and records manual timestamp', () => {
  const state = initializeChecklistState(mockProfile);
  const updated = markSectionManuallyUpdated(state, 'skills');

  assert.equal(updated.items.skills.isDone, true);
  assert.equal(updated.items.skills.status, 'applied_manually');
  assert.ok(updated.items.skills.appliedAt);
  assert.ok(new Date(updated.items.skills.appliedAt).getTime() > 0);
});

test('4. Session storage operations round-trip checklist state safely', () => {
  const storageMock: Record<string, string> = {};
  const mockStorageObj = {
    getItem: (key: string) => storageMock[key] || null,
    setItem: (key: string, val: string) => {
      storageMock[key] = val;
    },
    removeItem: (key: string) => {
      delete storageMock[key];
    }
  };

  const state = initializeChecklistState(mockProfile);
  const modified = markSectionManuallyUpdated(state, 'headline');

  saveChecklistToStorage(modified, mockStorageObj);
  assert.ok(storageMock['cv2linkedin_checklist_state']);

  const loaded = loadChecklistFromStorage(mockStorageObj);
  assert.ok(loaded);
  assert.equal(loaded?.items.headline.isDone, true);
  assert.equal(loaded?.items.headline.status, 'applied_manually');
  assert.equal(loaded?.items.about.isDone, false);

  clearChecklistFromStorage(mockStorageObj);
  assert.equal(storageMock['cv2linkedin_checklist_state'], undefined);
  assert.equal(loadChecklistFromStorage(mockStorageObj), null);
});

test('5. Checklist state never serializes secrets or tokens', () => {
  const state = initializeChecklistState(mockProfile);
  const serialized = JSON.stringify(state);

  assert.equal(serialized.includes('apiKey'), false);
  assert.equal(serialized.includes('access_token'), false);
  assert.equal(serialized.includes('client_secret'), false);
  assert.equal(serialized.includes('password'), false);
});
