'use client';

import { resolveMediaUrl } from '@/lib/media';

export type PublicOwner = {
  name: string;
  city?: string;
  profession?: string;
  picUrl?: string | null;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function photoSrc(url?: string | null) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^(blob:|data:)/i.test(raw)) return raw;
  return resolveMediaUrl(raw);
}

function Portrait({
  owner,
  size
}: {
  owner: PublicOwner;
  size: 'sm' | 'md' | 'lg';
}) {
  const photo = photoSrc(owner.picUrl);
  const box = size === 'lg' ? 'h-14 w-14' : size === 'md' ? 'h-12 w-12' : 'h-7 w-7';
  const type = size === 'sm' ? 'text-[10px]' : 'text-xs';
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt=""
        className={`${box} shrink-0 border border-ocean/15 object-cover`}
      />
    );
  }
  return (
    <div
      className={`flex ${box} shrink-0 items-center justify-center border border-ocean/15 bg-white ${type} font-bold text-ocean`}
    >
      {initials(owner.name) || '•'}
    </div>
  );
}

export default function PlanOwner({
  owner,
  statusLabel,
  compact = false
}: {
  owner: PublicOwner;
  statusLabel?: string;
  compact?: boolean;
}) {
  const profession = String(owner.profession || '').trim();
  const city = String(owner.city || '').trim();

  if (compact) {
    return (
      <span className="inline-flex min-w-0 items-center gap-2">
        <Portrait owner={owner} size="sm" />
        <span className="min-w-0 truncate text-ocean/80">
          <span className="font-medium text-ocean">{owner.name}</span>
          {profession ? <span className="text-ocean/55"> · {profession}</span> : null}
          {city ? <span className="text-ocean/55"> · from {city}</span> : null}
        </span>
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Portrait owner={owner} size="md" />
      <div className="min-w-0">
        {statusLabel && (
          <p className="text-[10px] font-bold uppercase tracking-wide text-ocean/55">{statusLabel}</p>
        )}
        <p className="truncate font-semibold text-ocean">{owner.name}</p>
        {profession ? <p className="truncate text-sm text-ocean/75">{profession}</p> : null}
        {city ? <p className="truncate text-xs text-ocean/60">from {city}</p> : null}
      </div>
    </div>
  );
}
