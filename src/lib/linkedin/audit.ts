import crypto from 'node:crypto';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  section: string;
  action: string;
  status: 'SUCCESS' | 'FAILED' | 'REJECTED';
  details?: string;
}

// In-memory audit storage for local development
const auditLogs: AuditLogEntry[] = [];
const MAX_AUDIT_LOGS = 100;

/**
 * Sanitizes any string to ensure tokens or secrets are never logged.
 */
function sanitizeAuditText(text?: string): string | undefined {
  if (!text) return undefined;
  return text
    .replace(/(AIzaSy[A-Za-z0-9_-]{33})/gi, '[REDACTED_API_KEY]')
    .replace(/(sk-[A-Za-z0-9_-]{20,})/gi, '[REDACTED_API_KEY]')
    .replace(/(Bearer\s+[A-Za-z0-9_.-]+)/gi, '[REDACTED_TOKEN]')
    .replace(/(password|secret)=([^&\s]+)/gi, '$1=[REDACTED]');
}

/**
 * Records an entry in the in-memory audit log.
 */
export function recordAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
  const newEntry: AuditLogEntry = {
    id: `audit-${crypto.randomBytes(8).toString('hex')}`,
    timestamp: new Date().toISOString(),
    section: entry.section,
    action: entry.action,
    status: entry.status,
    details: sanitizeAuditText(entry.details)
  };

  auditLogs.unshift(newEntry);
  if (auditLogs.length > MAX_AUDIT_LOGS) {
    auditLogs.pop();
  }

  return newEntry;
}

/**
 * Retrieves the current in-memory audit logs.
 */
export function getAuditLogs(): AuditLogEntry[] {
  return [...auditLogs];
}

/**
 * Clears the in-memory audit logs (useful for test isolation).
 */
export function clearAuditLogs(): void {
  auditLogs.length = 0;
}
