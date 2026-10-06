/**
 * LinkedIn Profile Update Checklist & Manual Change Tracking.
 * Provides a session-backed checklist for the 8 core profile sections.
 * Guarantees zero credential persistence and honest manual-update wording.
 */

import type { LinkedInProfilePackage } from '../../types/index.ts';

export type ChecklistSectionKey =
  | 'headline'
  | 'about'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'achievements';

export const CHECKLIST_SECTION_KEYS: ChecklistSectionKey[] = [
  'headline',
  'about',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'achievements'
];

export const SECTION_METADATA: Record<
  ChecklistSectionKey,
  { title: string; defaultUrl: string }
> = {
  headline: {
    title: 'Headline updated',
    defaultUrl: 'https://www.linkedin.com/in/me/edit/intro/'
  },
  about: {
    title: 'About / Summary updated',
    defaultUrl: 'https://www.linkedin.com/in/me/edit/about/'
  },
  experience: {
    title: 'Experience reviewed & updated',
    defaultUrl: 'https://www.linkedin.com/in/me/edit/position/new/'
  },
  education: {
    title: 'Education reviewed & updated',
    defaultUrl: 'https://www.linkedin.com/in/me/edit/education/new/'
  },
  skills: {
    title: 'Skills updated',
    defaultUrl: 'https://www.linkedin.com/in/me/edit/skills/'
  },
  projects: {
    title: 'Projects reviewed & updated',
    defaultUrl: 'https://www.linkedin.com/in/me/edit/project/new/'
  },
  certifications: {
    title: 'Certifications reviewed & updated',
    defaultUrl: 'https://www.linkedin.com/in/me/edit/certification/new/'
  },
  achievements: {
    title: 'Achievements reviewed & updated',
    defaultUrl: 'https://www.linkedin.com/in/me/edit/forms/honors/new/'
  }
};

export interface ChecklistItem {
  id: string;
  section: ChecklistSectionKey;
  title: string;
  deepEditUrl: string;
  content: string;
  isDone: boolean;
  status: 'pending' | 'applied_manually';
  appliedAt?: string;
}

export interface ChecklistState {
  items: Record<ChecklistSectionKey, ChecklistItem>;
  lastUpdated: string;
}

export const CHECKLIST_STORAGE_KEY = 'cv2linkedin_checklist_state';

/**
 * Extracts preview text for each section from the profile package.
 */
function extractSectionContent(
  section: ChecklistSectionKey,
  profile: LinkedInProfilePackage
): string {
  switch (section) {
    case 'headline':
      return profile.headline || '';
    case 'about':
      return profile.about || '';
    case 'experience':
      return Array.isArray(profile.experience) && profile.experience.length > 0
        ? profile.experience.map((e) => `${e.role} at ${e.company}`).join(', ')
        : '';
    case 'education':
      return Array.isArray(profile.education) && profile.education.length > 0
        ? profile.education.map((e) => `${e.degree} - ${e.institution}`).join(', ')
        : '';
    case 'skills':
      return Array.isArray(profile.skills) ? profile.skills.join(', ') : '';
    case 'projects':
      return Array.isArray(profile.projects) && profile.projects.length > 0
        ? profile.projects.map((p) => p.name).join(', ')
        : '';
    case 'certifications':
      return Array.isArray(profile.certifications) ? profile.certifications.join(', ') : '';
    case 'achievements':
      return Array.isArray(profile.achievements) ? profile.achievements.join(', ') : '';
    default:
      return '';
  }
}

/**
 * Initializes a clean checklist state for the given profile package.
 */
export function initializeChecklistState(profile: LinkedInProfilePackage): ChecklistState {
  const items = {} as Record<ChecklistSectionKey, ChecklistItem>;

  for (const key of CHECKLIST_SECTION_KEYS) {
    const meta = SECTION_METADATA[key];
    items[key] = {
      id: `check-${key}`,
      section: key,
      title: meta.title,
      deepEditUrl: meta.defaultUrl,
      content: extractSectionContent(key, profile),
      isDone: false,
      status: 'pending'
    };
  }

  return {
    items,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Toggles done state for an item.
 */
export function toggleChecklistItem(
  state: ChecklistState,
  section: ChecklistSectionKey,
  isDone: boolean
): ChecklistState {
  const current = state.items[section];
  if (!current) return state;

  return {
    ...state,
    items: {
      ...state.items,
      [section]: {
        ...current,
        isDone,
        status: isDone ? 'applied_manually' : 'pending',
        appliedAt: isDone ? new Date().toISOString() : undefined
      }
    },
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Marks a section as manually updated.
 */
export function markSectionManuallyUpdated(
  state: ChecklistState,
  section: ChecklistSectionKey
): ChecklistState {
  return toggleChecklistItem(state, section, true);
}

/**
 * Computes completion statistics for the checklist.
 */
export function getChecklistProgress(state: ChecklistState): {
  total: number;
  completed: number;
  percentage: number;
} {
  const items = Object.values(state.items);
  const total = items.length;
  const completed = items.filter((i) => i.isDone).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, percentage };
}

/**
 * Loads checklist state from browser sessionStorage.
 */
export function loadChecklistFromStorage(
  storage?: { getItem: (key: string) => string | null }
): ChecklistState | null {
  try {
    const store =
      storage || (typeof window !== 'undefined' ? window.sessionStorage : null);
    if (!store) return null;

    const raw = store.getItem(CHECKLIST_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed && parsed.items && typeof parsed.items === 'object') {
      return parsed as ChecklistState;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Saves checklist state to browser sessionStorage.
 */
export function saveChecklistToStorage(
  state: ChecklistState,
  storage?: { setItem: (key: string, val: string) => void }
): void {
  try {
    const store =
      storage || (typeof window !== 'undefined' ? window.sessionStorage : null);
    if (!store) return;

    store.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota or access issues
  }
}

/**
 * Clears checklist state from browser sessionStorage.
 */
export function clearChecklistFromStorage(
  storage?: { removeItem: (key: string) => void }
): void {
  try {
    const store =
      storage || (typeof window !== 'undefined' ? window.sessionStorage : null);
    if (!store) return;

    store.removeItem(CHECKLIST_STORAGE_KEY);
  } catch {
    // Ignore
  }
}
