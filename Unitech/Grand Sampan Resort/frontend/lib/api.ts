import { apiBaseUrl } from '@/lib/apiBase';

export async function api(path: string, init?: RequestInit) {
  const baseUrl = apiBaseUrl();
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...((init?.headers as any) || {}) };
  if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
  const method = String(init?.method || 'GET').toUpperCase();

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    cache: init?.cache ?? (method === 'GET' ? 'no-store' : undefined),
    headers
  });
  const json = await res.json().catch(() => null);
  if (json && typeof json === 'object') {
    (json as any).__httpOk = res.ok;
    (json as any).__httpStatus = res.status;
  }
  return json;
}

