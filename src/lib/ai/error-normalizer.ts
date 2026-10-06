/**
 * Centralized AI Application Error Normalization Layer
 *
 * Normalizes all provider errors, HTTP status codes, network faults,
 * and timeouts into safe, typed application error codes and messages.
 *
 * CRITICAL SECURITY DIRECTIVES:
 * 1. ZERO credential leakage: strips any API keys, tokens, or auth headers.
 * 2. Never exposes raw upstream provider error payloads.
 * 3. Enforces distinct codes for RATE_LIMITED vs QUOTA_EXHAUSTED.
 */

export type AIAppErrorCode =
  | 'INVALID_API_KEY'
  | 'FORBIDDEN'
  | 'MODEL_NOT_FOUND'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'QUOTA_EXHAUSTED'
  | 'PROVIDER_UNAVAILABLE'
  | 'NETWORK_ERROR'
  | 'INVALID_AI_RESPONSE'
  | 'AI_NOT_CONFIGURED'
  | 'MISSING_USER_KEY'
  | 'UNSUPPORTED_PROVIDER'
  | 'INVALID_REQUEST';

export interface NormalizedAppError {
  code: AIAppErrorCode;
  message: string;
  statusCode: number;
  retryable: boolean;
}

export function sanitizeSecrets(text: string, keysToRedact: (string | undefined)[] = []): string {
  let res = text || '';
  for (const k of keysToRedact) {
    if (k && k.length > 3) {
      res = res.split(k).join('[REDACTED]');
    }
  }
  res = res.replace(/AIzaSy[a-zA-Z0-9_-]{20,}/g, '[REDACTED]');
  res = res.replace(/sk-[a-zA-Z0-9_-]{20,}/g, '[REDACTED]');
  res = res.replace(/bearer\s+[a-zA-Z0-9_.-]+/gi, 'Bearer [REDACTED]');
  return res;
}

/**
 * Normalizes any error from provider operations, HTTP responses, or runtime exceptions.
 */
export function normalizeAppError(
  error: unknown,
  context?: {
    provider?: string;
    mode?: 'developer' | 'byok' | 'user' | 'default';
    keysToRedact?: (string | undefined)[];
  }
): NormalizedAppError {
  const providerLabel = context?.provider ? context.provider.toUpperCase() : 'AI';
  const isDeveloperMode = context?.mode === 'developer' || context?.mode === 'default';
  const rawMsg = error instanceof Error ? error.message : String(error);
  const rawCode = (error as { code?: string })?.code || '';
  const status = (error as { status?: number; statusCode?: number })?.status ||
                 (error as { status?: number; statusCode?: number })?.statusCode || 0;

  const lower = rawMsg.toLowerCase();
  const lowerCode = rawCode.toLowerCase();

  // 1. Unconfigured Server Key
  if (rawCode === 'AI_NOT_CONFIGURED' || lower.includes('not configured')) {
    return {
      code: 'AI_NOT_CONFIGURED',
      message: `Developer / Demo AI is not configured for ${providerLabel.toLowerCase()} on this server. Please configure ${providerLabel}_API_KEY in .env.local or use your personal key.`,
      statusCode: 400,
      retryable: false
    };
  }

  // 2. Missing User BYOK Key
  if (rawCode === 'MISSING_USER_KEY' || rawCode === 'NO_API_KEY' || rawCode === 'MISSING_API_KEY' || lower.includes('please enter your')) {
    return {
      code: 'MISSING_USER_KEY',
      message: `Please enter your personal ${providerLabel} API key (BYOK mode).`,
      statusCode: 400,
      retryable: false
    };
  }

  // 3. Unsupported Provider
  if (rawCode === 'UNSUPPORTED_PROVIDER' || lower.includes('unsupported provider')) {
    return {
      code: 'UNSUPPORTED_PROVIDER',
      message: `Unsupported AI provider requested. Supported providers: Gemini, OpenAI, DeepSeek.`,
      statusCode: 400,
      retryable: false
    };
  }

  // 4. Invalid API Key / Unauthorized (401 / invalid key)
  if (
    status === 401 ||
    rawCode === 'INVALID_API_KEY' ||
    rawCode === 'INVALID_KEY' ||
    lower.includes('invalid api key') ||
    lower.includes('api_key_invalid') ||
    lower.includes('unauthorized') ||
    lower.includes('authentication')
  ) {
    return {
      code: 'INVALID_API_KEY',
      message: `Invalid ${providerLabel} API key. Please check your credentials or account status.`,
      statusCode: 401,
      retryable: false
    };
  }

  // 5. Forbidden / Permission Denied (403)
  if (status === 403 || lower.includes('forbidden') || lower.includes('permission denied')) {
    return {
      code: 'FORBIDDEN',
      message: `Access denied by ${providerLabel}. Please verify your API key permissions and project access.`,
      statusCode: 403,
      retryable: false
    };
  }

  // 6. Model Not Found (404)
  if (status === 404 || rawCode === 'MODEL_NOT_FOUND' || lower.includes('model not found') || lower.includes('does not exist')) {
    return {
      code: 'MODEL_NOT_FOUND',
      message: `The selected ${providerLabel} model was not found or is unavailable for your account. Please refresh and select another model.`,
      statusCode: 404,
      retryable: false
    };
  }

  // 7. Timeout / Request Aborted (408)
  if (
    status === 408 ||
    rawCode === 'TIMEOUT' ||
    lower.includes('timeout') ||
    lower.includes('aborted') ||
    lower.includes('timed out')
  ) {
    return {
      code: 'TIMEOUT',
      message: `The AI request took too long. Please try again.`,
      statusCode: 408,
      retryable: true
    };
  }

  // 8. Quota Exhaustion vs Rate Limiting (429)
  const isQuota =
    lower.includes('quota') ||
    lower.includes('resource_exhausted') ||
    lower.includes('insufficient_quota') ||
    lower.includes('exceeded your current quota') ||
    lower.includes('balance') ||
    lowerCode.includes('quota');

  if (isQuota) {
    const quotaMsg = isDeveloperMode
      ? `This trial AI provider has reached its current quota. You can try again later or use your own API key.`
      : `Your ${providerLabel} account quota has been exhausted. Please check your billing or quota allocation.`;
    return {
      code: 'QUOTA_EXHAUSTED',
      message: quotaMsg,
      statusCode: 429,
      retryable: false // Quota exhaustion is not immediately retryable
    };
  }

  if (
    status === 429 ||
    rawCode === 'RATE_LIMITED' ||
    rawCode === 'RATE_LIMIT' ||
    lower.includes('rate limit') ||
    lower.includes('too many requests')
  ) {
    return {
      code: 'RATE_LIMITED',
      message: `AI service is temporarily rate-limited. Please wait and try again.`,
      statusCode: 429,
      retryable: true // Rate limits can be retried once after a brief delay
    };
  }

  // 9. Upstream Provider Unavailable / Server Errors (500, 502, 503, 504)
  if (
    status >= 500 ||
    lower.includes('bad gateway') ||
    lower.includes('service unavailable') ||
    lower.includes('server error') ||
    lower.includes('gateway timeout')
  ) {
    return {
      code: 'PROVIDER_UNAVAILABLE',
      message: `${providerLabel} service is temporarily unavailable. Please try again in a few moments.`,
      statusCode: 503,
      retryable: true
    };
  }

  // 10. Network Failure
  if (
    rawCode === 'NETWORK_ERROR' ||
    rawCode === 'ENOTFOUND' ||
    rawCode === 'ECONNRESET' ||
    rawCode === 'ECONNREFUSED' ||
    lower.includes('fetch failed') ||
    lower.includes('network error')
  ) {
    return {
      code: 'NETWORK_ERROR',
      message: `Unable to connect to ${providerLabel}. Please check your internet connection and network availability.`,
      statusCode: 503,
      retryable: true
    };
  }

  // 11. Malformed AI Output / Invalid JSON
  if (
    rawCode === 'MALFORMED_AI_OUTPUT' ||
    lower.includes('malformed') ||
    lower.includes('invalid json') ||
    lower.includes('failed to parse optimization response')
  ) {
    return {
      code: 'INVALID_AI_RESPONSE',
      message: `Received an invalid response format from ${providerLabel}. Please retry with a standard model.`,
      statusCode: 502,
      retryable: false
    };
  }

  // Default Fallback
  return {
    code: 'PROVIDER_UNAVAILABLE',
    message: sanitizeSecrets(rawMsg, context?.keysToRedact) || `${providerLabel} encountered an unexpected error.`,
    statusCode: status >= 400 && status < 600 ? status : 500,
    retryable: false
  };
}
