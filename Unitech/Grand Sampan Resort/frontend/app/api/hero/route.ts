import { NextRequest, NextResponse } from 'next/server';
import { mkdir, readFile, readdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

type Overrides = Record<string, string>;
type List = string[];

function pickImageNames(entries: { name: string; isFile(): boolean }[]) {
  return entries
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .filter((n) => /\.(png|jpe?g|svg|webp)$/i.test(n));
}

async function listImages(dir: string, baseUrl: string) {
  const files = await readdir(dir, { withFileTypes: true });
  const names = pickImageNames(files);
  return names.map((n) => `${baseUrl}/${n}`);
}

function isSafeDefaultUrl(url: string) {
  return url.startsWith('/views/');
}

function isSafeUploadedUrl(url: string) {
  return url.startsWith('/uploads/hero/');
}

function safeBasename(url: string) {
  const name = url.split('/').pop() || '';
  if (!name || name.includes('..') || name.includes('/') || !/\.(png|jpe?g|svg|webp)$/i.test(name)) return '';
  return name;
}

async function readOverrides(filePath: string): Promise<Overrides> {
  try {
    const raw = await readFile(filePath, 'utf8');
    const json = JSON.parse(raw);
    if (!json || typeof json !== 'object') return {};
    const out: Overrides = {};
    for (const [k, v] of Object.entries(json as Record<string, unknown>)) {
      if (typeof k === 'string' && typeof v === 'string' && isSafeDefaultUrl(k) && isSafeUploadedUrl(v)) {
        out[k] = v;
      }
    }
    return out;
  } catch {
    return {};
  }
}

async function writeOverrides(filePath: string, overrides: Overrides) {
  await mkdir(join(process.cwd(), 'public', 'uploads', 'hero'), { recursive: true });
  await writeFile(filePath, JSON.stringify(overrides, null, 2), 'utf8');
}

async function readList(filePath: string, validate: (url: string) => boolean): Promise<List> {
  try {
    const raw = await readFile(filePath, 'utf8');
    const json = JSON.parse(raw);
    if (!Array.isArray(json)) return [];
    const out: string[] = [];
    for (const v of json) {
      if (typeof v === 'string' && validate(v)) out.push(v);
    }
    return out;
  } catch {
    return [];
  }
}

async function writeList(filePath: string, list: List) {
  await mkdir(join(process.cwd(), 'public', 'uploads', 'hero'), { recursive: true });
  await writeFile(filePath, JSON.stringify(list, null, 2), 'utf8');
}

export async function GET(request: NextRequest) {
  try {
    const dir = join(process.cwd(), 'public', 'views');
    const urls = await listImages(dir, '/views');
    const overridesPath = join(process.cwd(), 'public', 'uploads', 'hero', '_overrides.json');
    const extrasPath = join(process.cwd(), 'public', 'uploads', 'hero', '_extras.json');
    const hiddenPath = join(process.cwd(), 'public', 'uploads', 'hero', '_hidden.json');
    const overrides = await readOverrides(overridesPath);
    const extras = await readList(extrasPath, (u) => isSafeUploadedUrl(u) && !!safeBasename(u));
    const hidden = await readList(hiddenPath, (u) => isSafeDefaultUrl(u) && !!safeBasename(u));
    const resolved = urls.filter((u) => !hidden.includes(u)).map((u) => overrides[u] || u).concat(extras);

    const admin = request.nextUrl.searchParams.get('admin') === '1';
    if (admin) {
      return NextResponse.json(
        { defaults: urls, overrides, extras, hidden, resolved },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(resolved, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json([], { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;

    const body = await request.json().catch(() => null);
    const originalUrl = typeof body?.originalUrl === 'string' ? body.originalUrl : '';
    const fileUrl = typeof body?.fileUrl === 'string' ? body.fileUrl : '';
    const overridesPath = join(process.cwd(), 'public', 'uploads', 'hero', '_overrides.json');
    const extrasPath = join(process.cwd(), 'public', 'uploads', 'hero', '_extras.json');
    const hiddenPath = join(process.cwd(), 'public', 'uploads', 'hero', '_hidden.json');

    const showUrl = typeof body?.url === 'string' ? body.url : '';
    if (showUrl) {
      if (!isSafeDefaultUrl(showUrl) || !safeBasename(showUrl)) {
        return NextResponse.json({ ok: false, error: 'Invalid url' }, { status: 400 });
      }
      const hidden = await readList(hiddenPath, (u) => isSafeDefaultUrl(u) && !!safeBasename(u));
      const nextHidden = hidden.filter((u) => u !== showUrl);
      await writeList(hiddenPath, nextHidden);
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (!originalUrl && fileUrl) {
      if (!isSafeUploadedUrl(fileUrl) || !safeBasename(fileUrl)) {
        return NextResponse.json({ ok: false, error: 'Invalid fileUrl' }, { status: 400 });
      }
      const extras = await readList(extrasPath, (u) => isSafeUploadedUrl(u) && !!safeBasename(u));
      if (!extras.includes(fileUrl)) {
        extras.push(fileUrl);
        await writeList(extrasPath, extras);
      }
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (!isSafeDefaultUrl(originalUrl) || !isSafeUploadedUrl(fileUrl)) {
      return NextResponse.json({ ok: false, error: 'Invalid originalUrl or fileUrl' }, { status: 400 });
    }
    if (!safeBasename(originalUrl) || !safeBasename(fileUrl)) {
      return NextResponse.json({ ok: false, error: 'Invalid filename' }, { status: 400 });
    }

    const overrides = await readOverrides(overridesPath);
    const hidden = await readList(hiddenPath, (u) => isSafeDefaultUrl(u) && !!safeBasename(u));
    if (hidden.includes(originalUrl)) {
      await writeList(
        hiddenPath,
        hidden.filter((u) => u !== originalUrl)
      );
    }

    const existing = overrides[originalUrl];
    overrides[originalUrl] = fileUrl;
    await writeOverrides(overridesPath, overrides);

    if (existing && isSafeUploadedUrl(existing)) {
      const existingName = safeBasename(existing);
      if (existingName) {
        const existingFile = join(process.cwd(), 'public', 'uploads', 'hero', existingName);
        await unlink(existingFile).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ok: false, error: 'Failed to update overrides' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;

    const body = await request.json().catch(() => null);
    const originalUrl = typeof body?.originalUrl === 'string' ? body.originalUrl : '';
    const url = typeof body?.url === 'string' ? body.url : '';
    const overridesPath = join(process.cwd(), 'public', 'uploads', 'hero', '_overrides.json');
    const extrasPath = join(process.cwd(), 'public', 'uploads', 'hero', '_extras.json');
    const hiddenPath = join(process.cwd(), 'public', 'uploads', 'hero', '_hidden.json');
    const all = body?.all === true;

    if (all) {
      const overrides = await readOverrides(overridesPath);
      const extras = await readList(extrasPath, (u) => isSafeUploadedUrl(u) && !!safeBasename(u));
      const toDelete = new Set<string>([...Object.values(overrides), ...extras]);
      for (const u of toDelete) {
        const name = safeBasename(u);
        if (name && isSafeUploadedUrl(u)) {
          const fp = join(process.cwd(), 'public', 'uploads', 'hero', name);
          await unlink(fp).catch(() => {});
        }
      }
      await writeOverrides(overridesPath, {});
      await writeList(extrasPath, []);
      await writeList(hiddenPath, []);
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (originalUrl) {
      if (!isSafeDefaultUrl(originalUrl) || !safeBasename(originalUrl)) {
        return NextResponse.json({ ok: false, error: 'Invalid originalUrl' }, { status: 400 });
      }
      const overrides = await readOverrides(overridesPath);
      const existing = overrides[originalUrl];
      if (existing) {
        delete overrides[originalUrl];
        await writeOverrides(overridesPath, overrides);
        const existingName = safeBasename(existing);
        if (existingName) {
          const existingFile = join(process.cwd(), 'public', 'uploads', 'hero', existingName);
          await unlink(existingFile).catch(() => {});
        }
      }
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (isSafeDefaultUrl(url) && safeBasename(url)) {
      const overrides = await readOverrides(overridesPath);
      const existing = overrides[url];
      if (existing) {
        delete overrides[url];
        await writeOverrides(overridesPath, overrides);
        const existingName = safeBasename(existing);
        if (existingName) {
          const existingFile = join(process.cwd(), 'public', 'uploads', 'hero', existingName);
          await unlink(existingFile).catch(() => {});
        }
      }
      const hidden = await readList(hiddenPath, (u) => isSafeDefaultUrl(u) && !!safeBasename(u));
      if (!hidden.includes(url)) {
        hidden.push(url);
        await writeList(hiddenPath, hidden);
      }
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (!isSafeUploadedUrl(url) || !safeBasename(url)) {
      return NextResponse.json({ ok: false, error: 'Only uploaded hero images can be deleted' }, { status: 400 });
    }

    const name = safeBasename(url);
    const filePath = join(process.cwd(), 'public', 'uploads', 'hero', name);
    await unlink(filePath);

    const overrides = await readOverrides(overridesPath);
    const next: Overrides = {};
    for (const [k, v] of Object.entries(overrides)) {
      if (v !== url) next[k] = v;
    }
    await writeOverrides(overridesPath, next);

    const extras = await readList(extrasPath, (u) => isSafeUploadedUrl(u) && !!safeBasename(u));
    await writeList(
      extrasPath,
      extras.filter((u) => u !== url)
    );

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ok: false, error: 'Failed to delete' }, { status: 500 });
  }
}
