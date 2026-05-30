const API_BASE = '/api';
const DEFAULT_TIMEOUT_MS = 8000;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

/** In-memory CSRF token (works when proxy blocks cookie reads). */
let csrfTokenMemory: string | null = null;

function getCsrfTokenFromCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function getCsrfToken(): string | null {
  return csrfTokenMemory || getCsrfTokenFromCookie();
}

let csrfReady: Promise<void> | null = null;

function createTimeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function mergeSignals(
  a: AbortSignal | undefined,
  b: AbortSignal
): AbortSignal {
  if (!a) return b;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (a.aborted || b.aborted) {
    abort();
    return controller.signal;
  }
  a.addEventListener('abort', abort);
  b.addEventListener('abort', abort);
  return controller.signal;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const timeoutSignal = createTimeoutSignal(timeoutMs);
  const signal = mergeSignals(options.signal ?? undefined, timeoutSignal);
  try {
    return await fetch(url, { ...options, signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('Backend unavailable — is Django running on port 8000?', err);
    }
    throw new ApiError('Backend unavailable — is Django running on port 8000?', err);
  }
}

function resetCsrf() {
  csrfReady = null;
  csrfTokenMemory = null;
}

export async function ensureCsrf(): Promise<void> {
  if (getCsrfToken()) return;
  if (!csrfReady) {
    csrfReady = fetchWithTimeout(`${API_BASE}/auth/csrf/`, {
      credentials: 'include'
    })
      .then(async (res) => {
        if (!res.ok) {
          resetCsrf();
          throw new ApiError('Could not initialize session (CSRF).');
        }
        try {
          const data = await res.json();
          if (typeof data.csrfToken === 'string' && data.csrfToken) {
            csrfTokenMemory = data.csrfToken;
          }
        } catch {
          // body may be empty on older servers
        }
        if (!getCsrfToken()) {
          resetCsrf();
          throw new ApiError(
            'Could not read CSRF token — refresh the page or restart Django.'
          );
        }
      })
      .catch((err) => {
        resetCsrf();
        throw err instanceof ApiError ? err : new ApiError('Backend unavailable.', err);
      });
  }
  await csrfReady;
}

function isMutatingMethod(method: string): boolean {
  return method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  csrfRetried = false
): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (isMutatingMethod(method)) {
    try {
      await ensureCsrf();
    } catch {
      // Auth endpoints are CSRF-exempt on the server; continue without token
    }
    const token = getCsrfToken();
    if (token) {
      headers.set('X-CSRFToken', token);
    }
  }

  const res = await fetchWithTimeout(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (
    !csrfRetried &&
    isMutatingMethod(method) &&
    res.status === 403
  ) {
    resetCsrf();
    await ensureCsrf();
    return apiFetch(path, options, true);
  }

  return res;
}

export async function parseError(res: Response, fallback: string): Promise<string> {
  if (res.status === 403) {
    return 'Session error — refresh the page and try again.';
  }
  try {
    const data = await res.json();
    if (typeof data.error === 'string') return data.error;
    if (typeof data.detail === 'string') return data.detail;
    const firstKey = Object.keys(data)[0];
    if (firstKey && Array.isArray(data[firstKey])) {
      return String(data[firstKey][0]);
    }
  } catch {
    // ignore
  }
  return fallback;
}

/** Health check — does not require CSRF token. */
export async function pingApi(timeoutMs = 3000): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE}/health/`,
      { credentials: 'include' },
      timeoutMs
    );
    return res.ok;
  } catch {
    return false;
  }
}
