# LinkedIn Profile Write-Back Architecture & Safety Blueprint

**Document Version:** 2.0.0  
**Status:** Approved Architectural Specification (Step 14)  
**Compliance Standard:** Strict adherence to official LinkedIn Developer Terms of Service. Zero scraping, zero password collection, zero browser automation.  
**Reference Document:** [`docs/linkedin-writeback-capability-matrix.md`](./linkedin-writeback-capability-matrix.md)

---

## 1. System Intent & Dual-Mode Blueprint

This specification governs the transition from assisted clipboard synchronization to server-governed write-back operations.

```
       [ Candidate CV Upload ]
                  ↓
       [ LinkedIn Identity (OIDC) / Current Profile ]
                  ↓
       [ AI Gap Analysis & Recommendations ]
                  ↓
       [ User Review & Validation Gate ]
                  ↓
      ┌───────────────────────────────────────────────┐
      │ Server Capability Gate: canWrite === true?    │
      └───────┬───────────────────────────────┬───────┘
              │ NO (Current Self-Serve)       │ YES (Future Approved Partner)
              ▼                               ▼
    [ Copy & Open LinkedIn ↗ ]     [ Current vs Proposed Diff Preview ]
    (Assisted Deep-Edit Link)                 ↓
                                   [ User Explicit Approval ]
                                              ↓
                                   [ Optimistic Concurrency Check ]
                                              ↓
                                   [ LinkedIn Write Mutation ]
                                              ↓
                                   [ Per-Section Apply Result ]
```

---

## 2. Server-Authoritative Capability Model

Capabilities are determined strictly server-side. The client never dictates permissions.

### A. Endpoint: `GET /api/linkedin/capabilities`
Returns section-level and overall platform capability:

```json
{
  "status": "APPROVAL_REQUIRED",
  "canReadBasicProfile": true,
  "canReadDetailedProfile": false,
  "canWriteHeadline": false,
  "canWriteAbout": false,
  "canWriteExperience": false,
  "canWriteEducation": false,
  "canWriteSkills": false,
  "canWriteProjects": false,
  "canWriteCertifications": false,
  "sections": {
    "headline": { "read": false, "write": false, "status": "APPROVAL_REQUIRED" },
    "about": { "read": false, "write": false, "status": "APPROVAL_REQUIRED" },
    "experience": { "read": false, "write": false, "status": "APPROVAL_REQUIRED" },
    "education": { "read": false, "write": false, "status": "APPROVAL_REQUIRED" },
    "skills": { "read": false, "write": false, "status": "APPROVAL_REQUIRED" }
  },
  "reason": "Current self-serve LinkedIn developer access does not provide personal member profile write APIs.",
  "officialDocUrl": "https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access"
}
```

### B. Capability Status Hierarchy
- **`AVAILABLE`**: Both server credentials and OAuth session scopes permit direct mutation (`write: true`).
- **`APPROVAL_REQUIRED`**: Capability exists in LinkedIn's Partner Program but is not granted to the current application or scope (`write: false`).
- **`UNAVAILABLE`**: LinkedIn does not provide an API for this section under any public tier (`write: false`).

---

## 3. Safe Apply Endpoint Architecture: `POST /api/linkedin/apply`

All write requests are validated through a mandatory 10-step security gate:

```
Request Body:
{
  "changes": [
    {
      "recommendationId": "rec-headline",
      "section": "headline",
      "oldValue": "Cloud Architect",
      "newValue": "Principal Cloud Architect | Distributed Systems & Go",
      "userApproved": true
    }
  ]
}
```

### 10-Step Execution Pipeline:
1. **Session Authentication:** Validates server-side encrypted `cv2li_session` cookie; returns HTTP 401 if absent or expired.
2. **Server Capability Verification:** Checks if target section has `canWrite === true` and `status === 'AVAILABLE'`. If false, rejects immediately with HTTP 403 `LINKEDIN_WRITE_ACCESS_REQUIRED`.
3. **Explicit User Approval:** `userApproved: true` is strictly mandatory. AI recommendations **never** auto-apply.
4. **Anti-Hallucination & Evidence Gate:** If recommendation has `evidenceStatus === 'USER_VERIFICATION_REQUIRED'` or `'MISSING_EVIDENCE'`, rejects write request until user manually edits or verifies.
5. **Section Validation:** Verifies section is supported (`headline`, `about`, `experience`, `education`, `skills`).
6. **Content Sanitization:** Strips HTML tags, script injection patterns, and excessive whitespace.
7. **Optimistic Concurrency Protection:** Compares `oldValue` against the user's currently fetched LinkedIn value *if and only if* the official API provides it. If a mismatch is detected, returns `CONCURRENCY_CONFLICT`. If current content cannot be fetched, notifies user to review manually.
8. **Mutation Execution:** Calls official partner mutation endpoint (or mock harness in isolated development testing).
9. **Partial Result Handling:** Each change returns an isolated status (`updated` or `failed` with specific `errorCode`).
10. **In-Memory Audit Trail:** Logs timestamp, section, action, and status without logging OAuth tokens, client secrets, or passwords.

---

## 4. UI States & Approval Gate Rules

1. **Self-Serve Mode (Default / Production):**
   - Hides `[Approve & Apply]`.
   - Displays: *"Direct LinkedIn updates require additional LinkedIn API access."*
   - Displays primary actions: **[Copy]** and **[Copy & Open LinkedIn]**.
2. **Available Mode (Mock / Future Partner):**
   - Shows **[Approve & Apply]**.
   - Clicking opens the **Current vs Proposed Diff Preview Modal**.
   - User reviews changes side-by-side.
   - User clicks **[Confirm & Apply]** to trigger the API mutation.
3. **Partial Failure State:**
   - Displays status per section:
     - ✓ *Headline updated*
     - ✕ *Experience could not be updated*
   - Provides `[Retry Failed Changes]` without repeating successful operations.

---

## 5. Security & Privacy Guarantees

- **Zero Token Leakage:** Access tokens remain strictly inside server-side httpOnly cookies (`cv2li_session`) and are never returned in client payloads.
- **Zero Browser Automation:** No Puppeteer/Playwright scripts running against user accounts.
- **Zero Scraping:** No headless scraping of linkedin.com.
- **Zero Password Collection:** Credentials remain entirely with LinkedIn's official OAuth authorization server.
