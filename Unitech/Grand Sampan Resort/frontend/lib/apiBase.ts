export function apiBaseUrl() {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
}
