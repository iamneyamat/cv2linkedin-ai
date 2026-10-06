# Official LinkedIn API Capability Matrix & Write-Back Feasibility

**Document Version:** 2.0.0  
**Audit Date:** October 2026  
**Auditor:** CV2LinkedIn AI Architectural Engineering  
**Official Reference:** [Microsoft Learn — LinkedIn Developer Documentation](https://learn.microsoft.com/en-us/linkedin/)  
**Compliance Standard:** Strict adherence to official LinkedIn OpenID Connect (OIDC) specifications, Member Data Portability policies, and Consumer API terms of service. Zero scraping, zero password collection, zero browser automation.

---

## 1. Executive Summary & Legal Findings

A rigorous technical and legal audit of the current official LinkedIn Developer Platform confirms the following definitive constraints:

1. **Authentication & Identity (Self-Serve)**:
   - Officially standardizes on **OpenID Connect (OIDC)** (`openid`, `profile`, `email`) via `GET https://api.linkedin.com/v2/userinfo`.
   - Self-serve and immediately accessible to all verified developers.
   - Exposes strictly member identity: `sub` (unique ID), full name, given/family name, profile picture URL, email, and locale.

2. **Reading Career & Detailed Profile Sections**:
   - **NOT available via self-serve developer accounts.**
   - Access to full career history (experience, education, skills, about/summary) requires admission to the gated **LinkedIn Partner Program** (Talent Solutions / Member Data Portability / Apply with LinkedIn enterprise tiers).
   - Legacy scopes (`r_fullprofile`, `r_1st_connections`) were permanently deprecated and revoked for general apps.

3. **Writing / Updating Personal Profile Sections**:
   - **NO PUBLIC OR SELF-SERVE REST API EXISTS** for modifying personal member profile fields (headline, about, experience, education, skills, projects, certifications, languages, or honors).
   - LinkedIn APIs permit write operations **only** for:
     - Member posts and media shares (`w_member_social`)
     - Organization / Company page posts (`w_organization_social`)
     - Sponsored content and ads campaigns
     - ATS candidate synchronization (within external applicant tracking systems, not the user's public LinkedIn profile).
   - **Conclusion:** Profile modifications must be applied by the member via LinkedIn's native client or through the verified 1-click **Copy & Open LinkedIn** deep-link bridge.

---

## 2. Comprehensive 19-Field Capability Matrix

| # | Field | Read API Endpoint | Write API Endpoint | Required Permission / Scope | Product / Program Tier | Approval Required? | Official Documentation URL | Current App Support | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **1** | **Member Identity / Basic Profile** | `GET /v2/userinfo` | N/A | `openid`, `profile`, `email` | Sign In with LinkedIn (OIDC) | **AVAILABLE** (Self-serve) | [OIDC UserInfo](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2) | **SUPPORTED** | Returns `sub`, name, email, avatar, locale. |
| **2** | **Headline** | `/v2/me` (legacy) or Partner Member API | None | `r_basicprofile` (legacy) / Partner scope | LinkedIn Partner Program | **APPROVAL REQUIRED** (Partner only) | [Getting Access](https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access) | **READ VIA MANUAL IMPORT / WRITE: COPY & DEEP LINK** | Read restricted to partners; write unavailable. Deep link: `/in/me/edit/intro/` |
| **3** | **About / Summary** | Member Data Portability / Partner API | None | Partner scope (`r_fullprofile` deprecated) | LinkedIn Partner Program (Talent/Portability) | **APPROVAL REQUIRED** (Partner only) | [Member Data Portability](https://learn.microsoft.com/en-us/linkedin/shared/integrations/member-data-portability) | **READ VIA MANUAL IMPORT / WRITE: COPY & DEEP LINK** | No public read; write unavailable. Deep link: `/in/me/edit/about/` |
| **4** | **Experience / Positions** | Apply with LinkedIn / Talent Solutions | None | Enterprise Partner scope | LinkedIn Partner Program (Talent Solutions) | **APPROVAL REQUIRED** (Enterprise partner) | [Apply with LinkedIn](https://learn.microsoft.com/en-us/linkedin/talent/apply-with-linkedin/) | **READ VIA MANUAL IMPORT / WRITE: COPY & DEEP LINK** | Enterprise read only; write unavailable. Deep link: `/in/me/details/experience/` |
| **5** | **Education** | Apply with LinkedIn / Talent Solutions | None | Enterprise Partner scope | LinkedIn Partner Program (Talent Solutions) | **APPROVAL REQUIRED** (Enterprise partner) | [Talent Solutions](https://learn.microsoft.com/en-us/linkedin/talent/) | **READ VIA MANUAL IMPORT / WRITE: COPY & DEEP LINK** | Enterprise read only; write unavailable. Deep link: `/in/me/details/education/` |
| **6** | **Skills** | Candidate Profile / Talent Solutions | None | Enterprise Partner scope | LinkedIn Partner Program (Talent Solutions) | **APPROVAL REQUIRED** (Enterprise partner) | [Talent Solutions](https://learn.microsoft.com/en-us/linkedin/talent/) | **READ VIA MANUAL IMPORT / WRITE: COPY & DEEP LINK** | Enterprise read only; write unavailable. Deep link: `/in/me/details/skills/` |
| **7** | **Projects** | Deprecated / None | None | N/A | None | **NOT AVAILABLE** | [LinkedIn Developer Portal](https://learn.microsoft.com/en-us/linkedin/) | **MANUAL COPY ONLY** | No active read or write API exists for member projects. |
| **8** | **Certifications** | Deprecated / Partner custom | None | Enterprise custom | LinkedIn Partner Program | **APPROVAL REQUIRED** (Enterprise custom) | [Partner Directory](https://developer.linkedin.com/partner-programs) | **MANUAL COPY ONLY** | No public self-serve read or write API exists. |
| **9** | **Languages** | Deprecated / Partner custom | None | Enterprise custom | LinkedIn Partner Program | **APPROVAL REQUIRED** (Enterprise custom) | [Partner Directory](https://developer.linkedin.com/partner-programs) | **MANUAL COPY ONLY** | Not exposed in standard consumer APIs. |
| **10** | **Honors & Awards** | Deprecated / None | None | N/A | None | **NOT AVAILABLE** | [LinkedIn Developer Portal](https://learn.microsoft.com/en-us/linkedin/) | **MANUAL COPY ONLY** | Not exposed in standard consumer APIs. |
| **11** | **Updating Headline** | None | None | N/A | None | **NOT AVAILABLE** (No write endpoint) | [LinkedIn REST APIs](https://learn.microsoft.com/en-us/linkedin/) | **COPY & OPEN LINKEDIN** | Direct update impossible via public API. Assisted deep edit link used. |
| **12** | **Updating About** | None | None | N/A | None | **NOT AVAILABLE** (No write endpoint) | [LinkedIn REST APIs](https://learn.microsoft.com/en-us/linkedin/) | **COPY & OPEN LINKEDIN** | Direct update impossible via public API. Assisted deep edit link used. |
| **13** | **Updating Experience** | None | None | N/A | None | **NOT AVAILABLE** (No write endpoint) | [LinkedIn REST APIs](https://learn.microsoft.com/en-us/linkedin/) | **COPY & OPEN LINKEDIN** | Direct update impossible via public API. Assisted deep edit link used. |
| **14** | **Updating Education** | None | None | N/A | None | **NOT AVAILABLE** (No write endpoint) | [LinkedIn REST APIs](https://learn.microsoft.com/en-us/linkedin/) | **COPY & OPEN LINKEDIN** | Direct update impossible via public API. Assisted deep edit link used. |
| **15** | **Updating Skills** | None | None | N/A | None | **NOT AVAILABLE** (No write endpoint) | [LinkedIn REST APIs](https://learn.microsoft.com/en-us/linkedin/) | **COPY & OPEN LINKEDIN** | Direct update impossible via public API. Assisted deep edit link used. |
| **16** | **Updating Projects** | None | None | N/A | None | **NOT AVAILABLE** (No write endpoint) | [LinkedIn REST APIs](https://learn.microsoft.com/en-us/linkedin/) | **COPY & OPEN LINKEDIN** | Direct update impossible via public API. Assisted deep edit link used. |
| **17** | **Updating Certifications** | None | None | N/A | None | **NOT AVAILABLE** (No write endpoint) | [LinkedIn REST APIs](https://learn.microsoft.com/en-us/linkedin/) | **COPY & OPEN LINKEDIN** | Direct update impossible via public API. Assisted deep edit link used. |
| **18** | **Updating Languages** | None | None | N/A | None | **NOT AVAILABLE** (No write endpoint) | [LinkedIn REST APIs](https://learn.microsoft.com/en-us/linkedin/) | **COPY & OPEN LINKEDIN** | Direct update impossible via public API. Assisted deep edit link used. |
| **19** | **Updating Honors** | None | None | N/A | None | **NOT AVAILABLE** (No write endpoint) | [LinkedIn REST APIs](https://learn.microsoft.com/en-us/linkedin/) | **COPY & OPEN LINKEDIN** | Direct update impossible via public API. Assisted deep edit link used. |

---

## 3. Product Architecture Implications

1. **Current Self-Serve Mode (Production)**:
   - Server-authoritative capability endpoint (`/api/linkedin/capabilities`) returns `status: "APPROVAL_REQUIRED"` with all write booleans strictly set to `false`.
   - UI **never** shows `[Approve & Apply]` to real users in self-serve mode.
   - UI displays honest status notice: *"Direct LinkedIn updates require additional LinkedIn API access."*
   - UI activates the verified, 100% terms-compliant **[Copy & Open LinkedIn]** workflow.
2. **Future-Safe Extensibility**:
   - The backend includes `/api/linkedin/apply` with complete validation, session checks, anti-hallucination verification gates, and optimistic concurrency protection.
   - If an enterprise partnership grants write access in the future, the backend flips section capabilities without architectural refactoring.
