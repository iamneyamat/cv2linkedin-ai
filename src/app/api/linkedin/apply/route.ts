import { NextRequest, NextResponse } from 'next/server';
import { executeApplyProfileChanges } from '@/lib/linkedin/apply';
import { fetchLinkedInUserInfo } from '@/lib/linkedin/client';
import { normalizeLinkedInProfile } from '@/lib/linkedin/normalize';
import { unsealSession, LINKEDIN_SESSION_COOKIE_NAME } from '@/lib/linkedin/session';
import type { LinkedInProfileData } from '@/lib/linkedin/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // 1. Session verification
  const sessionCookie = req.cookies.get(LINKEDIN_SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) {
    return NextResponse.json(
      {
        success: false,
        code: 'NOT_AUTHENTICATED',
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
        code: 'SESSION_EXPIRED',
        message: 'Your LinkedIn session has expired. Please reconnect.'
      },
      { status: 401 }
    );
  }

  // 2. Parse request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        code: 'INVALID_JSON',
        message: 'Invalid JSON request payload.'
      },
      { status: 400 }
    );
  }

  const changes = (body as { changes?: unknown[] })?.changes;
  if (!Array.isArray(changes) || changes.length === 0) {
    return NextResponse.json(
      {
        success: false,
        code: 'INVALID_REQUEST',
        message: 'No changes provided in request.'
      },
      { status: 400 }
    );
  }

  // 3. Attempt to fetch current LinkedIn profile for optimistic concurrency check
  let currentProfile: LinkedInProfileData | undefined;
  try {
    const rawUserInfo = await fetchLinkedInUserInfo(session.accessToken);
    currentProfile = normalizeLinkedInProfile(rawUserInfo);
  } catch {
    // If current profile cannot be retrieved, currentProfile remains undefined
    // (concurrency check will not pretend to verify what it cannot read)
  }

  // 4. Execute apply operation with capability & concurrency protection
  const execution = await executeApplyProfileChanges({
    session,
    changes: changes as any,
    currentProfile
  });

  if (!execution.success) {
    const status =
      execution.errorCode === 'LINKEDIN_WRITE_ACCESS_REQUIRED' ? 403 :
      execution.errorCode === 'CONCURRENCY_CONFLICT' ? 409 : 400;

    return NextResponse.json(
      {
        success: false,
        code: execution.errorCode || 'APPLY_FAILED',
        message: execution.message || 'Direct LinkedIn profile updates require additional API access.',
        results: execution.results
      },
      { status }
    );
  }

  return NextResponse.json({
    success: true,
    results: execution.results
  });
}
