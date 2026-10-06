import { NextRequest, NextResponse } from 'next/server';
import { extractCVText } from '@/lib/cv/extract';
import { getAIProvider } from '@/lib/ai/factory';
import { resolveEffectiveAICredentials } from '@/lib/ai/server-credentials';
import { normalizeAppError, sanitizeSecrets } from '@/lib/ai/error-normalizer';
import { executeWithControlledRetry } from '@/lib/ai/retry';
import { checkDeveloperRateLimit } from '@/lib/ai/rate-limiter';
import { validateProviderAndMode, validateModelChoice, validateCVText } from '@/lib/ai/validation';
import { GenerateProfileResponse, AIMode } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Up to 60s for Vercel Hobby

export async function POST(req: NextRequest): Promise<NextResponse<GenerateProfileResponse>> {
  let clientApiKey: string | undefined;
  let resolvedKey: string | undefined;
  let normalizedMode: 'user' | 'default' = 'user';
  let providerName = 'gemini';

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    clientApiKey = (formData.get('apiKey') as string | null)?.trim() || undefined;
    const rawModel = (formData.get('model') as string | null)?.trim();
    const rawMode = (formData.get('mode') as string | null) || 'byok';
    const rawProvider = (formData.get('provider') as string | null)?.trim() || 'gemini';

    // 1. Validate File presence
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No CV document was uploaded.', errorCode: 'PARSER_ERROR' },
        { status: 400 }
      );
    }

    // 2. Validate Provider & Mode
    const validated = validateProviderAndMode(rawProvider, rawMode, clientApiKey);
    providerName = validated.provider;
    normalizedMode = (validated.mode === 'developer' || validated.mode === 'default') ? 'default' : 'user';

    // 3. Rate Limit / Abuse Protection for Developer / Demo Mode
    if (normalizedMode === 'default') {
      const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                       req.headers.get('x-real-ip') ||
                       '127.0.0.1';
      const rateLimitCheck = checkDeveloperRateLimit(clientIp, 15, 60000);
      if (!rateLimitCheck.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: 'Trial AI service is temporarily rate-limited. Please wait a moment or use your own API key.',
            errorCode: 'RATE_LIMITED'
          },
          { status: 429 }
        );
      }
    }

    // 4. Resolve AI Provider Instance
    const aiProvider = getAIProvider(providerName);

    // 5. Resolve Effective API Key via Server Credentials Resolver
    let credentials;
    try {
      credentials = resolveEffectiveAICredentials({
        provider: aiProvider.id,
        mode: normalizedMode,
        userApiKey: clientApiKey
      });
      resolvedKey = credentials.apiKey;
    } catch (credErr: unknown) {
      const normalized = normalizeAppError(credErr, {
        provider: providerName,
        mode: normalizedMode,
        keysToRedact: [clientApiKey]
      });
      return NextResponse.json(
        {
          success: false,
          error: normalized.message,
          errorCode: normalized.code
        },
        { status: normalized.statusCode }
      );
    }

    const modeUsed: AIMode = credentials.credentialSource === 'default' ? 'default' : 'byok';

    // 6. Validate Selected Model Choice
    const model = validateModelChoice(rawModel, aiProvider.id);

    // 7. In-Memory CV Text Extraction & Validation
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = '';
    try {
      const parseResult = await extractCVText(buffer, file.name);
      extractedText = validateCVText(parseResult.text);
    } catch (parseError: unknown) {
      const rawMsg = parseError instanceof Error ? parseError.message : String(parseError);
      return NextResponse.json(
        {
          success: false,
          error: sanitizeSecrets(rawMsg, [clientApiKey, resolvedKey]),
          errorCode: 'PARSER_ERROR'
        },
        { status: 400 }
      );
    }

    // 8. Execute Profile Generation with Controlled Retry (Max 1 retry for transient faults)
    try {
      const { result: profilePackage } = await executeWithControlledRetry(
        () =>
          aiProvider.generateLinkedInProfile(extractedText, {
            apiKey: credentials.apiKey,
            model
          }),
        {
          maxRetries: 1,
          delayMs: 600,
          provider: providerName,
          mode: normalizedMode
        }
      );

      return NextResponse.json({
        success: true,
        data: profilePackage,
        modeUsed
      });
    } catch (aiError: unknown) {
      const normalized = normalizeAppError(aiError, {
        provider: providerName,
        mode: normalizedMode,
        keysToRedact: [clientApiKey, resolvedKey]
      });

      return NextResponse.json(
        {
          success: false,
          error: normalized.message,
          errorCode: normalized.code
        },
        { status: normalized.statusCode }
      );
    }
  } catch (globalError: unknown) {
    const normalized = normalizeAppError(globalError, {
      provider: providerName,
      mode: normalizedMode,
      keysToRedact: [clientApiKey, resolvedKey]
    });

    return NextResponse.json(
      {
        success: false,
        error: normalized.message,
        errorCode: normalized.code
      },
      { status: normalized.statusCode }
    );
  }
}
