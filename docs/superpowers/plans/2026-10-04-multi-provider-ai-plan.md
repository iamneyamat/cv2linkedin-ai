# Multi-Provider AI System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend CV2LinkedIn AI into a multi-provider BYOK architecture supporting Google Gemini, OpenAI, and DeepSeek with dynamic model discovery, isolated session storage, and comprehensive testing.

**Architecture:** Provider adapter pattern with unified `AIProvider` contract, centralized registry and factory, provider-neutral API routes, isolated `sessionStorage` per provider, and reusable `ApiKeyTutorial.tsx` component.

**Tech Stack:** Next.js 15 App Router, TypeScript, Native Fetch HTTP, Node.js Native Test Runner, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-04-multi-provider-ai-design.md`

## Global Constraints
- Zero hardcoded model lists across all providers.
- Dynamic model discovery from provider API responses.
- Provider-specific session storage keys: `cv2linkedin_byok_key_gemini`, `cv2linkedin_byok_key_openai`, `cv2linkedin_byok_key_deepseek`.
- Zero database, zero cookies, zero localStorage, zero disk writes for CV or API keys.
- Preserve 100% of existing Gemini BYOK functionality and test suite.

---

### Task 1: Core Types & Provider Interface Update
- [ ] Update `src/types/index.ts` to include `AIProviderId = 'gemini' | 'openai' | 'deepseek'`.
- [ ] Update `src/lib/ai/types.ts` to define `AIProvider` interface with `validateKey`, `discoverModels`, `generateLinkedInProfile`, and `normalizeError`.

### Task 2: Provider Adapters & Registry
- [ ] Refactor Gemini adapter into `src/lib/ai/providers/gemini.ts` implementing `AIProvider`.
- [ ] Create OpenAI adapter in `src/lib/ai/providers/openai.ts` implementing `AIProvider` with dynamic chat model discovery and completions via `https://api.openai.com/v1`.
- [ ] Create DeepSeek adapter in `src/lib/ai/providers/deepseek.ts` implementing `AIProvider` with dynamic model discovery via `https://api.deepseek.com/models` and completions via `https://api.deepseek.com/chat/completions`.
- [ ] Create `src/lib/ai/registry.ts` and update `src/lib/ai/factory.ts` to resolve providers cleanly.

### Task 3: API Route Neutrality
- [ ] Update `/api/ai/test-key/route.ts` to dispatch via `getAIProvider(provider)`.
- [ ] Update `/api/ai/models/route.ts` to dispatch via `getAIProvider(provider)`.
- [ ] Update `/api/generate-profile/route.ts` to dispatch via `getAIProvider(provider)`.

### Task 4: UI & Tutorial Components
- [ ] Create `src/components/ApiKeyTutorial.tsx` with official links, instructions, and privacy notice.
- [ ] Update `src/components/AiSettingsModal.tsx` to support Gemini, OpenAI, and DeepSeek with isolated session keys, dynamic models, and model reset on switch.
- [ ] Update `src/components/AiModeSelector.tsx` and `src/components/CvUploadZone.tsx` to display active provider name and model.

### Task 5: Automated Testing & Verification
- [ ] Create unit tests for provider registry, Gemini, OpenAI, DeepSeek, and error sanitization (`src/lib/ai/providers.test.ts`).
- [ ] Run `npm test` and ensure all unit tests pass.
- [ ] Run `npm run build` and ensure clean build.
- [ ] Launch local server and run Playwright verification to capture all 9 requested screenshots.
- [ ] Run security audit.
