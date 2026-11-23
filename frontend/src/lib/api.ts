/**
 * Thin fetch wrapper.
 * - Session lives in an httpOnly cookie (not readable by JS), sent automatically.
 * - Every request carries X-Requested-With, which the API requires on writes (CSRF guard).
 */
export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

let onUnauthorized: (() => void) | null = null;
let translateMessage: ((s: string) => string) | null = null;

/** The admin panel installs this so server messages appear in the staff member's language. */
export function setMessageTranslator(fn: ((s: string) => string) | null) {
  translateMessage = fn;
}
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

function messageFrom(data: unknown, status: number): string {
  const tr = (s: string) => (translateMessage ? translateMessage(s) : s);
  if (data && typeof data === 'object' && 'detail' in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === 'string') return tr(detail);
    if (Array.isArray(detail)) {
      return detail
        .map((d) => {
          const loc = Array.isArray(d?.loc) ? d.loc.filter((p: unknown) => p !== 'body').join('.') : '';
          const msg = tr(String(d?.msg ?? 'Invalid value').replace(/^Value error, /, ''));
          return loc ? `${loc}: ${msg}` : msg;
        })
        .join('\n');
    }
  }
  if (status === 0) return tr('Cannot reach the server. Please check your connection.');
  return tr('Request failed ({status}).').replace('{status}', String(status));
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
  };
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: payload, credentials: 'same-origin' });
  } catch {
    throw new ApiError(0, messageFrom(null, 0));
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && path.startsWith('/admin') && onUnauthorized) onUnauthorized();
    throw new ApiError(res.status, messageFrom(data, res.status), data);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  del: <T = void>(path: string) => request<T>('DELETE', path),
  upload: <T>(path: string, form: FormData) => request<T>('POST', path, form),
};

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError || err instanceof Error) return err.message;
  return 'Something went wrong.';
}
