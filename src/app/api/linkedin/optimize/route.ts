import { NextRequest, NextResponse } from 'next/server';
import { getAIProvider } from '@/lib/ai/factory';
import { resolveEffectiveAICredentials } from '@/lib/ai/server-credentials';
import { buildLinkedInOptimizationPrompt } from '@/lib/ai/prompts/linkedin-optimization';
import { validateAndNormalizeOptimizationOutput } from '@/lib/optimization/engine';
import { normalizeAppError, sanitizeSecrets } from '@/lib/ai/error-normalizer';
import { executeWithControlledRetry } from '@/lib/ai/retry';
import { checkDeveloperRateLimit } from '@/lib/ai/rate-limiter';
import { validateProviderAndMode, validateCVText } from '@/lib/ai/validation';
import { LinkedInProfileData } from '@/lib/linkedin/types';
import { AIProviderId } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function executeOptimizationPrompt(
  providerName: AIProviderId,
  prompt: string,
  apiKey: string,
  model?: string
): Promise<string> {
  if (providerName === 'gemini') {
    const targetModel = model || 'gemini-2.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: 'application/json', temperature: 0.2 }
      })
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const err = new Error(`Gemini error (HTTP ${res.status}): ${errText}`);
      (err as { status?: number }).status = res.status;
      throw err;
    }
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  if (providerName === 'openai' || providerName === 'deepseek') {
    const endpoint =
      providerName === 'openai'
        ? 'https://api.openai.com/v1/chat/completions'
        : 'https://api.deepseek.com/chat/completions';
    const targetModel = model || (providerName === 'openai' ? 'gpt-4o-mini' : 'deepseek-chat');
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const err = new Error(`${providerName} error (HTTP ${res.status}): ${errText}`);
      (err as { status?: number }).status = res.status;
      throw err;
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || '';
  }

  throw new Error(`Unsupported provider: ${providerName}`);
}

export async function POST(req: NextRequest) {
  let clientKey: string | undefined;
  let resolvedKey: string | undefined;
  let normalizedMode: 'user' | 'default' = 'user';
  let providerName: AIProviderId = 'gemini';

  try {
    const body = await req.json().catch(() => ({}));
    const rawCvText = typeof body.cvText === 'string' ? body.cvText.trim() : '';
    const linkedinProfile = (body.linkedinProfile as LinkedInProfileData) || {};
    const rawProvider = (body.provider as string) || 'gemini';
    const model = typeof body.model === 'string' ? body.model.trim() : undefined;
    clientKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : undefined;
    const rawMode = (body.mode as string) || 'byok';

    // 1. Validate CV Text
    let cvText: string;
    try {
      cvText = validateCVText(rawCvText);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'CV_TEXT_REQUIRED',
          message: 'Valid CV text with at least 40 characters is required for comparison.'
        },
        { status: 400 }
      );
    }

    // 2. Validate Provider & Mode
    const validated = validateProviderAndMode(rawProvider, rawMode, clientKey);
    providerName = validated.provider;
    normalizedMode = (validated.mode === 'developer' || validated.mode === 'default') ? 'default' : 'user';

    // 3. Abuse & Rate Limit Protection for Developer / Demo Mode
    if (normalizedMode === 'default') {
      const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                       req.headers.get('x-real-ip') ||
                       '127.0.0.1';
      const rateLimitCheck = checkDeveloperRateLimit(clientIp, 15, 60000);
      if (!rateLimitCheck.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: 'RATE_LIMITED',
            message: 'Trial AI service is temporarily rate-limited. Please wait a moment or use your own API key.'
          },
          { status: 429 }
        );
      }
    }

    // 4. Resolve Provider
    const provider = getAIProvider(providerName);

    // 5. Resolve Effective API Key using Centralized Resolver
    let credentials;
    try {
      credentials = resolveEffectiveAICredentials({
        provider: provider.id as AIProviderId,
        mode: normalizedMode,
        userApiKey: clientKey
      });
      resolvedKey = credentials.apiKey;
    } catch (credErr: unknown) {
      const normalized = normalizeAppError(credErr, {
        provider: providerName,
        mode: normalizedMode,
        keysToRedact: [clientKey]
      });
      return NextResponse.json(
        {
          success: false,
          error: normalized.code,
          message: normalized.message
        },
        { status: normalized.statusCode }
      );
    }

    // 6. Build Unified Prompt
    const prompt = buildLinkedInOptimizationPrompt(cvText, linkedinProfile);

    // 7. Invoke Provider with Controlled Retry (Max 1 retry for transient faults)
    let rawResponse: string;
    try {
      const { result } = await executeWithControlledRetry(
        () => executeOptimizationPrompt(providerName, prompt, credentials.apiKey, model),
        {
          maxRetries: 1,
          delayMs: 600,
          provider: providerName,
          mode: normalizedMode
        }
      );
      rawResponse = result;
    } catch (apiErr: unknown) {
      const normalized = normalizeAppError(apiErr, {
        provider: providerName,
        mode: normalizedMode,
        keysToRedact: [clientKey, resolvedKey]
      });
      return NextResponse.json(
        {
          success: false,
          error: normalized.code,
          message: normalized.message
        },
        { status: normalized.statusCode }
      );
    }

    // 8. Validate & Normalize Output
    try {
      const result = validateAndNormalizeOptimizationOutput(rawResponse);
      return NextResponse.json({
        success: true,
        result
      });
    } catch (parseErr: unknown) {
      const rawMsg = parseErr instanceof Error ? parseErr.message : 'Failed to parse optimization response';
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_AI_RESPONSE',
          message: sanitizeSecrets(rawMsg, [clientKey, resolvedKey])
        },
        { status: 502 }
      );
    }
  } catch (err: unknown) {
    const normalized = normalizeAppError(err, {
      provider: providerName,
      mode: normalizedMode,
      keysToRedact: [clientKey, resolvedKey]
    });
    return NextResponse.json(
      {
        success: false,
        error: normalized.code,
        message: normalized.message
      },
      { status: normalized.statusCode }
    );
  }
}
