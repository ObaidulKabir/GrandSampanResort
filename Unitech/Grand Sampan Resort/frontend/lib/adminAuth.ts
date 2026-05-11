import { NextRequest, NextResponse } from 'next/server';
import { apiBaseUrl } from '@/lib/apiBase';

export async function requireAdmin(request: NextRequest) {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const meRes = await fetch(`${apiBaseUrl()}/auth/me`, {
      headers: { Authorization: authorization },
      cache: 'no-store'
    });
    const me = await meRes.json().catch(() => null);
    if (!meRes.ok || !me?.user) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
    if (me.user?.role !== 'ADMIN') {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }
    return null;
  } catch {
    return NextResponse.json({ ok: false, error: 'auth_unavailable' }, { status: 503 });
  }
}
