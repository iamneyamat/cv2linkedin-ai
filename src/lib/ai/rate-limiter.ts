/**
 * In-Memory Request Throttler & Abuse Protection Layer
 *
 * Designed to safeguard server-side Developer / Demo API quotas
 * from automated abuse, bursts, or denial-of-wallet.
 *
 * NOTE FOR DISTRIBUTED PRODUCTION:
 * This in-memory implementation serves local and single-instance deployments.
 * Production multi-instance deployments should use distributed token buckets
 * (e.g., Upstash Redis, Cloudflare Rate Limiting).
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up expired entries every 5 minutes to avoid memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function purgeExpiredRecords(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

/**
 * Checks and increments rate limit for Developer / Demo mode requests.
 * @param identifier Client IP or session token
 * @param maxRequests Maximum requests allowed within the window (default: 15)
 * @param windowMs Time window in milliseconds (default: 60,000ms = 1 min)
 */
export function checkDeveloperRateLimit(
  identifier: string,
  maxRequests: number = 15,
  windowMs: number = 60000
): RateLimitResult {
  const now = Date.now();
  purgeExpiredRecords(now);

  const cleanId = (identifier || 'anonymous').trim();
  const existing = rateLimitStore.get(cleanId);

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(cleanId, {
      count: 1,
      resetAt: now + windowMs
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetSeconds: Math.ceil(windowMs / 1000)
    };
  }

  if (existing.count >= maxRequests) {
    const resetSeconds = Math.ceil((existing.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetSeconds: Math.max(resetSeconds, 1)
    };
  }

  existing.count += 1;
  const resetSeconds = Math.ceil((existing.resetAt - now) / 1000);
  return {
    allowed: true,
    remaining: maxRequests - existing.count,
    resetSeconds: Math.max(resetSeconds, 1)
  };
}

/**
 * Helper to reset rate limits (primarily for testing).
 */
export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}
