import { NextResponse } from 'next/server';
import {
  LINKEDIN_SESSION_COOKIE_NAME,
  LINKEDIN_OAUTH_STATE_COOKIE_NAME
} from '@/lib/linkedin/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    connected: false,
    message: 'LinkedIn profile disconnected successfully.'
  });

  // Expire and remove session cookies
  response.cookies.delete(LINKEDIN_SESSION_COOKIE_NAME);
  response.cookies.delete(LINKEDIN_OAUTH_STATE_COOKIE_NAME);

  return response;
}

export async function GET() {
  return POST();
}
