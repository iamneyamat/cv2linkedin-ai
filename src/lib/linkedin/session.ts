import crypto from 'node:crypto';
import type { LinkedInSessionData, LinkedInMemberIdentity } from './types.ts';

export const LINKEDIN_SESSION_COOKIE_NAME =
  process.env.NODE_ENV === 'production' ? '__Host-cv2li_session' : 'cv2li_session';

export const LINKEDIN_OAUTH_STATE_COOKIE_NAME =
  process.env.NODE_ENV === 'production' ? '__Host-cv2li_oauth_state' : 'cv2li_oauth_state';

// Fallback session key for development only (when LINKEDIN_SESSION_SECRET is omitted)
const DEV_FALLBACK_SECRET = 'cv2linkedin-default-dev-session-encryption-secret-key-32chars!';

/**
 * Returns the session encryption secret key.
 */
export function getLinkedInSessionSecret(): string {
  return process.env.LINKEDIN_SESSION_SECRET || DEV_FALLBACK_SECRET;
}

/**
 * Derives a 32-byte key from a secret string using SHA-256.
 */
function deriveKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts and authenticates session data using AES-256-GCM.
 * Ensures access tokens are never exposed or readable in transit or cookies.
 */
export function sealSession(data: LinkedInSessionData, secret: string = getLinkedInSessionSecret()): string {
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const serialized = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(serialized, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

/**
 * Decrypts and authenticates a sealed session string.
 * Returns null if the session is tampered with, expired, or invalid.
 */
export function unsealSession(sealed: string, secret: string = getLinkedInSessionSecret()): LinkedInSessionData | null {
  if (!sealed || typeof sealed !== 'string') return null;

  const parts = sealed.split('.');
  if (parts.length !== 3) return null;

  try {
    const [ivB64, tagB64, dataB64] = parts;
    const iv = Buffer.from(ivB64, 'base64url');
    const tag = Buffer.from(tagB64, 'base64url');
    const encrypted = Buffer.from(dataB64, 'base64url');

    if (iv.length !== 12 || tag.length !== 16) return null;

    const key = deriveKey(secret);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const session = JSON.parse(decrypted.toString('utf8')) as LinkedInSessionData;

    // Check expiration
    if (session.expiresAt && Date.now() > session.expiresAt) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Strips sensitive tokens and returns only the public member identity.
 * Guarantee: Zero access tokens or refresh tokens are returned to the client.
 */
export function sanitizeMemberIdentity(session: LinkedInSessionData): LinkedInMemberIdentity {
  return {
    id: session.member?.id || 'unknown',
    name: session.member?.name || 'LinkedIn Member',
    email: session.member?.email,
    picture: session.member?.picture,
    connectedAt: session.member?.connectedAt || new Date().toISOString()
  };
}
