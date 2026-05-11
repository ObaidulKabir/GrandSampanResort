'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Mode = 'views' | 'features' | 'hero';

async function uploadToFolder(folder: Mode, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  const res = await fetch('/cms/upload', { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Upload failed');
  const json = await res.json().catch(() => null);
  if (!json?.url) throw new Error('Upload returned no URL');
  return json.url as string;
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function replaceCarousel(originalUrl: string, fileUrl: string) {
  const res = await fetch('/cms/views', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    cache: 'no-store',
    body: JSON.stringify({ originalUrl, fileUrl })
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || 'Replace failed');
  }
}

async function resetCarousel(originalUrl: string) {
  const res = await fetch('/cms/views', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    cache: 'no-store',
    body: JSON.stringify({ originalUrl })
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || 'Reset failed');
  }
}

async function replaceFeature(originalUrl: string, fileUrl: string) {
  const res = await fetch('/cms/features', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    cache: 'no-store',
    body: JSON.stringify({ originalUrl, fileUrl })
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || 'Replace failed');
  }
}

async function resetFeature(originalUrl: string) {
  const res = await fetch('/cms/features', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    cache: 'no-store',
    body: JSON.stringify({ originalUrl })
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || 'Reset failed');
  }
}

async function replaceHero(originalUrl: string, fileUrl: string) {
  const res = await fetch('/cms/hero', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    cache: 'no-store',
    body: JSON.stringify({ originalUrl, fileUrl })
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || 'Replace failed');
  }
}

async function resetHero(originalUrl: string) {
  const res = await fetch('/cms/hero', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    cache: 'no-store',
    body: JSON.stringify({ originalUrl })
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || 'Reset failed');
  }
}

export default function AdminHomepageMediaPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [heroDefaults, setHeroDefaults] = useState<string[]>([]);
  const [heroResolved, setHeroResolved] = useState<string[]>([]);
  const [heroOverrides, setHeroOverrides] = useState<Record<string, string>>({});
  const [heroExtras, setHeroExtras] = useState<string[]>([]);
  const [heroHidden, setHeroHidden] = useState<string[]>([]);
  const [carouselDefaults, setCarouselDefaults] = useState<string[]>([]);
  const [carouselResolved, setCarouselResolved] = useState<string[]>([]);
  const [carouselOverrides, setCarouselOverrides] = useState<Record<string, string>>({});
  const [carouselExtras, setCarouselExtras] = useState<string[]>([]);
  const [carouselHidden, setCarouselHidden] = useState<string[]>([]);
  const [featureDefaults, setFeatureDefaults] = useState<string[]>([]);
  const [featureResolved, setFeatureResolved] = useState<string[]>([]);
  const [featureOverrides, setFeatureOverrides] = useState<Record<string, string>>({});
  const [featureExtras, setFeatureExtras] = useState<string[]>([]);
  const [featureHidden, setFeatureHidden] = useState<string[]>([]);
  const [busy, setBusy] = useState<null | string>(null);
  const [error, setError] = useState('');
  const [replaceHeroFiles, setReplaceHeroFiles] = useState<Record<string, File | null>>({});
  const [replaceFiles, setReplaceFiles] = useState<Record<string, File | null>>({});
  const [replaceFeatureFiles, setReplaceFeatureFiles] = useState<Record<string, File | null>>({});
  const [addHeroFile, setAddHeroFile] = useState<File | null>(null);
  const [addCarouselFile, setAddCarouselFile] = useState<File | null>(null);
  const [addFeatureFile, setAddFeatureFile] = useState<File | null>(null);

  const heroMode = useMemo(
    () => (Object.keys(heroOverrides).length || heroExtras.length || heroHidden.length ? 'overrides' : 'defaults'),
    [heroOverrides, heroExtras, heroHidden]
  );
  const viewsMode = useMemo(
    () => (Object.keys(carouselOverrides).length || carouselExtras.length || carouselHidden.length ? 'overrides' : 'defaults'),
    [carouselOverrides, carouselExtras, carouselHidden]
  );
  const featuresMode = useMemo(
    () => (Object.keys(featureOverrides).length || featureExtras.length || featureHidden.length ? 'overrides' : 'defaults'),
    [featureOverrides, featureExtras, featureHidden]
  );

  async function load() {
    setError('');
    try {
      const [h, v, f] = await Promise.all([
        fetch('/cms/hero?admin=1', { cache: 'no-store' }),
        fetch('/cms/views?admin=1', { cache: 'no-store' }),
        fetch('/cms/features?admin=1', { cache: 'no-store' })
      ]);
      const hJson = await h.json().catch(() => []);
      const vJson = await v.json().catch(() => []);
      const fJson = await f.json().catch(() => []);
      if (hJson && typeof hJson === 'object' && !Array.isArray(hJson)) {
        setHeroDefaults(Array.isArray((hJson as any).defaults) ? (hJson as any).defaults : []);
        setHeroResolved(Array.isArray((hJson as any).resolved) ? (hJson as any).resolved : []);
        setHeroOverrides((hJson as any).overrides && typeof (hJson as any).overrides === 'object' ? (hJson as any).overrides : {});
        setHeroExtras(Array.isArray((hJson as any).extras) ? (hJson as any).extras : []);
        setHeroHidden(Array.isArray((hJson as any).hidden) ? (hJson as any).hidden : []);
      } else {
        const list = Array.isArray(hJson) ? hJson : [];
        setHeroDefaults(list);
        setHeroResolved(list);
        setHeroOverrides({});
        setHeroExtras([]);
        setHeroHidden([]);
      }
      if (vJson && typeof vJson === 'object' && !Array.isArray(vJson)) {
        setCarouselDefaults(Array.isArray((vJson as any).defaults) ? (vJson as any).defaults : []);
        setCarouselResolved(Array.isArray((vJson as any).resolved) ? (vJson as any).resolved : []);
        setCarouselOverrides((vJson as any).overrides && typeof (vJson as any).overrides === 'object' ? (vJson as any).overrides : {});
        setCarouselExtras(Array.isArray((vJson as any).extras) ? (vJson as any).extras : []);
        setCarouselHidden(Array.isArray((vJson as any).hidden) ? (vJson as any).hidden : []);
      } else {
        const list = Array.isArray(vJson) ? vJson : [];
        setCarouselDefaults(list);
        setCarouselResolved(list);
        setCarouselOverrides({});
        setCarouselExtras([]);
        setCarouselHidden([]);
      }
      if (fJson && typeof fJson === 'object' && !Array.isArray(fJson)) {
        setFeatureDefaults(Array.isArray((fJson as any).defaults) ? (fJson as any).defaults : []);
        setFeatureResolved(Array.isArray((fJson as any).resolved) ? (fJson as any).resolved : []);
        setFeatureOverrides((fJson as any).overrides && typeof (fJson as any).overrides === 'object' ? (fJson as any).overrides : {});
        setFeatureExtras(Array.isArray((fJson as any).extras) ? (fJson as any).extras : []);
        setFeatureHidden(Array.isArray((fJson as any).hidden) ? (fJson as any).hidden : []);
      } else {
        const list = Array.isArray(fJson) ? fJson : [];
        setFeatureDefaults(list);
        setFeatureResolved(list);
        setFeatureOverrides({});
        setFeatureExtras([]);
        setFeatureHidden([]);
      }
    } catch {
      setError('Failed to load homepage assets');
    }
  }

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    load();
  }, [authChecked]);

  async function replaceOneHero(originalUrl: string) {
    const file = replaceHeroFiles[originalUrl];
    if (!file) return;
    setError('');
    setBusy(`replace-hero-${originalUrl}`);
    try {
      const fileUrl = await uploadToFolder('hero', file);
      await replaceHero(originalUrl, fileUrl);
      setReplaceHeroFiles((prev) => ({ ...prev, [originalUrl]: null }));
      await load();
    } catch (e: any) {
      setError(e?.message || 'Replace failed');
    } finally {
      setBusy(null);
    }
  }

  async function replaceOneCarousel(originalUrl: string) {
    const file = replaceFiles[originalUrl];
    if (!file) return;
    setError('');
    setBusy(`replace-${originalUrl}`);
    try {
      const fileUrl = await uploadToFolder('views', file);
      await replaceCarousel(originalUrl, fileUrl);
      setReplaceFiles((prev) => ({ ...prev, [originalUrl]: null }));
      await load();
    } catch (e: any) {
      setError(e?.message || 'Replace failed');
    } finally {
      setBusy(null);
    }
  }

  async function replaceOneFeature(originalUrl: string) {
    const file = replaceFeatureFiles[originalUrl];
    if (!file) return;
    setError('');
    setBusy(`replace-feature-${originalUrl}`);
    try {
      const fileUrl = await uploadToFolder('features', file);
      await replaceFeature(originalUrl, fileUrl);
      setReplaceFeatureFiles((prev) => ({ ...prev, [originalUrl]: null }));
      await load();
    } catch (e: any) {
      setError(e?.message || 'Replace failed');
    } finally {
      setBusy(null);
    }
  }

  async function resetOneCarousel(originalUrl: string) {
    setError('');
    setBusy(`reset-${originalUrl}`);
    try {
      await resetCarousel(originalUrl);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Reset failed');
    } finally {
      setBusy(null);
    }
  }

  async function resetOneFeature(originalUrl: string) {
    setError('');
    setBusy(`reset-feature-${originalUrl}`);
    try {
      await resetFeature(originalUrl);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Reset failed');
    } finally {
      setBusy(null);
    }
  }

  async function resetAllCarousel() {
    setError('');
    setBusy('reset-views-all');
    try {
      const res = await fetch('/cms/views', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        cache: 'no-store',
        body: JSON.stringify({ all: true })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Reset failed');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Reset failed');
    } finally {
      setBusy(null);
    }
  }

  async function resetOneHero(originalUrl: string) {
    setError('');
    setBusy(`reset-hero-${originalUrl}`);
    try {
      await resetHero(originalUrl);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Reset failed');
    } finally {
      setBusy(null);
    }
  }

  async function resetAllHero() {
    setError('');
    setBusy('reset-hero-all');
    try {
      const res = await fetch('/cms/hero', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        cache: 'no-store',
        body: JSON.stringify({ all: true })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Reset failed');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Reset failed');
    } finally {
      setBusy(null);
    }
  }

  async function resetAllFeatures() {
    setError('');
    setBusy('reset-features-all');
    try {
      const res = await fetch('/cms/features', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        cache: 'no-store',
        body: JSON.stringify({ all: true })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Reset failed');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Reset failed');
    } finally {
      setBusy(null);
    }
  }

  async function addOneHero() {
    if (!addHeroFile) return;
    setError('');
    setBusy('add-hero');
    try {
      const fileUrl = await uploadToFolder('hero', addHeroFile);
      const res = await fetch('/cms/hero', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        cache: 'no-store',
        body: JSON.stringify({ fileUrl })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Add failed');
      setAddHeroFile(null);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Add failed');
    } finally {
      setBusy(null);
    }
  }

  async function addOneCarousel() {
    if (!addCarouselFile) return;
    setError('');
    setBusy('add-views');
    try {
      const fileUrl = await uploadToFolder('views', addCarouselFile);
      const res = await fetch('/cms/views', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        cache: 'no-store',
        body: JSON.stringify({ fileUrl })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Add failed');
      setAddCarouselFile(null);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Add failed');
    } finally {
      setBusy(null);
    }
  }

  async function addOneFeature() {
    if (!addFeatureFile) return;
    setError('');
    setBusy('add-features');
    try {
      const fileUrl = await uploadToFolder('features', addFeatureFile);
      const res = await fetch('/cms/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        cache: 'no-store',
        body: JSON.stringify({ fileUrl })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Add failed');
      setAddFeatureFile(null);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Add failed');
    } finally {
      setBusy(null);
    }
  }

  async function removeHeroUrl(url: string) {
    setError('');
    setBusy(`remove-hero-${url}`);
    try {
      const res = await fetch('/cms/hero', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        cache: 'no-store',
        body: JSON.stringify({ url })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Remove failed');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Remove failed');
    } finally {
      setBusy(null);
    }
  }

  async function showHeroUrl(url: string) {
    setError('');
    setBusy(`show-hero-${url}`);
    try {
      const res = await fetch('/cms/hero', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        cache: 'no-store',
        body: JSON.stringify({ url })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Restore failed');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Restore failed');
    } finally {
      setBusy(null);
    }
  }

  async function removeCarouselUrl(url: string) {
    setError('');
    setBusy(`remove-views-${url}`);
    try {
      const res = await fetch('/cms/views', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        cache: 'no-store',
        body: JSON.stringify({ url })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Remove failed');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Remove failed');
    } finally {
      setBusy(null);
    }
  }

  async function showCarouselUrl(url: string) {
    setError('');
    setBusy(`show-views-${url}`);
    try {
      const res = await fetch('/cms/views', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        cache: 'no-store',
        body: JSON.stringify({ url })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Restore failed');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Restore failed');
    } finally {
      setBusy(null);
    }
  }

  async function removeFeatureUrl(url: string) {
    setError('');
    setBusy(`remove-features-${url}`);
    try {
      const res = await fetch('/cms/features', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        cache: 'no-store',
        body: JSON.stringify({ url })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Remove failed');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Remove failed');
    } finally {
      setBusy(null);
    }
  }

  async function showFeatureUrl(url: string) {
    setError('');
    setBusy(`show-features-${url}`);
    try {
      const res = await fetch('/cms/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        cache: 'no-store',
        body: JSON.stringify({ url })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Restore failed');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Restore failed');
    } finally {
      setBusy(null);
    }
  }

  if (!authChecked) return null;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-['Playfair Display'] text-4xl text-ocean">Homepage Media</h1>
      <p className="mt-3 text-ocean/80">
        Manage landing page carousel images and feature cards at runtime. Uploaded assets are saved under public/uploads and take
        priority over the default bundled images.
      </p>
      {error && <div className="mt-6 rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <section className="mt-10 rounded-xl border border-gold/30 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-['Playfair Display'] text-ocean">Hero Carousel Images</h2>
            <div className="mt-1 text-sm text-ocean/70">Mode: {heroMode === 'overrides' ? 'Custom overrides' : 'Default set'}</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setAddHeroFile((e.target.files && e.target.files[0]) || null)}
              className="block text-ocean"
            />
            <button
              onClick={() => addOneHero()}
              className="rounded bg-ocean px-3 py-2 text-sm text-white disabled:opacity-50"
              disabled={busy !== null || !addHeroFile}
            >
              {busy === 'add-hero' ? 'Adding...' : 'Add'}
            </button>
            <button
              onClick={() => resetAllHero()}
              className="rounded border border-ocean px-3 py-2 text-ocean disabled:opacity-50"
              disabled={busy !== null || (Object.keys(heroOverrides).length === 0 && heroExtras.length === 0 && heroHidden.length === 0)}
            >
              Reset To Defaults
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {heroDefaults.map((originalUrl, idx) => {
            const currentUrl = heroOverrides[originalUrl] || originalUrl;
            const overridden = !!heroOverrides[originalUrl];
            const hidden = heroHidden.includes(originalUrl);
            const picked = replaceHeroFiles[originalUrl] || null;
            return (
            <div key={originalUrl} className="rounded-lg border border-gold/20 bg-pearl p-3">
              <div className="relative h-40 w-full overflow-hidden rounded border border-ocean/10 bg-white">
                <img src={currentUrl} alt={currentUrl} className="h-full w-full object-cover" />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-ocean/70">
                  {hidden ? `${originalUrl} (hidden)` : overridden ? `${originalUrl} (replaced)` : originalUrl}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = (e.target.files && e.target.files[0]) || null;
                    setReplaceHeroFiles((prev) => ({ ...prev, [originalUrl]: file }));
                  }}
                  className="block w-full text-ocean"
                />
                <button
                  onClick={() => replaceOneHero(originalUrl)}
                  className="rounded bg-ocean px-3 py-2 text-sm text-white disabled:opacity-50"
                  disabled={busy !== null || !picked}
                >
                  {busy === `replace-hero-${originalUrl}` ? 'Replacing...' : 'Replace'}
                </button>
                <button
                  onClick={() => resetOneHero(originalUrl)}
                  className="rounded border border-ocean px-3 py-2 text-sm text-ocean disabled:opacity-50"
                  disabled={busy !== null || !overridden}
                >
                  Reset
                </button>
                <button
                  onClick={() => (hidden ? showHeroUrl(originalUrl) : removeHeroUrl(originalUrl))}
                  className="rounded border border-ocean px-3 py-2 text-sm text-ocean disabled:opacity-50"
                  disabled={busy !== null}
                >
                  {hidden ? (busy === `show-hero-${originalUrl}` ? 'Restoring...' : 'Restore') : busy === `remove-hero-${originalUrl}` ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </div>
          );})}
          {heroDefaults.length === 0 && <div className="text-ocean/70">No hero carousel images found.</div>}
        </div>

        {heroExtras.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-['Playfair Display'] text-ocean">Added Images</h3>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {heroExtras.map((u) => (
                <div key={u} className="rounded-lg border border-gold/20 bg-pearl p-3">
                  <div className="relative h-40 w-full overflow-hidden rounded border border-ocean/10 bg-white">
                    <img src={u} alt={u} className="h-full w-full object-cover" />
                  </div>
                  <div className="mt-2 truncate text-xs text-ocean/70">{u}</div>
                  <div className="mt-3">
                    <button
                      onClick={() => removeHeroUrl(u)}
                      className="rounded border border-red-600 px-3 py-2 text-sm text-red-700 disabled:opacity-50"
                      disabled={busy !== null}
                    >
                      {busy === `remove-hero-${u}` ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="mt-10 rounded-xl border border-gold/30 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-['Playfair Display'] text-ocean">Views Carousel Images</h2>
            <div className="mt-1 text-sm text-ocean/70">Mode: {viewsMode === 'overrides' ? 'Custom overrides' : 'Default set'}</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setAddCarouselFile((e.target.files && e.target.files[0]) || null)}
              className="block text-ocean"
            />
            <button
              onClick={() => addOneCarousel()}
              className="rounded bg-ocean px-3 py-2 text-sm text-white disabled:opacity-50"
              disabled={busy !== null || !addCarouselFile}
            >
              {busy === 'add-views' ? 'Adding...' : 'Add'}
            </button>
            <button
              onClick={() => resetAllCarousel()}
              className="rounded border border-ocean px-3 py-2 text-ocean disabled:opacity-50"
              disabled={busy !== null || (Object.keys(carouselOverrides).length === 0 && carouselExtras.length === 0 && carouselHidden.length === 0)}
            >
              Reset To Defaults
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {carouselDefaults.map((originalUrl, idx) => {
            const currentUrl = carouselOverrides[originalUrl] || originalUrl;
            const overridden = !!carouselOverrides[originalUrl];
            const hidden = carouselHidden.includes(originalUrl);
            const picked = replaceFiles[originalUrl] || null;
            return (
            <div key={originalUrl} className="rounded-lg border border-gold/20 bg-pearl p-3">
              <div className="relative h-40 w-full overflow-hidden rounded border border-ocean/10 bg-white">
                <img src={currentUrl} alt={currentUrl} className="h-full w-full object-cover" />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-ocean/70">
                  {hidden ? `${originalUrl} (hidden)` : overridden ? `${originalUrl} (replaced)` : originalUrl}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = (e.target.files && e.target.files[0]) || null;
                    setReplaceFiles((prev) => ({ ...prev, [originalUrl]: file }));
                  }}
                  className="block w-full text-ocean"
                />
                <button
                  onClick={() => replaceOneCarousel(originalUrl)}
                  className="rounded bg-ocean px-3 py-2 text-sm text-white disabled:opacity-50"
                  disabled={busy !== null || !picked}
                >
                  {busy === `replace-${originalUrl}` ? 'Replacing...' : 'Replace'}
                </button>
                <button
                  onClick={() => resetOneCarousel(originalUrl)}
                  className="rounded border border-ocean px-3 py-2 text-sm text-ocean disabled:opacity-50"
                  disabled={busy !== null || !overridden}
                >
                  Reset
                </button>
                <button
                  onClick={() => (hidden ? showCarouselUrl(originalUrl) : removeCarouselUrl(originalUrl))}
                  className="rounded border border-ocean px-3 py-2 text-sm text-ocean disabled:opacity-50"
                  disabled={busy !== null}
                >
                  {hidden ? (busy === `show-views-${originalUrl}` ? 'Restoring...' : 'Restore') : busy === `remove-views-${originalUrl}` ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </div>
          );})}
          {carouselDefaults.length === 0 && <div className="text-ocean/70">No carousel images found.</div>}
        </div>

        {carouselExtras.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-['Playfair Display'] text-ocean">Added Images</h3>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {carouselExtras.map((u) => (
                <div key={u} className="rounded-lg border border-gold/20 bg-pearl p-3">
                  <div className="relative h-40 w-full overflow-hidden rounded border border-ocean/10 bg-white">
                    <img src={u} alt={u} className="h-full w-full object-cover" />
                  </div>
                  <div className="mt-2 truncate text-xs text-ocean/70">{u}</div>
                  <div className="mt-3">
                    <button
                      onClick={() => removeCarouselUrl(u)}
                      className="rounded border border-red-600 px-3 py-2 text-sm text-red-700 disabled:opacity-50"
                      disabled={busy !== null}
                    >
                      {busy === `remove-views-${u}` ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="mt-10 rounded-xl border border-gold/30 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-['Playfair Display'] text-ocean">Feature Cards</h2>
            <div className="mt-1 text-sm text-ocean/70">Mode: {featuresMode === 'overrides' ? 'Custom overrides' : 'Default set'}</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setAddFeatureFile((e.target.files && e.target.files[0]) || null)}
              className="block text-ocean"
            />
            <button
              onClick={() => addOneFeature()}
              className="rounded bg-ocean px-3 py-2 text-sm text-white disabled:opacity-50"
              disabled={busy !== null || !addFeatureFile}
            >
              {busy === 'add-features' ? 'Adding...' : 'Add'}
            </button>
            <button
              onClick={() => resetAllFeatures()}
              className="rounded border border-ocean px-3 py-2 text-ocean disabled:opacity-50"
              disabled={busy !== null || (Object.keys(featureOverrides).length === 0 && featureExtras.length === 0 && featureHidden.length === 0)}
            >
              Reset To Defaults
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {featureDefaults.map((originalUrl, idx) => {
            const currentUrl = featureOverrides[originalUrl] || originalUrl;
            const overridden = !!featureOverrides[originalUrl];
            const hidden = featureHidden.includes(originalUrl);
            const picked = replaceFeatureFiles[originalUrl] || null;
            return (
            <div key={originalUrl} className="rounded-lg border border-gold/20 bg-pearl p-3">
              <div className="relative h-40 w-full overflow-hidden rounded border border-ocean/10 bg-white">
                <img src={currentUrl} alt={currentUrl} className="h-full w-full object-contain" />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-ocean/70">
                  {hidden ? `${originalUrl} (hidden)` : overridden ? `${originalUrl} (replaced)` : originalUrl}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = (e.target.files && e.target.files[0]) || null;
                    setReplaceFeatureFiles((prev) => ({ ...prev, [originalUrl]: file }));
                  }}
                  className="block w-full text-ocean"
                />
                <button
                  onClick={() => replaceOneFeature(originalUrl)}
                  className="rounded bg-ocean px-3 py-2 text-sm text-white disabled:opacity-50"
                  disabled={busy !== null || !picked}
                >
                  {busy === `replace-feature-${originalUrl}` ? 'Replacing...' : 'Replace'}
                </button>
                <button
                  onClick={() => resetOneFeature(originalUrl)}
                  className="rounded border border-ocean px-3 py-2 text-sm text-ocean disabled:opacity-50"
                  disabled={busy !== null || !overridden}
                >
                  Reset
                </button>
                <button
                  onClick={() => (hidden ? showFeatureUrl(originalUrl) : removeFeatureUrl(originalUrl))}
                  className="rounded border border-ocean px-3 py-2 text-sm text-ocean disabled:opacity-50"
                  disabled={busy !== null}
                >
                  {hidden ? (busy === `show-features-${originalUrl}` ? 'Restoring...' : 'Restore') : busy === `remove-features-${originalUrl}` ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </div>
          );})}
          {featureDefaults.length === 0 && <div className="text-ocean/70">No feature images found.</div>}
        </div>

        {featureExtras.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-['Playfair Display'] text-ocean">Added Images</h3>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {featureExtras.map((u) => (
                <div key={u} className="rounded-lg border border-gold/20 bg-pearl p-3">
                  <div className="relative h-40 w-full overflow-hidden rounded border border-ocean/10 bg-white">
                    <img src={u} alt={u} className="h-full w-full object-contain" />
                  </div>
                  <div className="mt-2 truncate text-xs text-ocean/70">{u}</div>
                  <div className="mt-3">
                    <button
                      onClick={() => removeFeatureUrl(u)}
                      className="rounded border border-red-600 px-3 py-2 text-sm text-red-700 disabled:opacity-50"
                      disabled={busy !== null}
                    >
                      {busy === `remove-features-${u}` ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
