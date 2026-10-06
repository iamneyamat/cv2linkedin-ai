import { NextResponse } from 'next/server';
import { getLinkedInCapabilities } from '@/lib/linkedin/capabilities';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const capabilities = getLinkedInCapabilities();
    return NextResponse.json({
      success: true,
      capabilities
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to query capabilities';
    return NextResponse.json(
      {
        success: false,
        error: 'CAPABILITY_QUERY_ERROR',
        message
      },
      { status: 500 }
    );
  }
}
