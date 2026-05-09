import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  let meRes: Response;
  let me: any;
  try {
    meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: authorization },
      cache: 'no-store'
    });
    me = await meRes.json().catch(() => null);
  } catch {
    return NextResponse.json({ ok: false, error: 'auth_unavailable' }, { status: 503 });
  }

  if (!meRes.ok || !me?.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  if (me.user?.role !== 'ADMIN') {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  revalidateTag('about-content');
  return NextResponse.json({ ok: true });
}
