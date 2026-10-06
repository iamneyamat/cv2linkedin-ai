import { NextResponse } from 'next/server';
import { getServerAIConfig } from '@/lib/ai/server-credentials';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = getServerAIConfig();

    return NextResponse.json(config, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve AI configuration';
    return NextResponse.json(
      { error: message, errorCode: 'CONFIG_ERROR' },
      { status: 500 }
    );
  }
}
