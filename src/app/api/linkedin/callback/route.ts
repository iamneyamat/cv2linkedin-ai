import { NextRequest, NextResponse } from 'next/server';
import {
  validateOAuthState,
  exchangeLinkedInAuthCode,
  fetchLinkedInUserInfo,
  getLinkedInRedirectUri
} from '@/lib/linkedin/client';
import { normalizeLinkedInUserInfo } from '@/lib/linkedin/normalize';
import {
  sealSession,
  LINKEDIN_SESSION_COOKIE_NAME,
  LINKEDIN_OAUTH_STATE_COOKIE_NAME
} from '@/lib/linkedin/session';
import { LinkedInSessionData } from '@/lib/linkedin/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const searchParams = req.nextUrl.searchParams;

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle provider cancellation / consent denial
  if (error) {
    const res = NextResponse.redirect(new URL('/?linkedin_error=consent_denied', origin));
    res.cookies.delete(LINKEDIN_OAUTH_STATE_COOKIE_NAME);
    return res;
  }

  // Validate CSRF state against secure httpOnly cookie
  const storedState = req.cookies.get(LINKEDIN_OAUTH_STATE_COOKIE_NAME)?.value;
  if (!state || !storedState || !validateOAuthState(state, storedState)) {
    const res = NextResponse.redirect(new URL('/?linkedin_error=invalid_state', origin));
    res.cookies.delete(LINKEDIN_OAUTH_STATE_COOKIE_NAME);
    return res;
  }

  // Validate presence of authorization code
  if (!code) {
    const res = NextResponse.redirect(new URL('/?linkedin_error=missing_code', origin));
    res.cookies.delete(LINKEDIN_OAUTH_STATE_COOKIE_NAME);
    return res;
  }

  try {
    const redirectUri = getLinkedInRedirectUri(origin);
    const tokenResponse = await exchangeLinkedInAuthCode(code, redirectUri);
    const userInfo = await fetchLinkedInUserInfo(tokenResponse.access_token);
    const member = normalizeLinkedInUserInfo(userInfo);

    const sessionData: LinkedInSessionData = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: Date.now() + (tokenResponse.expires_in || 3600) * 1000,
      member
    };

    const sealedSession = sealSession(sessionData);

    // Redirect to home page with success flag (NEVER put tokens in URL!)
    const response = NextResponse.redirect(new URL('/?linkedin=connected', origin));

    // Store encrypted session in httpOnly secure cookie
    response.cookies.set({
      name: LINKEDIN_SESSION_COOKIE_NAME,
      value: sealedSession,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: tokenResponse.expires_in || 3600 * 24 * 7 // Default 7 days
    });

    // Delete one-time CSRF state cookie
    response.cookies.delete(LINKEDIN_OAUTH_STATE_COOKIE_NAME);

    return response;
  } catch (err: unknown) {
    const response = NextResponse.redirect(new URL('/?linkedin_error=exchange_failed', origin));
    response.cookies.delete(LINKEDIN_OAUTH_STATE_COOKIE_NAME);
    return response;
  }
}
