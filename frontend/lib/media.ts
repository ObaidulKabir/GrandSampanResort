import { api } from './api';
import type { ResortPhoto } from './photos';

export type MediaItem = {
  id: string;
  category: string;
  label?: string | null;
  suiteId?: string | null;
  url: string;
  alt?: string | null;
  order: number;
};

function normalizeOrigin(raw: string) {
  return raw.replace(/\/+$/, '').replace(/\/api$/i, '');
}

function apiOrigin() {
  if (typeof window === 'undefined') {
    return normalizeOrigin(process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');
  }
  return normalizeOrigin(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');
}

export function resolveMediaUrl(url: string) {
  if (!url) return url;
  if (/^https?:\/\//.test(url)) return url;
  // In the browser, keep /uploads relative so Traefik (prod) or Next rewrites
  // (local) can route them. Absolute API hosts break when the page origin
  // differs from NEXT_PUBLIC_API_URL (e.g. localhost:3010 vs :4000/:4010).
  if (typeof window !== 'undefined' && url.startsWith('/uploads/')) {
    return url;
  }
  return `${apiOrigin()}${url}`;
}

export async function fetchMedia(category: string, suiteId?: string): Promise<MediaItem[]> {
  try {
    const params = new URLSearchParams({ category });
    if (suiteId) params.set('suiteId', suiteId);
    const json = await api(`/media?${params.toString()}`);
    const list: MediaItem[] = Array.isArray(json) ? json : json?.media ?? [];
    return list;
  } catch {
    return [];
  }
}

export function toResortPhotos(items: MediaItem[]): ResortPhoto[] {
  return items.map((item) => ({
    src: resolveMediaUrl(item.url),
    alt: item.alt || item.label || 'Grand Sampan Resort',
    // Self-hosted uploads are served by the backend container; skip Next's
    // server-side image-optimizer proxy (which can't reach that origin from
    // inside the frontend container) and let the browser fetch them directly.
    unoptimized: true
  }));
}
