function normalizeOrigin(raw: string) {
  // Allow either "https://host" or "https://host/api" in env; we always
  // append `/api` ourselves for JSON routes, so strip a trailing `/api`.
  return raw.replace(/\/+$/, '').replace(/\/api$/i, '');
}

function apiOrigin() {
  if (typeof window === 'undefined') {
    return normalizeOrigin(process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');
  }
  return normalizeOrigin(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');
}

// The backend mounts every route behind a global `/api` prefix, while the
// same origin (without the prefix) also serves static `/uploads` assets
// (see lib/media.ts). Append the prefix here rather than baking it into the
// shared origin env vars so both consumers keep working.
export function apiBaseUrl() {
  return `${apiOrigin()}/api`;
}

function authHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  try {
    const token = localStorage.getItem('gsr_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init?.headers || {})
    },
    cache: 'no-store'
  });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    return { ok: false, error: 'bad_response', statusCode: res.status };
  }
  if (!res.ok) {
    const message = body?.message;
    const error =
      (typeof body?.error === 'string' && body.error !== 'Internal Server Error'
        ? body.error
        : null) ||
      (typeof message === 'string' ? message : null) ||
      (Array.isArray(message) ? message.join('; ') : null) ||
      'request_failed';
    return {
      ...(body && typeof body === 'object' ? body : {}),
      ok: false,
      error,
      statusCode: body?.statusCode || res.status
    };
  }
  return body;
}

export async function apiUpload(path: string, formData: FormData, extraHeaders?: HeadersInit) {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    method: 'POST',
    body: formData,
    headers: { ...authHeaders(), ...(extraHeaders || {}) },
    cache: 'no-store'
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    return { ok: false, error: 'bad_response', status: res.status };
  }
  if (!res.ok) {
    return body && typeof body === 'object'
      ? { ...body, ok: false, status: res.status }
      : { ok: false, error: 'upload_failed', status: res.status };
  }
  return body ?? { ok: false, error: 'empty_response' };
}
