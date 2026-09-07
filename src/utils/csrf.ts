/**
 * CSRF Protection Client Utility
 * SMP Negeri 4 Satu Atap Taliabu Barat
 * 
 * Manages encrypted CSRF tokens stored in HTTP-only cookies and verifies them
 * against the X-CSRF-Token request header for all state-changing operations.
 */

import { sanitizeObject } from './sanitizer';

let memoryCsrfToken: string | null = null;
let tokenFetchPromise: Promise<string> | null = null;

/**
 * Fetches or refreshes the secure CSRF token from the server
 */
export async function fetchCsrfToken(forceRefresh = false): Promise<string> {
  if (memoryCsrfToken && !forceRefresh) {
    return memoryCsrfToken;
  }

  if (tokenFetchPromise && !forceRefresh) {
    return tokenFetchPromise;
  }

  tokenFetchPromise = (async () => {
    try {
      const res = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include', // Ensures HTTP-only cookie is set
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`Gagal memperoleh token CSRF: HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data && data.csrfToken) {
        memoryCsrfToken = data.csrfToken;
        return data.csrfToken;
      }
      throw new Error('Respons CSRF tidak valid');
    } catch (err) {
      console.warn('CSRF token fetch warning:', err);
      // Fallback pseudo-token for offline/isolated mode
      const fallbackToken = `offline_csrf_${Date.now()}`;
      memoryCsrfToken = fallbackToken;
      return fallbackToken;
    } finally {
      tokenFetchPromise = null;
    }
  })();

  return tokenFetchPromise;
}

export function getCachedCsrfToken(): string | null {
  return memoryCsrfToken;
}

/**
 * Enhanced fetch wrapper that:
 * 1. Attaches X-CSRF-Token header on state-changing operations (POST, PUT, DELETE, PATCH)
 * 2. Transmits credentials (HTTP-only cookies)
 * 3. Deep sanitizes JSON request payloads to neutralize potential injection attacks
 */
export async function fetchWithCsrf(url: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method || 'GET').toUpperCase();
  const isStateChanging = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> || {}),
  };

  // If sending JSON body, deep sanitize the payload
  let body = init.body;
  if (isStateChanging && typeof body === 'string' && headers['Content-Type']?.includes('application/json')) {
    try {
      const parsed = JSON.parse(body);
      const sanitized = sanitizeObject(parsed);
      body = JSON.stringify(sanitized);
    } catch {
      // not JSON or raw text, proceed as-is
    }
  }

  if (isStateChanging) {
    try {
      const token = await fetchCsrfToken();
      headers['X-CSRF-Token'] = token;
    } catch (e) {
      console.warn('Could not attach CSRF token:', e);
    }
  }

  const response = await fetch(url, {
    ...init,
    method,
    headers,
    body,
    credentials: 'include', // Transmit HTTP-only cookies
  });

  // If server returns 403 CSRF mismatch, refresh token once and retry
  if (response.status === 403 && isStateChanging) {
    const cloned = response.clone();
    try {
      const errorJson = await cloned.json();
      if (errorJson?.error?.toLowerCase().includes('csrf')) {
        const freshToken = await fetchCsrfToken(true);
        headers['X-CSRF-Token'] = freshToken;
        return fetch(url, {
          ...init,
          method,
          headers,
          body,
          credentials: 'include',
        });
      }
    } catch {
      // ignore
    }
  }

  return response;
}
