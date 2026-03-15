/**
 * apps/mobile/utils/error.ts
 * ──────────────────────────────────────────────────────────────────
 * Error classification utilities.
 * ──────────────────────────────────────────────────────────────────
 */

/**
 * Checks if an error is a network-level failure (no connection or timeout)
 * vs a server-level response (e.g. 401, 500).
 */
export function isNetworkError(error: any): boolean {
  // Axios specific classification
  if (error?.code === 'ERR_NETWORK') return true;
  
  // No response object usually means the request never reached the server
  // or the server shut the connection too early.
  if (error?.isAxiosError && !error?.response) {
    return true;
  }

  // Handle timeout/canceled cases if we want to show the same full-screen UI
  if (error?.code === 'ECONNABORTED' || error?.code === 'ERR_CANCELED') {
    return true;
  }

  return false;
}
