import { NextRequest, NextResponse } from 'next/server';
import { getAIProvider } from '@/lib/ai/factory';
import { resolveEffectiveAICredentials } from '@/lib/ai/server-credentials';
import { AIProviderId } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sanitize(text: string, keys: (string | undefined)[]): string {
  let res = text || '';
  for (const key of keys) {
    if (key && key.length > 3) {
      res = res.split(key).join('[REDACTED]');
    }
  }
  res = res.replace(/AIzaSy[a-zA-Z0-9_-]{20,}/g, '[REDACTED]');
  res = res.replace(/sk-[a-zA-Z0-9_-]{20,}/g, '[REDACTED]');
  return res;
}

export async function POST(req: NextRequest) {
  let clientKey: string | undefined;
  let resolvedKey: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    const rawMode = body.mode as 'user' | 'developer' | 'byok' | 'default' | undefined;
    const providerName = (body.provider as string) || 'gemini';
    clientKey = (body.apiKey as string | undefined)?.trim();

    // 1. Resolve Provider
    let provider;
    try {
      provider = getAIProvider(providerName);
    } catch (providerErr: unknown) {
      const msg = providerErr instanceof Error ? providerErr.message : 'Invalid AI provider';
      return NextResponse.json(
        {
          success: false,
          error: sanitize(msg, [clientKey]),
          errorCode: 'UNSUPPORTED_PROVIDER'
        },
        { status: 400 }
      );
    }

    // 2. Resolve Effective API Key using Centralized Resolver
    let credentials;
    try {
      credentials = resolveEffectiveAICredentials({
        provider: provider.id as AIProviderId,
        mode: rawMode,
        userApiKey: clientKey
      });
      resolvedKey = credentials.apiKey;
    } catch (credErr: unknown) {
      const msg = credErr instanceof Error ? credErr.message : 'Credential resolution failed';
      const code = (credErr as { code?: string })?.code || 'CREDENTIAL_ERROR';
      return NextResponse.json(
        {
          success: false,
          error: sanitize(msg, [clientKey]),
          errorCode: code
        },
        { status: 400 }
      );
    }

    // 3. Discover Available Models dynamically
    try {
      const models = await provider.discoverModels({
        apiKey: credentials.apiKey
      });

      // Strict privacy: never return the API key, return only safe model metadata
      return NextResponse.json({
        success: true,
        provider: provider.id,
        models
      });
    } catch (discErr: unknown) {
      const normalized = provider.normalizeError(discErr);
      const cleanMsg = sanitize(normalized.error, [clientKey, resolvedKey]);

      return NextResponse.json(
        {
          success: false,
          error: cleanMsg,
          errorCode: normalized.errorCode
        },
        { status: normalized.statusCode }
      );
    }
  } catch (error: unknown) {
    const rawMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      {
        success: false,
        error: sanitize(rawMsg, [clientKey, resolvedKey]),
        errorCode: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}
