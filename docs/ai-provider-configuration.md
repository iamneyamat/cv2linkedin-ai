# AI Provider Server Configuration Guide

This guide describes how to configure server-side environment credentials for the **Developer / Demo Key** mode in **CV2LinkedIn AI**.

---

## Architecture Overview

CV2LinkedIn AI features a dual-mode credential model:

1. **User API Key (BYOK) [Default & Preferred]:**
   Users provide their personal API keys in the browser session. Keys remain strictly within temporary browser tab memory and are never saved in databases or logs.
2. **Developer / Demo Key (Server Environment):**
   The application operator can provide server-side API keys in `.env.local` to allow trial/demo users to explore the app without entering a key. These keys reside strictly in the server runtime environment and are never leaked or transmitted to client browsers.

---

## 1. Create `.env.local`

In the root of the project, create a `.env.local` file by copying the template:

```bash
cp .env.example .env.local
```

> **Security Note:** `.env.local` is listed in `.gitignore` and must **never** be committed to version control.

---

## 2. Add Provider Keys

CV2LinkedIn AI strictly isolates provider credentials. Generic API keys (such as `AI_API_KEY`) are not used or supported.

Set one or more provider-specific keys in `.env.local`:

```env
# Google Gemini (Google AI Studio)
GEMINI_API_KEY=your_gemini_api_key_here

# OpenAI (OpenAI Platform)
OPENAI_API_KEY=your_openai_api_key_here

# DeepSeek (DeepSeek Platform)
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

---

## 3. Set `DEFAULT_AI_PROVIDER`

Specify which provider should be selected as the primary server fallback:

```env
DEFAULT_AI_PROVIDER=gemini
```

Supported values:
- `gemini`
- `openai`
- `deepseek`

If `DEFAULT_AI_PROVIDER` is unset or points to an unconfigured provider, the server automatically resolves the first configured provider (preferring Gemini).

---

## 4. Restart Server

Environment variables in Node.js / Next.js are loaded at process startup. After making any changes to `.env.local`, restart your local server:

```bash
# Production server on port 3005:
npm run build
npm run start -- -p 3005

# Or development server:
npm run dev
```

---

## 5. Open AI Settings

1. Open `http://localhost:3005` in your browser.
2. Click **AI Settings** in the header or locate the inline **AI Engine Configuration** panel above the CV dropzone.

---

## 6. Select "Developer / Demo Key"

Click the **Developer / Demo Key** mode card.
- If the selected provider is configured on the server, you will see:
  - `✓ Developer / Demo Key Available`
  - *"Using the server-configured AI provider."*
  - *"Trial access may be limited by provider quota and availability."*
- If the provider is not configured, you will see:
  - *"Developer / Demo AI is not configured for this provider."*
  - *"Please configure the provider API key in .env.local."*

---

## 7. Test Server Key

Click **Test Server Key**.
- The server will execute a live validation probe to verify the environment credential.
- Notice: The actual API key is **never** sent to or received by the browser. Only the safe verification status is returned.

---

## 8. Refresh Models

Click **Refresh Models**.
- The dynamic model discovery engine queries the provider and displays only models accessible with the active server key.
- The recommended model is selected automatically.

---

## 9. Changing an API Key

To rotate or update an environment API key:
1. Open `.env.local`.
2. Replace the existing key:
   ```env
   GEMINI_API_KEY=your_new_key_here
   ```
3. Save `.env.local`.

---

## 10. Restart Server

Restart the Node.js process:
```bash
npm run start -- -p 3005
```
No application source code modification is needed.

---

## 11. Verify New Key

1. Refresh `http://localhost:3005`.
2. Open AI Settings and click **Test Server Key**.
3. Verify that the new key is validated and models are dynamically discovered.

---

## 12. Security Checklist & Git Safety

- [x] Verify `.gitignore` contains `.env`, `.env.local`, and `.env*.local`.
- [x] Run `git status --short` to ensure `.env.local` is untracked.
- [x] Never log, echo, or transmit provider credentials to client components.
- [x] Client endpoints (`GET /api/ai/config`) expose only `{ configured: boolean }` flags.
