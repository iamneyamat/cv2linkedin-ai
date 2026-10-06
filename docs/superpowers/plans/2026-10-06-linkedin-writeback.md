# LinkedIn Write-Back Feasibility, Approval Gate & Safe Apply Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a server-authoritative LinkedIn capability engine, safe apply-changes endpoint (`/api/linkedin/apply`) with concurrency protection, in-memory audit trail, and approval-gated UI extensions without pretending self-serve accounts have profile write access.

**Architecture:** Server determines section-level capabilities (defaulting to `APPROVAL_REQUIRED` with all write flags `false`). The apply endpoint rejects unapproved/unsupported writes, validates anti-hallucination evidence, enforces concurrency checks, and reports per-section status. The UI provides honest notices and the 1-click **Copy & Open LinkedIn** workflow, reserving the **Current vs Proposed Diff Preview** and Apply triggers only for verified write capabilities.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Node.js native crypto, React 19, Playwright.

**Spec:** [`docs/superpowers/specs/2026-10-06-linkedin-writeback-design.md`](../specs/2026-10-06-linkedin-writeback-design.md)

## Global Constraints
- Current self-serve mode assumes write access is NOT AVAILABLE.
- No fabricated write permissions; write booleans default to false.
- Zero OAuth token leakage; zero password collection; zero scraping; zero browser automation.
- Never auto-apply recommendations without explicit two-step user approval.
- All existing 108 automated tests must remain 100% passing.
- Strictly local only: no git commits, no git pushes, no deployments.

---

### Task 1: Capability Engine & Types
**Files:**
- Create: `src/lib/linkedin/capabilities.ts`
- Test: `src/lib/linkedin/capabilities.test.ts`

- [ ] **Step 1: Write failing unit tests for capability resolution**
- [ ] **Step 2: Run tests and verify failure**
- [ ] **Step 3: Implement `getLinkedInCapabilities` with section-level permissions and mock isolation**
- [ ] **Step 4: Run tests and verify all pass**

---

### Task 2: Capabilities API Endpoint
**Files:**
- Create: `src/app/api/linkedin/capabilities/route.ts`

- [ ] **Step 1: Implement `GET /api/linkedin/capabilities` returning sanitized capabilities**
- [ ] **Step 2: Verify zero secrets or tokens are returned in the response**

---

### Task 3: In-Memory Audit Trail & Concurrency-Protected Apply Engine
**Files:**
- Create: `src/lib/linkedin/audit.ts`
- Create: `src/lib/linkedin/apply.ts`
- Test: `src/lib/linkedin/apply.test.ts`

- [ ] **Step 1: Write failing unit tests for apply validation, concurrency check, and audit trail**
- [ ] **Step 2: Run tests and verify failure**
- [ ] **Step 3: Implement `applyProfileChanges` and in-memory audit logging**
- [ ] **Step 4: Run tests and verify all pass**

---

### Task 4: Apply API Route
**Files:**
- Create: `src/app/api/linkedin/apply/route.ts`

- [ ] **Step 1: Implement `POST /api/linkedin/apply` with session cookie validation, capability checks, and error handling**
- [ ] **Step 2: Test endpoint with unauthenticated, unauthorized, and concurrent requests**

---

### Task 5: Optimizer Dashboard UI Approval Gate & Diff Preview Modal
**Files:**
- Modify: `src/components/LinkedInOptimizerDashboard.tsx`

- [ ] **Step 1: Fetch capabilities on mount and render capability notice banner**
- [ ] **Step 2: Hide `[Approve & Apply]` when write capability is false / approval-required**
- [ ] **Step 3: Render *"Direct LinkedIn update is not available for this section"* with `[Copy]` and `[Copy & Open LinkedIn]`**
- [ ] **Step 4: Implement Current vs Proposed Diff Preview Modal for available write mode**
- [ ] **Step 5: Support per-section status indicators and retry for failed sections**

---

### Task 6: Full Test Suite Verification
- [ ] **Step 1: Run `npm test` across all suites**
- [ ] **Step 2: Confirm all 108 existing tests + new capability & apply tests pass**

---

### Task 7: Playwright E2E Acceptance Verification
**Files:**
- Create: `scripts/verify_step14.js`

- [ ] **Step 1: Implement E2E test verifying optimizer review, capability status, approval-required UI, copy actions, diff preview, and mobile responsiveness**
- [ ] **Step 2: Run `node scripts/verify_step14.js` and capture all 6 screenshots:**
  - `step14_01_optimizer_review.png`
  - `step14_02_capability_status.png`
  - `step14_03_approval_required.png`
  - `step14_04_copy_linkedin.png`
  - `step14_05_apply_protection.png`
  - `step14_06_mobile.png`

---

### Task 8: Production Build & Local Server Verification
- [ ] **Step 1: Run `npm run build`**
- [ ] **Step 2: Verify production server on `http://localhost:3005` responds HTTP 200**
- [ ] **Step 3: Perform final security and git status audit**
