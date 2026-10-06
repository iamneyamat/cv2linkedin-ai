# Design Spec: LinkedIn Write-Back Feasibility, Approval Gate & Safe Apply Architecture

**Date:** 2026-10-06  
**Status:** Approved (Step 14)  
**Author:** Pair Programming Agent & User

---

## 1. Overview & Objective
Establish a future-safe LinkedIn write-back architecture for CV2LinkedIn AI without pretending that current self-serve LinkedIn accounts have personal profile write access.

The system implements:
1. Server-authoritative capability engine (`GET /api/linkedin/capabilities`).
2. Section-level capability tracking (`headline`, `about`, `experience`, `education`, `skills`).
3. Safe apply endpoint (`POST /api/linkedin/apply`) with concurrency checking, anti-hallucination gates, and partial success reporting.
4. UI approval gate in `LinkedInOptimizerDashboard`: hides `[Approve & Apply]` when write is unavailable or approval-required, displays *"Direct LinkedIn updates require additional LinkedIn API access"*, and presents **[Copy & Open LinkedIn]**.
5. Current vs Proposed Diff Preview modal when write is enabled (development mock / future partner).
6. In-memory development audit trail with zero token storage.

---

## 2. Server-Authoritative Capabilities

### Data Structures (`src/lib/linkedin/capabilities.ts`)
```ts
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
```

### Default State (Self-Serve Mode)
```ts
canWriteHeadline: false,
canWriteAbout: false,
canWriteExperience: false,
canWriteEducation: false,
canWriteSkills: false,
canWriteProjects: false,
canWriteCertifications: false,
canWriteLanguages: false,
canWriteHonors: false,
status: 'APPROVAL_REQUIRED',
reason: 'Current self-serve LinkedIn developer access does not provide personal member profile write APIs.'
```

### Development Mock Isolation
If `process.env.NODE_ENV !== 'production' && process.env.LINKEDIN_WRITEBACK_MOCK === 'true'`, mock write capability can be enabled for test suites. It must never activate in production.

---

## 3. Apply Endpoint: `POST /api/linkedin/apply`

### Request Schema
```ts
export interface ApplyChangeItem {
  recommendationId: string;
  section: 'headline' | 'about' | 'experience' | 'education' | 'skills';
  oldValue: string;
  newValue: string;
  userApproved: boolean;
  evidenceStatus?: string;
}

export interface ApplyRequest {
  changes: ApplyChangeItem[];
}
```

### Safety & Concurrency Pipeline
1. Check `cv2li_session` cookie; reject with HTTP 401 if missing/expired.
2. Query server capability; reject with HTTP 403 `LINKEDIN_WRITE_ACCESS_REQUIRED` if `write === false` or `status !== 'AVAILABLE'`.
3. Check `userApproved === true`; reject with HTTP 400 `USER_APPROVAL_REQUIRED` if false.
4. Check anti-hallucination status: reject with HTTP 400 `USER_VERIFICATION_REQUIRED` if `evidenceStatus === 'USER_VERIFICATION_REQUIRED'` or `'MISSING_EVIDENCE'`.
5. Perform concurrency check: if the official LinkedIn API provides current section value, compare with `oldValue`. If mismatch, reject with `CONCURRENCY_CONFLICT`. If current value cannot be fetched, warn user.
6. Record action in in-memory audit log: `{ timestamp, section, action, status }`.
7. Return per-section results:
```json
{
  "success": true,
  "results": [
    { "section": "headline", "status": "updated" }
  ],
  "auditId": "audit-12345"
}
```

---

## 4. UI Extensions in `LinkedInOptimizerDashboard.tsx`
1. Fetch `/api/linkedin/capabilities` on mount.
2. In self-serve / `APPROVAL_REQUIRED` mode:
   - Display notice: *"Direct LinkedIn updates require additional LinkedIn API access."*
   - Display `[Copy]` and `[Copy & Open LinkedIn]`.
   - Never display `[Approve & Apply]`.
3. In `AVAILABLE` mode:
   - Display `[Approve & Apply]`.
   - Clicking opens **Current vs Proposed Diff Preview Modal**.
   - Modal shows side-by-side / stacked diff with `[Cancel]` and `[Apply This Change]`.
   - Dispatches `POST /api/linkedin/apply`.
   - Displays per-section result badges and allows retry for failed changes only.

---

## 5. Security & Verification
- Zero token leakage: tokens strictly in encrypted httpOnly cookie.
- Zero passwords, zero scraping, zero browser automation.
- 18 unit/integration tests in `src/lib/linkedin/apply.test.ts`.
- All 108 existing tests remain 100% passing.
- Playwright E2E script `scripts/verify_step14.js` capturing all 6 screenshots.
