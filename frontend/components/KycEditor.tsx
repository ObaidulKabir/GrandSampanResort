'use client';

import { useEffect, useState } from 'react';
import { api, apiUpload } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media';
import { prepareImageForUpload, uploadImageErrorMessage } from '@/lib/uploadImage';
import Button from '@/components/Button';
import PlanOwner from '@/components/PlanOwner';

export type KycRecord = {
  name?: string;
  fatherName?: string;
  nid?: string;
  dob?: string;
  address?: string;
  permanentAddress?: string;
  contact?: string;
  email?: string;
  picUrl?: string;
  profession?: string;
  city?: string;
  nomineeName?: string;
  nomineeNid?: string;
  nomineePicUrl?: string;
};

const OWNER_KEYS = ['name', 'profession', 'city', 'picUrl'] as const;

function emptyForm(client: KycRecord): KycRecord {
  return {
    name: client.name || '',
    fatherName: client.fatherName || '',
    nid: client.nid || '',
    dob: client.dob || '',
    address: client.address || '',
    permanentAddress: client.permanentAddress || '',
    contact: client.contact || '',
    email: client.email || '',
    picUrl: client.picUrl || '',
    profession: client.profession || '',
    city: client.city || '',
    nomineeName: client.nomineeName || '',
    nomineeNid: client.nomineeNid || '',
    nomineePicUrl: client.nomineePicUrl || ''
  };
}

export default function KycEditor({
  bookingId,
  client,
  variant,
  onSaved
}: {
  bookingId: string;
  client: KycRecord;
  variant: 'admin' | 'owner';
  onSaved?: (client: KycRecord) => void;
}) {
  const admin = variant === 'admin';
  const needsPublicFields =
    !String(client.profession || '').trim() || !String(client.city || '').trim();
  const [open, setOpen] = useState(admin || needsPublicFields);
  const [form, setForm] = useState<KycRecord>(() => emptyForm(client));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'pic' | 'nominee' | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(emptyForm(client));
  }, [client]);

  function setField<K extends keyof KycRecord>(key: K, value: KycRecord[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function uploadPhoto(kind: 'pic' | 'nominee', file: File | null) {
    if (!file) return;
    setUploading(kind);
    setError('');
    try {
      const prepared = await prepareImageForUpload(file);
      const data = new FormData();
      data.append('file', prepared);
      const res = await apiUpload('/media/kyc-upload', data);
      if (!res?.ok || !res.url) {
        setError('Photo upload failed. Use JPG, PNG, or WEBP under 20MB.');
        return;
      }
      setField(kind === 'pic' ? 'picUrl' : 'nomineePicUrl', res.url);
    } catch (err) {
      setError(uploadImageErrorMessage(err));
    } finally {
      setUploading(null);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setStatus('');
    const payload: Record<string, string> = {};
    const keys = admin ? (Object.keys(form) as (keyof KycRecord)[]) : [...OWNER_KEYS];
    for (const key of keys) {
      payload[key] = String(form[key] || '').trim();
    }
    try {
      const res = await api(`/booking/${encodeURIComponent(bookingId)}/kyc`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      if (!res?.ok) {
        setError(
          res?.error === 'forbidden'
            ? 'You can only update KYC on your own booking.'
            : res?.error === 'cancelled'
              ? 'This booking was cancelled.'
              : 'Could not save KYC details.'
        );
        return;
      }
      setStatus('Saved');
      if (res.client) {
        setForm(emptyForm(res.client));
        onSaved?.(res.client);
        if (!admin && String(res.client.profession || '').trim() && String(res.client.city || '').trim()) {
          setOpen(false);
        }
      }
    } catch {
      setError('Could not save KYC details.');
    } finally {
      setSaving(false);
    }
  }

  const photo = form.picUrl ? resolveMediaUrl(form.picUrl) : '';
  const nomineePhoto = form.nomineePicUrl ? resolveMediaUrl(form.nomineePicUrl) : '';

  if (!open) {
    return (
      <div className="space-y-3">
        <PlanOwner
          owner={{
            name: form.name || client.name || '—',
            profession: form.profession || client.profession,
            city: form.city || client.city,
            picUrl: form.picUrl || client.picUrl
          }}
          statusLabel="Booked by"
        />
        <button
          type="button"
          className="text-sm font-semibold text-ocean underline"
          onClick={() => setOpen(true)}
        >
          Update details
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="border border-ocean/10 bg-pearl px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-ocean/55">
          Shown on the public catalog
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[5.5rem_1fr]">
          <label className="block text-sm text-ocean">
            <span className="sr-only">Photograph</span>
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="h-20 w-20 border border-ocean/15 object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center border border-dashed border-ocean/25 bg-white text-center text-[10px] leading-tight text-ocean/50">
                Photo
              </div>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
              className="mt-2 block w-full text-[10px] text-ocean/80"
              disabled={!!uploading}
              onChange={(e) => {
                const selected = e.target.files?.[0] || null;
                void uploadPhoto('pic', selected);
                e.target.value = '';
              }}
            />
          </label>
          <div className="grid gap-3">
            <label className="block text-sm text-ocean">
              Full name
              <input
                className="field mt-1"
                value={form.name || ''}
                onChange={(e) => setField('name', e.target.value)}
                autoComplete="name"
              />
            </label>
            <label className="block text-sm text-ocean">
              Profession
              <input
                className="field mt-1"
                value={form.profession || ''}
                onChange={(e) => setField('profession', e.target.value)}
                placeholder="e.g. Businessman, Doctor, Teacher"
              />
            </label>
            <label className="block text-sm text-ocean">
              City / district
              <input
                className="field mt-1"
                value={form.city || ''}
                onChange={(e) => setField('city', e.target.value)}
                placeholder="e.g. Dhaka, Chattogram"
              />
            </label>
          </div>
        </div>
        {(form.name || form.profession || form.city) && (
          <div className="mt-3 border-t border-ocean/10 pt-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-ocean/50">Preview</p>
            <PlanOwner
              owner={{
                name: form.name || 'Name',
                profession: form.profession,
                city: form.city,
                picUrl: form.picUrl
              }}
              statusLabel="Booked by"
            />
          </div>
        )}
      </div>

      {admin && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-ocean/55">Private</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-ocean">
              Father / husband
              <input
                className="field mt-1"
                value={form.fatherName || ''}
                onChange={(e) => setField('fatherName', e.target.value)}
              />
            </label>
            <label className="block text-sm text-ocean">
              NID
              <input
                className="field mt-1"
                value={form.nid || ''}
                onChange={(e) => setField('nid', e.target.value)}
              />
            </label>
            <label className="block text-sm text-ocean">
              Date of birth
              <input
                type="date"
                className="field mt-1"
                value={form.dob || ''}
                onChange={(e) => setField('dob', e.target.value)}
              />
            </label>
            <label className="block text-sm text-ocean">
              Contact
              <input
                className="field mt-1"
                value={form.contact || ''}
                onChange={(e) => setField('contact', e.target.value)}
              />
            </label>
            <label className="block text-sm text-ocean sm:col-span-2">
              Email
              <input
                type="email"
                className="field mt-1"
                value={form.email || ''}
                onChange={(e) => setField('email', e.target.value)}
              />
            </label>
            <label className="block text-sm text-ocean sm:col-span-2">
              Present address
              <textarea
                className="field mt-1 min-h-[4.5rem]"
                rows={2}
                value={form.address || ''}
                onChange={(e) => setField('address', e.target.value)}
              />
            </label>
            <label className="block text-sm text-ocean sm:col-span-2">
              Permanent address
              <textarea
                className="field mt-1 min-h-[4.5rem]"
                rows={2}
                value={form.permanentAddress || ''}
                onChange={(e) => setField('permanentAddress', e.target.value)}
              />
            </label>
            <label className="block text-sm text-ocean">
              Nominee name
              <input
                className="field mt-1"
                value={form.nomineeName || ''}
                onChange={(e) => setField('nomineeName', e.target.value)}
              />
            </label>
            <label className="block text-sm text-ocean">
              Nominee NID
              <input
                className="field mt-1"
                value={form.nomineeNid || ''}
                onChange={(e) => setField('nomineeNid', e.target.value)}
              />
            </label>
            <label className="block text-sm text-ocean sm:col-span-2">
              Nominee photograph
              {nomineePhoto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={nomineePhoto}
                  alt=""
                  className="mt-2 h-20 w-20 border border-ocean/15 object-cover"
                />
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                className="mt-2 block w-full text-xs text-ocean/80"
                disabled={!!uploading}
                onChange={(e) => {
                  const selected = e.target.files?.[0] || null;
                  void uploadPhoto('nominee', selected);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
      {status && <p className="text-sm text-ocean">{status}</p>}
      {uploading && <p className="text-xs text-ocean/65">Uploading photo…</p>}
      <Button type="submit" disabled={saving || !!uploading}>
        {saving ? 'Saving…' : 'Save KYC details'}
      </Button>
    </form>
  );
}
