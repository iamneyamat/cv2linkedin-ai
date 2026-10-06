# CV2LinkedIn AI 🚀

A privacy-first, free-tier web application that transforms uploaded CVs and resumes into comprehensive, recruiter-optimized LinkedIn profile packages using multi-provider AI (Google Gemini, OpenAI, DeepSeek).

---

## 🌟 Overview & Key Features

**CV2LinkedIn AI** analyzes authentic work experiences, educational background, skills, certifications, and projects from an uploaded CV and synthesizes them into ready-to-copy LinkedIn profile sections with gap analysis and manual checklist tracking:

1. **LinkedIn Headline**: Recruiter-friendly headline (up to 220 characters) reflecting actual CV titles and specializations.
2. **About Summary**: Engaging first-person narrative summarizing career trajectory, core competencies, and professional impact.
3. **Experience**: Structured work history preserving authentic companies, roles, and dates, with rewritten accomplishment-driven bullet points using strong action verbs (STAR format).
4. **Education**: Degrees, institutions, and completion dates.
5. **Skills**: Categorized competencies and high-demand industry skills directly supported by the CV.
6. **Certifications**: Professional licenses and credentials.
7. **Projects**: Highlighted initiatives, technical architecture, and technologies used.
8. **Achievements**: Authentic honors, milestones, and awards.
9. **Suggested Keywords**: Search keywords and industry tags to maximize LinkedIn recruiter discoverability.
10. **LinkedIn Gap Analysis & Optimization Score**: Compares CV evidence against current LinkedIn positioning with section strength breakdown (0–100 score).
11. **Profile Export Engine**: Download complete packages in Markdown (`.md`), sanitized JSON (`.json`), or browser-native A4 Printable PDF.
12. **Interactive Checklist & Manual Tracking**: 8-section update checklist with direct LinkedIn deep edit links and `applied_manually` progress tracking.

---

## 🤖 Supported AI Providers & BYOK Architecture

CV2LinkedIn AI operates with **zero recurring operational costs** via its client-driven BYOK (Bring Your Own Key) architecture:

1. **Supported Providers**:
   - **Google Gemini**: Fast multimodal & reasoning models from Google AI Studio (Free tier 15 RPM).
   - **OpenAI**: Industry-standard GPT and reasoning models (GPT-4o, etc.).
   - **DeepSeek**: Ultra cost-effective general chat and reasoning models (DeepSeek-V3, DeepSeek-R1).
2. **User API Key (BYOK — Preferred Mode)**:
   - Users provide their personal API key.
   - Keys are held strictly in temporary browser session memory (`sessionStorage`).
   - Dynamic model discovery queries available models for each key automatically.
3. **Developer / Demo Key (Optional Server Mode)**:
   - Self-hosters can configure optional server-side environment keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`).
   - Strict provider isolation ensures credentials are never shared across providers.
   - BYOK mode never silently falls back to server keys without explicit selection.

---

## 🔒 Privacy & Security Architecture

CV2LinkedIn AI is engineered with a strict **zero-storage, privacy-first** architecture:

- **In-Memory CV Processing**: Documents are read exclusively into volatile memory (`Buffer` in RAM) using worker-safe `unpdf` and `mammoth`. Uploaded files are **never** written to disk, databases, or object storage, and are immediately discarded after processing.
- **Session-Only BYOK**: User API keys exist only in volatile tab memory (`sessionStorage`). They are never saved to `localStorage`, databases, or external analytics.
- **Direct Transmission**: API keys are forwarded directly to upstream providers only when executing active requests.
- **Strict Error Sanitization**: All exception handlers redact API keys (`AIzaSy...`, `sk-...` → `[REDACTED]`). Keys and CV contents are never output to server console logs.
- **No Third-Party Tracking**: Zero analytics libraries, trackers, or telemetry SDKs.

---

## 🌐 LinkedIn Integration & Compliance Truth

### Official OAuth Limitations
- Current self-serve LinkedIn Developer access allows **OpenID Connect (OIDC)** basic identity authentication (`openid`, `profile`, `email`).
- LinkedIn's member profile write APIs require enterprise **LinkedIn Partner Program** approval (Talent Solutions) and are **not available** for personal self-serve accounts.
- CV2LinkedIn AI strictly adheres to LinkedIn developer policies:
  - **No Scraping**: Never scrapes LinkedIn pages or uses headless browser automation.
  - **No Password Collection**: Never asks for or stores LinkedIn passwords.
  - **No Unofficial APIs**: Never calls undocumented endpoints or attempts stealth write-back.

### Safe Manual Application Workflow
To apply improvements safely to your personal profile:
1. **Connect or Paste Profile**: Import basic identity via OAuth or paste your existing LinkedIn text.
2. **AI Gap Analysis**: Review section-by-section suggestions with CV evidence verification.
3. **Copy & Open**: Click **[Copy]** or **[Copy & Open LinkedIn ↗]** to jump straight to the exact section editor on LinkedIn.
4. **Apply on LinkedIn**: Paste the approved content directly into your profile.
5. **Mark as Manually Updated**: Track your progress in the 8-section update checklist.

---

## 📄 Supported CV Formats

- **File Types**: Adobe PDF (`.pdf`) and Microsoft Word (`.docx`).
- **Maximum File Size**: 5MB.
- **Text Layer Requirement**: Documents must contain selectable text. Image-only scans without OCR text are rejected with an actionable message.

---

## ⚙️ Environment Variables

All environment variables are **optional**. The application operates 100% in BYOK mode without any configured server-side variables:

| Variable | Type | Required | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | String | **Optional** | Server-side Gemini API key for Developer / Demo mode. |
| `OPENAI_API_KEY` | String | **Optional** | Server-side OpenAI API key for Developer / Demo mode. |
| `DEEPSEEK_API_KEY` | String | **Optional** | Server-side DeepSeek API key for Developer / Demo mode. |
| `DEFAULT_AI_PROVIDER` | String | **Optional** | Default AI provider when Developer mode is selected (defaults to `gemini`). |
| `LINKEDIN_CLIENT_ID` | String | **Optional** | LinkedIn Developer App Client ID for Sign in with LinkedIn OIDC. |
| `LINKEDIN_CLIENT_SECRET` | String | **Optional** | LinkedIn Developer App Client Secret. |
| `LINKEDIN_REDIRECT_URI` | String | **Optional** | OAuth callback URL (defaults to `${NEXT_PUBLIC_APP_URL}/api/linkedin/callback`). |
| `LINKEDIN_SESSION_SECRET` | String | **Optional** | 32+ char secret for signing httpOnly session cookies (required in production if OAuth enabled). |
| `MAX_FILE_SIZE_MB` | Number | **Optional** | Maximum file upload size in MB (defaults to `5`). |

A template file is provided at [`.env.example`](.env.example).

---

## 🚀 Running Locally

### 1. Prerequisites
- Node.js 20.x or higher
- npm

### 2. Installation
```bash
git clone https://github.com/iamneyamat/cv2linkedin-ai.git
cd cv2linkedin-ai
npm install
```

### 3. Optional Environment Configuration
```bash
cp .env.example .env.local
# Edit .env.local if you wish to configure optional server-side developer keys
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Running Tests & Production Build
```bash
# Run unit & integration test suite (137 tests)
npm test

# Check TypeScript types
npx tsc --noEmit

# Run Next.js production build
npm run build

# Start production server
npm start -- -p 3005
```

---

## ☁️ Deploying to Vercel

CV2LinkedIn AI is fully optimized for **Vercel**:

1. Push your repository to **GitHub**.
2. Go to [Vercel Dashboard](https://vercel.com/) and click **Add New Project**.
3. Import your `cv2linkedin-ai` repository.
4. **Build & Output Settings**:
   - Framework: **Next.js**
   - Build Command: `npm run build`
   - Install Command: `npm install`
5. **Environment Variables**:
   - If running strictly in BYOK mode: **No environment variables needed**.
   - If enabling Sign in with LinkedIn: Set `LINKEDIN_SESSION_SECRET` (generate with `openssl rand -base64 32`).
   - If providing shared demo keys: Add `GEMINI_API_KEY`, `OPENAI_API_KEY`, or `DEEPSEEK_API_KEY`.
6. Click **Deploy**.

---

## 📄 License

MIT License. Open-source and free for personal and commercial use.
