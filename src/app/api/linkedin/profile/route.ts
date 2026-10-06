import { NextRequest, NextResponse } from 'next/server';
import { fetchLinkedInUserInfo } from '@/lib/linkedin/client';
import { normalizeLinkedInProfile } from '@/lib/linkedin/normalize';
import {
  unsealSession,
  sanitizeMemberIdentity,
  LINKEDIN_SESSION_COOKIE_NAME
} from '@/lib/linkedin/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get(LINKEDIN_SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return NextResponse.json(
      {
        success: false,
        error: 'NOT_AUTHENTICATED',
        message: 'No active LinkedIn session found. Please connect your LinkedIn account first.'
      },
      { status: 401 }
    );
  }

  const session = unsealSession(sessionCookie);
  if (!session || !session.accessToken) {
    return NextResponse.json(
      {
        success: false,
        error: 'SESSION_EXPIRED',
        message: 'Your LinkedIn session has expired. Please reconnect.'
      },
      { status: 401 }
    );
  }

  try {
    // 1. Fetch authenticated member data from official LinkedIn endpoint
    const rawUserInfo = await fetchLinkedInUserInfo(session.accessToken);

    // 2. Normalize raw payload into provider-independent schema (strict zero fabrication)
    const normalizedProfile = normalizeLinkedInProfile(rawUserInfo);

    // 3. Return sanitized profile with member identity and ZERO tokens
    return NextResponse.json({
      success: true,
      profile: normalizedProfile,
      member: sanitizeMemberIdentity(session)
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve LinkedIn profile';
    return NextResponse.json(
      {
        success: false,
        error: 'LINKEDIN_API_ERROR',
        message
      },
      { status: 502 }
    );
  }
}
