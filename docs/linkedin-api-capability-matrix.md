# LinkedIn API Capability Matrix & Feasibility Audit

**Document Version:** 1.0.0  
**Audit Date:** October 2026  
**Auditor:** CV2LinkedIn AI Architectural Engineering  
**Scope:** Feasibility analysis of official LinkedIn REST & OpenID Connect APIs for member profile reading, editing, and synchronization.

---

## 1. Executive Summary

A comprehensive audit of official LinkedIn Developer Documentation ([learn.microsoft.com/en-us/linkedin](https://learn.microsoft.com/en-us/linkedin/)) confirms the following definitive legal and technical constraints:

1. **Authentication (Sign In with LinkedIn)**:
   - Officially standardizes on **OpenID Connect (OIDC)** (`openid`, `profile`, `email`).
   - Self-serve and immediately available to all registered developers.
   - Endpoint: `/v2/userinfo`.
   - Returns: Member ID (`sub`), full name, given name, family name, profile picture URL, email, and locale.

2. **Reading Detailed Profile Sections (Experience, Education, Skills, Summary)**:
   - **NOT accessible via self-serve developer accounts.**
   - Access to full career history requires admission to the **LinkedIn Partner Program** (e.g., Talent Solutions, Member Data Portability, or Apply with LinkedIn enterprise tiers).
   - Legacy scopes (`r_fullprofile`, `r_1st_connections`) were permanently closed to public applications.

3. **Writing / Updating Profile Fields (Headline, Summary, Positions, Education, Skills)**:
   - **NO PUBLIC OR PARTNER API CURRENTLY EXISTS** for automated write-back to an individual member's personal profile (headline, about, experience, education, skills, or projects).
   - LinkedIn APIs only permit write operations for:
     - Member posts and media shares (`w_member_social`)
     - Organization / Company page posts (`w_organization_social`)
     - Sponsored content and ads campaigns
   - Profile edits must be performed manually by the member on LinkedIn's web/mobile client.

---

## 2. Definitive Capability Matrix

| # | Capability | Official API / Product | Required Permissions | Approval Classification | Current Documentation URL | Implementation Status |
|---|---|---|---|---|---|---|
| **1** | **OAuth 2.0 / Sign In with LinkedIn** | Sign In with LinkedIn using OpenID Connect | `openid`, `profile`, `email` | **AVAILABLE** (Self-serve) | [OIDC Documentation](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2) | **IMPLEMENTED** (Phase 2 & 6) |
| **2** | **Reading Member Basic Info** (Name, Email, Picture, Sub ID) | OpenID Connect UserInfo (`/v2/userinfo`) | `openid`, `profile`, `email` | **AVAILABLE** (Self-serve) | [UserInfo Documentation](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2#retrieve-member-info) | **IMPLEMENTED** (Phase 6) |
| **3** | **Reading Member Headline** | Consumer Profile API (`/v2/me`) or Partner API | `r_basicprofile` (legacy) or Partner Scope | **APPROVAL REQUIRED** (Partner Program only; not in basic OIDC) | [Profile API](https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access) | **FOUNDATION READY** (Falls back gracefully to manual input) |
| **4** | **Reading About / Summary** | Member Data Portability / Talent Solutions API | Partner tier (`r_fullprofile` deprecated) | **APPROVAL REQUIRED** (LinkedIn Partner Program agreement) | [Getting Access Guide](https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access) | **FOUNDATION READY** |
| **5** | **Reading Positions / Experience** | Member Data Portability / Apply with LinkedIn | Enterprise Partner agreement | **APPROVAL REQUIRED** (Talent Partner Program approval) | [Apply with LinkedIn](https://learn.microsoft.com/en-us/linkedin/talent/apply-with-linkedin/) | **FOUNDATION READY** |
| **6** | **Reading Education** | Apply with LinkedIn / One-Click Export | Enterprise Partner agreement | **APPROVAL REQUIRED** (Talent Partner Program approval) | [Partner Portal](https://developer.linkedin.com/) | **FOUNDATION READY** |
| **7** | **Reading Skills** | Talent Solutions / Candidate Profile API | Enterprise Partner agreement | **APPROVAL REQUIRED** (Talent Partner Program approval) | [Talent Solutions](https://learn.microsoft.com/en-us/linkedin/talent/) | **FOUNDATION READY** |
| **8** | **Reading Projects** | Deprecated / Closed | N/A | **NOT AVAILABLE** (No active API exposes member projects) | [LinkedIn Docs](https://learn.microsoft.com/en-us/linkedin/) | **UNSUPPORTED** |
| **9** | **Updating Headline** | N/A | None | **NOT AVAILABLE** (No official write endpoint exists) | [LinkedIn API Specs](https://learn.microsoft.com/en-us/linkedin/) | **MANUAL COPY / WORKFLOW ONLY** |
| **10** | **Updating About / Summary** | N/A | None | **NOT AVAILABLE** (No official write endpoint exists) | [LinkedIn API Specs](https://learn.microsoft.com/en-us/linkedin/) | **MANUAL COPY / WORKFLOW ONLY** |
| **11** | **Updating Positions / Experience** | N/A | None | **NOT AVAILABLE** (No official write endpoint exists) | [LinkedIn API Specs](https://learn.microsoft.com/en-us/linkedin/) | **MANUAL COPY / WORKFLOW ONLY** |
| **12** | **Updating Education** | N/A | None | **NOT AVAILABLE** (No official write endpoint exists) | [LinkedIn API Specs](https://learn.microsoft.com/en-us/linkedin/) | **MANUAL COPY / WORKFLOW ONLY** |
| **13** | **Updating Skills** | N/A | None | **NOT AVAILABLE** (No official write endpoint exists) | [LinkedIn API Specs](https://learn.microsoft.com/en-us/linkedin/) | **MANUAL COPY / WORKFLOW ONLY** |
| **14** | **Updating Projects** | N/A | None | **NOT AVAILABLE** (No official write endpoint exists) | [LinkedIn API Specs](https://learn.microsoft.com/en-us/linkedin/) | **MANUAL COPY / WORKFLOW ONLY** |

---

## 3. Recommended Product Strategy

Given that LinkedIn strictly prohibits automated profile editing and restricts full career history reads to enterprise partners:

1. **Authentication & Identity**: Use standard OpenID Connect to verify the member's authenticated identity (`name`, `email`, `picture`).
2. **Profile Import**:
   - In standard self-serve mode, fetch available identity metadata from `/v2/userinfo`.
   - Provide clean UI for importing/pasting current profile text or comparing imported CV with target LinkedIn sections.
3. **AI Comparison & Optimization**:
   - Provide structured side-by-side comparison between the candidate's CV and current profile.
   - AI generates section-by-section optimization recommendations (Headline, About, Experience bullets, Skills).
4. **Execution / Write-Back**:
   - Provide frictionless 1-click clipboard copy for each optimized section with deep links to the user's LinkedIn edit modal (`https://www.linkedin.com/in/me/edit/intro/`).
   - Strictly avoid scraping, browser extension automation, or unauthorized credential harvesting, preserving the user's account safety and LinkedIn Terms of Service compliance.
