export function apiBaseUrl() {
  if (typeof window === 'undefined') {
    return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
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
  return res.json();
}

export async function apiUpload(path: string, formData: FormData, extraHeaders?: HeadersInit) {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    method: 'POST',
    body: formData,
    headers: { ...authHeaders(), ...(extraHeaders || {}) },
    cache: 'no-store'
  });
  return res.json();
}
