'use client';
import { useEffect, useMemo, useState } from 'react';

type Mode = 'views' | 'features' | 'hero';

async function uploadToFolder(folder: Mode, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Upload failed');
  const json = await res.json().catch(() => null);
  if (!json?.url) throw new Error('Upload returned no URL');
  return json.url as string;
}

async function replaceCarousel(originalUrl: string, fileUrl: string) {
  const res = await fetch('/api/views', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ originalUrl, fileUrl })
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || 'Replace failed');
  }
}

async function resetCarousel(originalUrl: string) {
  const res = await fetch('/api/views', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ originalUrl })
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || 'Reset failed');
  }
}

async function replaceFeature(originalUrl: string, fileUrl: string) {
  const res = await fetch('/api/features', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ originalUrl, fileUrl })
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || 'Replace failed');
  }
}

async function resetFeature(originalUrl: string) {
  const res = await fetch('/api/features', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ originalUrl })
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || 'Reset failed');
  }
}

async function replaceHero(originalUrl: string, fileUrl: string) {
  const res = await fetch('/api/hero', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ originalUrl, fileUrl })
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || 'Replace failed');
  }
}

async function resetHero(originalUrl: string) {
  const res = await fetch('/api/hero', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ originalUrl })
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || 'Reset failed');
  }
}

export default function AdminHomepageMediaPage() {
  const [heroDefaults, setHeroDefaults] = useState<string[]>([]);
  const [heroResolved, setHeroResolved] = useState<string[]>([]);
  const [heroOverrides, setHeroOverrides] = useState<Record<string, string>>({});
  const [carouselDefaults, setCarouselDefaults] = useState<string[]>([]);
  const [carouselResolved, setCarouselResolved] = useState<string[]>([]);
  const [carouselOverrides, setCarouselOverrides] = useState<Record<string, string>>({});
  const [featureDefaults, setFeatureDefaults] = useState<string[]>([]);
  const [featureResolved, setFeatureResolved] = useState<string[]>([]);
  const [featureOverrides, setFeatureOverrides] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<null | string>(null);
  const [error, setError] = useState('');
  const [replaceHeroFiles, setReplaceHeroFiles] = useState<Record<string, File | null>>({});
  const [replaceFiles, setReplaceFiles] = useState<Record<string, File | null>>({});
  const [replaceFeatureFiles, setReplaceFeatureFiles] = useState<Record<string, File | null>>({});

  const heroMode = useMemo(() => (Object.keys(heroOverrides).length ? 'overrides' : 'defaults'), [heroOverrides]);
  const viewsMode = useMemo(() => (Object.keys(carouselOverrides).length ? 'overrides' : 'defaults'), [carouselOverrides]);
  const featuresMode = useMemo(() => (Object.keys(featureOverrides).length ? 'overrides' : 'defaults'), [featureOverrides]);

  async function load() {
    setError('');
    try {
      const [h, v, f] = await Promise.all([
        fetch('/api/hero?admin=1', { cache: 'no-store' }),
        fetch('/api/views?admin=1', { cache: 'no-store' }),
        fetch('/api/features?admin=1', { cache: 'no-store' })
      ]);
      const hJson = await h.json().catch(() => []);
      const vJson = await v.json().catch(() => []);
      const fJson = await f.json().catch(() => []);
      if (hJson && typeof hJson === 'object' && !Array.isArray(hJson)) {
        setHeroDefaults(Array.isArray((hJson as any).defaults) ? (hJson as any).defaults : []);
        setHeroResolved(Array.isArray((hJson as any).resolved) ? (hJson as any).resolved : []);
        setHeroOverrides((hJson as any).overrides && typeof (hJson as any).overrides === 'object' ? (hJson as any).overrides : {});
      } else {
        const list = Array.isArray(hJson) ? hJson : [];
        setHeroDefaults(list);
        setHeroResolved(list);
        setHeroOverrides({});
      }
      if (vJson && typeof vJson === 'object' && !Array.isArray(vJson)) {
        setCarouselDefaults(Array.isArray((vJson as any).defaults) ? (vJson as any).defaults : []);
        setCarouselResolved(Array.isArray((vJson as any).resolved) ? (vJson as any).resolved : []);
        setCarouselOverrides((vJson as any).overrides && typeof (vJson as any).overrides === 'object' ? (vJson as any).overrides : {});
      } else {
        const list = Array.isArray(vJson) ? vJson : [];
        setCarouselDefaults(list);
        setCarouselResolved(list);
        setCarouselOverrides({});
      }
      if (fJson && typeof fJson === 'object' && !Array.isArray(fJson)) {
        setFeatureDefaults(Array.isArray((fJson as any).defaults) ? (fJson as any).defaults : []);
        setFeatureResolved(Array.isArray((fJson as any).resolved) ? (fJson as any).resolved : []);
        setFeatureOverrides((fJson as any).overrides && typeof (fJson as any).overrides === 'object' ? (fJson as any).overrides : {});
      } else {
        const list = Array.isArray(fJson) ? fJson : [];
        setFeatureDefaults(list);
        setFeatureResolved(list);
        setFeatureOverrides({});
      }
    } catch {
      setError('Failed to load homepage assets');
    }
  }

  useEffect(() => {
    load();
  }, []);

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
    const originals = Object.keys(carouselOverrides);
    if (!originals.length) return;
    setError('');
    setBusy('reset-views-all');
    try {
      for (const o of originals) {
        await resetCarousel(o);
      }
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
    const originals = Object.keys(heroOverrides);
    if (!originals.length) return;
    setError('');
    setBusy('reset-hero-all');
    try {
      for (const o of originals) {
        await resetHero(o);
      }
      await load();
    } catch (e: any) {
      setError(e?.message || 'Reset failed');
    } finally {
      setBusy(null);
    }
  }

  async function resetAllFeatures() {
    const originals = Object.keys(featureOverrides);
    if (!originals.length) return;
    setError('');
    setBusy('reset-features-all');
    try {
      for (const o of originals) {
        await resetFeature(o);
      }
      await load();
    } catch (e: any) {
      setError(e?.message || 'Reset failed');
    } finally {
      setBusy(null);
    }
  }

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
            <button
              onClick={() => resetAllHero()}
              className="rounded border border-ocean px-3 py-2 text-ocean disabled:opacity-50"
              disabled={busy !== null || Object.keys(heroOverrides).length === 0}
            >
              Reset To Defaults
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {heroDefaults.map((originalUrl, idx) => {
            const currentUrl = heroOverrides[originalUrl] || heroResolved[idx] || originalUrl;
            const overridden = !!heroOverrides[originalUrl];
            const picked = replaceHeroFiles[originalUrl] || null;
            return (
            <div key={originalUrl} className="rounded-lg border border-gold/20 bg-pearl p-3">
              <div className="relative h-40 w-full overflow-hidden rounded border border-ocean/10 bg-white">
                <img src={currentUrl} alt={currentUrl} className="h-full w-full object-cover" />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-ocean/70">{overridden ? `${originalUrl} (replaced)` : originalUrl}</span>
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
              </div>
            </div>
          );})}
          {heroDefaults.length === 0 && <div className="text-ocean/70">No hero carousel images found.</div>}
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-gold/30 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-['Playfair Display'] text-ocean">Views Carousel Images</h2>
            <div className="mt-1 text-sm text-ocean/70">Mode: {viewsMode === 'overrides' ? 'Custom overrides' : 'Default set'}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => resetAllCarousel()}
              className="rounded border border-ocean px-3 py-2 text-ocean disabled:opacity-50"
              disabled={busy !== null || Object.keys(carouselOverrides).length === 0}
            >
              Reset To Defaults
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {carouselDefaults.map((originalUrl, idx) => {
            const currentUrl = carouselOverrides[originalUrl] || carouselResolved[idx] || originalUrl;
            const overridden = !!carouselOverrides[originalUrl];
            const picked = replaceFiles[originalUrl] || null;
            return (
            <div key={originalUrl} className="rounded-lg border border-gold/20 bg-pearl p-3">
              <div className="relative h-40 w-full overflow-hidden rounded border border-ocean/10 bg-white">
                <img src={currentUrl} alt={currentUrl} className="h-full w-full object-cover" />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-ocean/70">{overridden ? `${originalUrl} (replaced)` : originalUrl}</span>
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
              </div>
            </div>
          );})}
          {carouselDefaults.length === 0 && <div className="text-ocean/70">No carousel images found.</div>}
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-gold/30 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-['Playfair Display'] text-ocean">Feature Cards</h2>
            <div className="mt-1 text-sm text-ocean/70">Mode: {featuresMode === 'overrides' ? 'Custom overrides' : 'Default set'}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => resetAllFeatures()}
              className="rounded border border-ocean px-3 py-2 text-ocean disabled:opacity-50"
              disabled={busy !== null || Object.keys(featureOverrides).length === 0}
            >
              Reset To Defaults
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {featureDefaults.map((originalUrl, idx) => {
            const currentUrl = featureOverrides[originalUrl] || featureResolved[idx] || originalUrl;
            const overridden = !!featureOverrides[originalUrl];
            const picked = replaceFeatureFiles[originalUrl] || null;
            return (
            <div key={originalUrl} className="rounded-lg border border-gold/20 bg-pearl p-3">
              <div className="relative h-40 w-full overflow-hidden rounded border border-ocean/10 bg-white">
                <img src={currentUrl} alt={currentUrl} className="h-full w-full object-contain" />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-ocean/70">{overridden ? `${originalUrl} (replaced)` : originalUrl}</span>
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
              </div>
            </div>
          );})}
          {featureDefaults.length === 0 && <div className="text-ocean/70">No feature images found.</div>}
        </div>
      </section>
    </main>
  );
}
