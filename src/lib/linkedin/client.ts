import crypto from 'node:crypto';
import type { LinkedInOAuthTokenResponse, LinkedInUserInfo } from './types.ts';

export const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
export const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
export const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

/**
 * Checks whether LinkedIn OAuth credentials are fully configured on the server.
 */
export function isLinkedInConfigured(): boolean {
  const clientId = process.env.LINKEDIN_CLIENT_ID?.trim();
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET?.trim();
  return Boolean(clientId && clientSecret);
}

/**
 * Retrieves the configured LinkedIn Client ID.
 */
export function getLinkedInClientId(): string {
  return process.env.LINKEDIN_CLIENT_ID?.trim() || '';
}

/**
 * Retrieves the configured LinkedIn Client Secret.
 * Never exposed to the browser.
 */
export function getLinkedInClientSecret(): string {
  return process.env.LINKEDIN_CLIENT_SECRET?.trim() || '';
}

/**
 * Retrieves the configured or derived Redirect URI.
 */
export function getLinkedInRedirectUri(reqOrigin?: string): string {
  if (process.env.LINKEDIN_REDIRECT_URI?.trim()) {
    return process.env.LINKEDIN_REDIRECT_URI.trim();
  }
  const host = reqOrigin || 'http://localhost:3005';
  return `${host}/api/linkedin/callback`;
}

/**
 * Generates a cryptographically strong, random CSRF state string.
 */
export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Validates the CSRF state parameter from the callback against the session cookie.
 */
export function validateOAuthState(stateFromParam?: string, stateFromCookie?: string): boolean {
  if (!stateFromParam || !stateFromCookie) return false;
  if (typeof stateFromParam !== 'string' || typeof stateFromCookie !== 'string') return false;
  if (stateFromParam.length < 16 || stateFromCookie.length < 16) return false;

  try {
    const bufA = Buffer.from(stateFromParam);
    const bufB = Buffer.from(stateFromCookie);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return stateFromParam === stateFromCookie;
  }
}

/**
 * Builds the official 3-legged LinkedIn OAuth authorization URL.
 * Requests standard OpenID Connect scopes: openid, profile, email.
 */
export function buildLinkedInAuthUrl(state: string, redirectUri: string): string {
  const clientId = getLinkedInClientId();
  if (!clientId) {
    throw new Error('LINKEDIN_NOT_CONFIGURED: Missing LINKEDIN_CLIENT_ID environment variable.');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: 'openid profile email'
  });

  return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchanges the temporary authorization code for an OAuth 2.0 access token.
 * Strictly executes server-side to keep client_secret confidential.
 */
export function exchangeLinkedInAuthCode(
  code: string,
  redirectUri: string
): Promise<LinkedInOAuthTokenResponse> {
  const clientId = getLinkedInClientId();
  const clientSecret = getLinkedInClientSecret();

  if (!clientId || !clientSecret) {
    return Promise.reject(new Error('LINKEDIN_NOT_CONFIGURED: Missing LinkedIn client credentials.'));
  }

  const bodyParams = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret
  });

  return fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: bodyParams.toString()
  }).then(async res => {
    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      let sanitizedMessage = `LinkedIn token exchange failed (HTTP ${res.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error_description) {
          sanitizedMessage = `LinkedIn token exchange failed: ${errorJson.error_description}`;
        } else if (errorJson.error) {
          sanitizedMessage = `LinkedIn token exchange failed: ${errorJson.error}`;
        }
      } catch {
        // fallback
      }
      throw new Error(sanitizedMessage);
    }
    return (await res.json()) as LinkedInOAuthTokenResponse;
  });
}

/**
 * Fetches the authenticated member's OIDC profile from LinkedIn's UserInfo endpoint.
 * Returns member ID, name, email, picture, and locale.
 */
export function fetchLinkedInUserInfo(accessToken: string): Promise<LinkedInUserInfo> {
  return fetch(LINKEDIN_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }).then(async res => {
    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      let sanitizedMessage = `LinkedIn userinfo fetch failed (HTTP ${res.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          sanitizedMessage = `LinkedIn userinfo fetch failed: ${errorJson.message}`;
        }
      } catch {
        // fallback
      }
      throw new Error(sanitizedMessage);
    }
    return (await res.json()) as LinkedInUserInfo;
  });
}
