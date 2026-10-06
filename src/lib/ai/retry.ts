/**
 * Controlled Retry Engine for AI Provider Requests
 *
 * Directives:
 * 1. At most ONE controlled retry for transient failures (429, 503, temporary network).
 * 2. NEVER retry authentication (401, 403), quota exhaustion, or client validation errors.
 * 3. Enforces capped delay (default 600ms).
 */

import { normalizeAppError } from './error-normalizer.ts';

export interface RetryOptions {
  maxRetries?: number; // Strict default: 1
  delayMs?: number;    // Default: 600ms
  provider?: string;
  mode?: 'developer' | 'byok' | 'user' | 'default';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executeWithControlledRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<{ result: T; retried: boolean }> {
  const maxRetries = Math.min(options.maxRetries ?? 1, 1); // Strictly enforce max 1 retry
  const delayMs = options.delayMs ?? 600;

  try {
    const result = await operation();
    return { result, retried: false };
  } catch (err: unknown) {
    const normalized = normalizeAppError(err, {
      provider: options.provider,
      mode: options.mode
    });

    // Only retry if marked retryable (RATE_LIMITED, PROVIDER_UNAVAILABLE, NETWORK_ERROR, TIMEOUT)
    // NEVER retry QUOTA_EXHAUSTED, INVALID_API_KEY, FORBIDDEN, etc.
    if (!normalized.retryable || maxRetries < 1) {
      throw err;
    }

    // Wait short controlled delay before single retry
    await sleep(delayMs);

    // Final attempt: if this fails, error will bubble up directly
    const result = await operation();
    return { result, retried: true };
  }
}
