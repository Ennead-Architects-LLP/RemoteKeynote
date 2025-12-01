/**
 * Session management utilities
 * Handles session ID generation and URL management
 */

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Get session ID from URL
 * Supports both hash (#sessionId) and query parameter (?session=sessionId)
 */
export function getSessionIdFromURL(): string | null {
  // Check hash first
  const hash = window.location.hash.substring(1);
  if (hash) {
    return hash;
  }

  // Check query parameter
  const params = new URLSearchParams(window.location.search);
  const sessionParam = params.get('session');
  if (sessionParam) {
    return sessionParam;
  }

  return null;
}

/**
 * Set session ID in URL
 */
export function setSessionIdInURL(sessionId: string, useHash: boolean = true): void {
  if (useHash) {
    window.location.hash = sessionId;
  } else {
    const url = new URL(window.location.href);
    url.searchParams.set('session', sessionId);
    window.history.replaceState({}, '', url.toString());
  }
}

/**
 * Get or create session ID
 * If no session ID exists in URL, creates a new one
 */
export function getOrCreateSessionId(): string {
  let sessionId = getSessionIdFromURL();

  if (!sessionId) {
    sessionId = generateSessionId();
    setSessionIdInURL(sessionId);
  }

  return sessionId;
}

/**
 * Copy session URL to clipboard
 */
export function copySessionURL(): Promise<void> {
  const url = window.location.href;
  return navigator.clipboard.writeText(url);
}

