# Multi-Provider AI System Design Specification (Gemini + OpenAI + DeepSeek)

**Date**: 2026-10-04
**Status**: Approved
**Target**: CV2LinkedIn AI

## 1. Overview & Goals
Extend the existing Gemini-only BYOK system in CV2LinkedIn AI into an extensible multi-provider AI architecture supporting:
1. **Google Gemini** (Existing dynamic discovery, Flash/Pro ranking, generateContent)
2. **OpenAI** (Native fetch to `https://api.openai.com/v1`, dynamic chat model discovery, zero hardcoded model dependency)
3. **DeepSeek** (Native fetch to `https://api.deepseek.com`, dynamic model discovery via `/models`, honest and verified capability badges)

## 2. Core Architecture

### 2.1 File & Directory Structure
```text
src/lib/ai/
  ├── types.ts              # Core contracts: AIProvider, ModelInfo, KeyValidationResult
  ├── registry.ts           # ProviderRegistry mapping 'gemini' | 'openai' | 'deepseek' -> AIProvider
  ├── factory.ts            # getAIProvider() resolution helper
  ├── prompts/
  │   ├── linkedin-profile.ts
  │   └── linkedin-profile.test.ts
  └── providers/
      ├── gemini.ts         # Google Gemini provider adapter
      ├── openai.ts         # OpenAI provider adapter
      └── deepseek.ts       # DeepSeek provider adapter
```

### 2.2 Common `AIProvider` Interface
Every provider implements:
- `readonly id: 'gemini' | 'openai' | 'deepseek'`
- `readonly name: string`
- `readonly description: string`
- `readonly docUrl: string`
- `validateKey(apiKey: string): Promise<KeyValidationResult>`
- `discoverModels(apiKey: string): Promise<DiscoveredModel[]>`
- `generateLinkedInProfile(cvText: string, config: { apiKey: string; model: string }): Promise<LinkedInProfilePackage>`
- `normalizeError(error: unknown): { error: string; errorCode: string; statusCode: number }`

### 2.3 Provider-Specific Dynamic Model Discovery
1. **Google Gemini**:
   - `GET https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
   - Filter `supportedGenerationMethods.includes('generateContent')`.
   - Generic scoring for `flash`, `pro`, `lite`. First top Flash model recommended.
2. **OpenAI**:
   - `GET https://api.openai.com/v1/models` with `Bearer ${apiKey}`.
   - Filter out embeddings (`text-embedding-`, `embedding`), audio (`whisper`, `tts`), image (`dall-e`), moderation (`omni-moderation`, `text-moderation`), and realtime/vector models.
   - Retain chat completion models.
   - Prioritize fast, balanced models without hardcoding a static model requirement.
3. **DeepSeek**:
   - `GET https://api.deepseek.com/models` with `Bearer ${apiKey}`.
   - Discovers active models (e.g. `deepseek-chat`, `deepseek-reasoner`).
   - Honest representation: `deepseek-chat` marked as recommended for structured JSON generation.

### 2.4 Provider-Specific Session Storage
Isolated browser tab sessionStorage keys:
- `cv2linkedin_byok_key_gemini`
- `cv2linkedin_byok_key_openai`
- `cv2linkedin_byok_key_deepseek`
- Switching providers clears incompatible selected model and preserves the other keys without cross-contamination.

### 2.5 API Routes
- `POST /api/ai/test-key` -> resolves provider via registry -> calls `provider.validateKey()`
- `POST /api/ai/models` -> resolves provider via registry -> calls `provider.discoverModels()`
- `POST /api/generate-profile` -> extracts CV text -> resolves provider via registry -> calls `provider.generateLinkedInProfile()`

### 2.6 Key Tutorial Component
- `src/components/ApiKeyTutorial.tsx`:
  - Official links only:
    - Gemini: `https://aistudio.google.com/app/apikey`
    - OpenAI: `https://platform.openai.com/api-keys`
    - DeepSeek: `https://platform.deepseek.com/api_keys`
  - Step-by-step instructions and privacy warnings.
