'use client';

import { useState } from 'react';

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

type Props = {
  data: KycData;
  onChange: (updated: KycData) => void;
  userEmail?: string;
  userName?: string;
};

export default function KycStepForm({ data, onChange, userEmail, userName }: Props) {
  const [sameAddress, setSameAddress] = useState(false);

  const updateField = (key: keyof KycData, val: string) => {
    const next = { ...data, [key]: val };
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

  return (
    <div className="space-y-6 text-left">
      <div className="rounded-lg border border-ocean/10 bg-pearl/40 p-4">
        <h3 className="font-display text-lg text-ocean">1. Investor Identification (KYC)</h3>
        <p className="mt-0.5 text-xs text-ocean/60">
          Required for deed registration and legal fractional share ownership.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
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

      {/* Nominee Details Section */}
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
        </div>
      </div>
    </div>
  );
}
