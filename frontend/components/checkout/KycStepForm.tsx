'use client';

import { useEffect, useRef, useState } from 'react';
import { apiUpload } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media';
import { prepareImageForUpload, uploadImageErrorMessage } from '@/lib/uploadImage';

export type KycData = {
  name: string;
  fatherName: string;
  nid: string;
  dob: string;
  profession: string;
  city: string;
  address: string;
  permanentAddress: string;
  contact: string;
  email: string;
  picUrl: string;
  nomineeName: string;
  nomineeNid: string;
  nomineePicUrl: string;
};

const PHOTO_ACCEPT =
  'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif';

type PhotoKind = 'pic' | 'nominee';

type Props = {
  data: KycData;
  onChange: (updated: KycData) => void;
  userEmail?: string;
  userName?: string;
  onBusyChange?: (busy: boolean) => void;
  onAuthRequired?: () => boolean;
};

function PhotoField({
  label,
  hint,
  url,
  uploading,
  error,
  disabled,
  onSelect
}: {
  label: string;
  hint?: string;
  url: string;
  uploading: boolean;
  error?: string;
  disabled?: boolean;
  onSelect: (file: File | null) => void;
}) {
  const [preview, setPreview] = useState('');

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const src = url ? resolveMediaUrl(url) : preview;

  return (
    <label className="block sm:col-span-2">
      <span className="text-xs font-semibold text-ocean">{label} *</span>
      {hint ? <span className="mt-0.5 block text-[11px] text-ocean/60">{hint}</span> : null}
      <div className="mt-2 flex items-start gap-3">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-20 w-20 border border-ocean/15 object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center border border-dashed border-ocean/25 bg-white text-center text-[10px] leading-tight text-ocean/50">
            Photo required
          </div>
        )}
        <div className="min-w-0 flex-1">
          <input
            type="file"
            accept={PHOTO_ACCEPT}
            className="block w-full text-xs text-ocean/80"
            disabled={disabled || uploading}
            onChange={(e) => {
              const selected = e.target.files?.[0] || null;
              if (selected) {
                const next = URL.createObjectURL(selected);
                setPreview((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return next;
                });
              }
              onSelect(selected);
              e.target.value = '';
            }}
          />
          {uploading && <span className="mt-1 block text-xs font-medium text-ocean/70">Uploading photo…</span>}
          {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
          {url && !uploading && !error && <span className="mt-1 block text-xs text-ocean/60">Uploaded</span>}
          {!url && !uploading && !error && (
            <span className="mt-1 block text-xs text-gold">Choose a JPG, PNG, or WEBP photo</span>
          )}
        </div>
      </div>
    </label>
  );
}

export default function KycStepForm({ data, onChange, userEmail, userName, onBusyChange, onAuthRequired }: Props) {
  const [sameAddress, setSameAddress] = useState(false);
  const [uploading, setUploading] = useState<PhotoKind | null>(null);
  const [photoError, setPhotoError] = useState<{ pic?: string; nominee?: string }>({});
  const dataRef = useRef(data);
  dataRef.current = data;

  const updateField = (key: keyof KycData, val: string) => {
    const next = { ...dataRef.current, [key]: val };
    if (sameAddress && key === 'address') {
      next.permanentAddress = val;
    }
    onChange(next);
  };

  const handleSameAddressChange = (checked: boolean) => {
    setSameAddress(checked);
    if (checked) {
      onChange({ ...data, permanentAddress: data.address });
    }
  };

  async function uploadPhoto(kind: PhotoKind, file: File | null) {
    if (!file) return;
    if (onAuthRequired && !onAuthRequired()) return;
    setUploading(kind);
    onBusyChange?.(true);
    setPhotoError((prev) => ({ ...prev, [kind]: undefined }));
    try {
      const prepared = await prepareImageForUpload(file);
      const form = new FormData();
      form.append('file', prepared);
      const res = await apiUpload('/media/kyc-upload', form);
      if (!res?.ok || !res.url) {
        const authFailed = res?.status === 401 || res?.status === 403;
        const message = authFailed
          ? 'Please sign in to upload KYC photographs.'
          : 'Photo upload failed. Use JPG, PNG, or WEBP under 20MB.';
        setPhotoError((prev) => ({ ...prev, [kind]: message }));
        return;
      }
      updateField(kind === 'pic' ? 'picUrl' : 'nomineePicUrl', res.url);
    } catch (err) {
      setPhotoError((prev) => ({ ...prev, [kind]: uploadImageErrorMessage(err) }));
    } finally {
      setUploading(null);
      onBusyChange?.(false);
    }
  }

  return (
    <div className="space-y-6 text-left">
      <div className="rounded-lg border border-ocean/10 bg-pearl/40 p-4">
        <h3 className="font-display text-lg text-ocean">1. Investor Identification (KYC)</h3>
        <p className="mt-0.5 text-xs text-ocean/60">
          Required for deed registration and legal fractional share ownership.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <PhotoField
            label="Client photograph"
            hint="Clear face photo. Shown on the public catalog after booking."
            url={data.picUrl || ''}
            uploading={uploading === 'pic'}
            error={photoError.pic}
            disabled={!!uploading}
            onSelect={(file) => void uploadPhoto('pic', file)}
          />

          <label className="block">
            <span className="text-xs font-semibold text-ocean">Full Legal Name *</span>
            <input
              type="text"
              required
              className="field mt-1"
              placeholder="e.g. Obaydullah Kabir"
              value={data.name || userName || ''}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-ocean">Father's / Spouse Name *</span>
            <input
              type="text"
              required
              className="field mt-1"
              placeholder="Full name as per NID"
              value={data.fatherName || ''}
              onChange={(e) => updateField('fatherName', e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-ocean">NID / Smart Card Number *</span>
            <input
              type="text"
              required
              className="field mt-1 font-mono text-sm"
              placeholder="e.g. 1990123456789"
              value={data.nid || ''}
              onChange={(e) => updateField('nid', e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-ocean">Date of Birth *</span>
            <input
              type="date"
              required
              className="field mt-1"
              value={data.dob || ''}
              onChange={(e) => updateField('dob', e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-ocean">Contact Number (Phone/WhatsApp) *</span>
            <input
              type="tel"
              required
              className="field mt-1"
              placeholder="+880 1700 000000"
              value={data.contact || ''}
              onChange={(e) => updateField('contact', e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-ocean">Email Address *</span>
            <input
              type="email"
              required
              className="field mt-1"
              placeholder="investor@example.com"
              value={data.email || userEmail || ''}
              onChange={(e) => updateField('email', e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-ocean">Profession *</span>
            <input
              type="text"
              required
              className="field mt-1"
              placeholder="e.g. Business / Software Engineer"
              value={data.profession || ''}
              onChange={(e) => updateField('profession', e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-ocean">City *</span>
            <input
              type="text"
              required
              className="field mt-1"
              placeholder="e.g. Dhaka"
              value={data.city || ''}
              onChange={(e) => updateField('city', e.target.value)}
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-ocean">Present Address *</span>
            <textarea
              rows={2}
              required
              className="field mt-1"
              placeholder="House, Road, Area, Thana, City"
              value={data.address || ''}
              onChange={(e) => updateField('address', e.target.value)}
            />
          </label>

          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="sameAddress"
              checked={sameAddress}
              onChange={(e) => handleSameAddressChange(e.target.checked)}
              className="h-4 w-4 rounded border-ocean/20 text-gold focus:ring-gold"
            />
            <label htmlFor="sameAddress" className="text-xs font-medium text-ocean cursor-pointer">
              Permanent address is same as present address
            </label>
          </div>

          {!sameAddress && (
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold text-ocean">Permanent Address *</span>
              <textarea
                rows={2}
                required
                className="field mt-1"
                placeholder="Village/Road, Post Office, Upazila, District"
                value={data.permanentAddress || ''}
                onChange={(e) => updateField('permanentAddress', e.target.value)}
              />
            </label>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-ocean/10 bg-pearl/40 p-4">
        <h3 className="font-display text-lg text-ocean">2. Nominee Designation</h3>
        <p className="mt-0.5 text-xs text-ocean/60">
          Designate the beneficiary for your fractional share ownership.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-ocean">Nominee Full Name *</span>
            <input
              type="text"
              required
              className="field mt-1"
              placeholder="Full legal name of nominee"
              value={data.nomineeName || ''}
              onChange={(e) => updateField('nomineeName', e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-ocean">Nominee NID / Birth Cert *</span>
            <input
              type="text"
              required
              className="field mt-1 font-mono text-sm"
              placeholder="NID or passport number"
              value={data.nomineeNid || ''}
              onChange={(e) => updateField('nomineeNid', e.target.value)}
            />
          </label>

          <PhotoField
            label="Nominee photograph"
            hint="Private KYC record — not shown on the public catalog."
            url={data.nomineePicUrl || ''}
            uploading={uploading === 'nominee'}
            error={photoError.nominee}
            disabled={!!uploading}
            onSelect={(file) => void uploadPhoto('nominee', file)}
          />
        </div>
      </div>
    </div>
  );
}
