const STORAGE_KEY = 'ttt_audit_log';
const MAX_LOGS = 100;

// Initialize ring buffer from localStorage
let buffer = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.slice(-MAX_LOGS) : [];
  } catch {
    return [];
  }
})();

/**
 * PUBLIC_INTERFACE
 * Push an audit event to the ring buffer and mirror to localStorage.
 * @param {Object} event
 * @param {'START'|'MOVE'|'RESET'|'ERROR'} event.action
 * @param {any} event.before
 * @param {any} event.after
 * @param {string} [event.reason]
 * @param {string} [event.userId='anonymous']
 * @param {Object} [event.metadata]
 * @param {string} [event.timestamp] optional ISO timestamp (auto-filled)
 */
export function logEvent(event) {
  const ts = new Date().toISOString();
  const payload = {
    userId: 'anonymous',
    ...event,
    timestamp: event.timestamp || ts,
  };
  buffer.push(payload);
  if (buffer.length > MAX_LOGS) {
    buffer = buffer.slice(-MAX_LOGS);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buffer));
  } catch {
    // ignore persistence issues
  }
}

/**
 * PUBLIC_INTERFACE
 * Retrieve a shallow copy of the current audit log buffer.
 * @returns {Array<Object>}
 */
export function getAuditLog() {
  return buffer.slice();
}
