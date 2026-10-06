import { NextRequest, NextResponse } from 'next/server';
import { isLinkedInConfigured } from '@/lib/linkedin/client';
import {
  unsealSession,
  sanitizeMemberIdentity,
  LINKEDIN_SESSION_COOKIE_NAME
} from '@/lib/linkedin/session';
import { LinkedInConnectionStatus } from '@/lib/linkedin/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const configured = isLinkedInConfigured();
  const sessionCookie = req.cookies.get(LINKEDIN_SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    const status: LinkedInConnectionStatus = {
      connected: false,
      configured
    };
    return NextResponse.json(status);
  }

  const session = unsealSession(sessionCookie);
  if (!session) {
    // Cookie is invalid or expired
    const response = NextResponse.json<LinkedInConnectionStatus>({
      connected: false,
      configured
    });
    response.cookies.delete(LINKEDIN_SESSION_COOKIE_NAME);
    return response;
  }

  // Valid session - return sanitized identity with zero tokens
  const status: LinkedInConnectionStatus = {
    connected: true,
    configured: true,
    member: sanitizeMemberIdentity(session)
  };

  return NextResponse.json(status);
}
