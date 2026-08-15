const fs = require('fs');
const p = 'app/(site)/[locale]/pricing/plans/[id]/page.tsx';
let s = fs.readFileSync(p, 'utf8');

if (!s.includes("from 'next-intl'")) {
  s = s.replace(
    "import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';",
    "import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';\nimport { useTranslations } from 'next-intl';"
  );
}

if (!s.includes("useTranslations('planDetails')")) {
  s = s.replace(
    'export default function PlanDetailsPage({ params }: { params: { id: string } }) {',
    "export default function PlanDetailsPage({ params }: { params: { id: string } }) {\n  const t = useTranslations('planDetails');"
  );
}

const kycOld = `const KYC_FIELD_LABELS: Record<keyof KycForm, string> = {
  name: 'Full name',
  fatherName: 'Father / husband name',
  nid: 'NID number',
  dob: 'Date of birth',
  address: 'Present address',
  permanentAddress: 'Permanent address',
  contact: 'Contact number',
  email: 'Email',
  picUrl: 'Buyer photograph',
  profession: 'Profession',
  city: 'City / district',
  nomineeName: 'Nominee name',
  nomineeNid: 'Nominee NID',
  nomineePicUrl: 'Nominee photograph'
};`;

const kycNew = `function kycFieldLabels(t: (key: string) => string): Record<keyof KycForm, string> {
  return {
    name: t('kycName'),
    fatherName: t('kycFatherName'),
    nid: t('kycNid'),
    dob: t('kycDob'),
    address: t('kycAddress'),
    permanentAddress: t('kycPermanentAddress'),
    contact: t('kycContact'),
    email: t('kycEmail'),
    picUrl: t('kycPic'),
    profession: t('kycProfession'),
    city: t('kycCity'),
    nomineeName: t('kycNomineeName'),
    nomineeNid: t('kycNomineeNid'),
    nomineePicUrl: t('kycNomineePic')
  };
}`;

if (s.includes(kycOld)) s = s.replace(kycOld, kycNew);
else console.warn('KYC block miss');

const depOld = `const DEPOSIT_METHOD_LABELS: Record<DepositMethod, string> = {
  cheque: 'Cheque',
  cash_payorder: 'Cash / pay order',
  online_transfer: 'Online transfer'
};`;

const depNew = `function depositMethodLabels(t: (key: string) => string): Record<DepositMethod, string> {
  return {
    cheque: t('depositCheque'),
    cash_payorder: t('depositCash'),
    online_transfer: t('depositOnline')
  };
}`;

if (s.includes(depOld)) s = s.replace(depOld, depNew);
else console.warn('DEPOSIT block miss');

s = s.replace(/KYC_FIELD_LABELS\[/g, 'kycFieldLabels(t)[');
s = s.replace(/DEPOSIT_METHOD_LABELS\[/g, 'depositMethodLabels(t)[');

const pairs = [
  ["setReferralHint(`Referrer: ${res.referrer?.name || res.code}`)", "setReferralHint(t('referrer', { name: res.referrer?.name || res.code }))"],
  ["setReferralHint('You cannot use your own referral code')", "setReferralHint(t('selfReferral'))"],
  ["setReferralHint('Code not recognized')", "setReferralHint(t('codeUnrecognized'))"],
  ["setError('Failed to load plan details')", "setError(t('loadFailed'))"],
  ["? 'Photo upload failed — please sign in again, then re-upload.'", "? t('photoUploadAuth')"],
  [": 'Photo upload failed. Use JPG, PNG, WEBP, or GIF under 20MB.';", ": t('photoUploadFailed');"],
  ["setStatus('Proof upload failed. Use JPG, PNG, WEBP, or GIF under 20MB.')", "setStatus(t('proofUploadFailed'))"],
  ["setStatus('This plan is not linked to a suite')", "setStatus(t('planNotLinked'))"],
  ["setStatus('Verify your account email before submitting a booking')", "setStatus(t('verifyBeforeSubmit'))"],
  ["? `Still needed: ${missing.join(', ')}`", "? t('stillNeeded', { fields: missing.join(', ') })"],
  [": 'Complete all KYC fields and upload both photographs before confirming'", ": t('completeKyc')"],
  ["setStatus('Enter a payment reference (cheque no., pay order no., or transfer ref)')", "setStatus(t('enterPaymentRef'))"],
  ["setStatus('This plan is no longer available')", "setStatus(t('planUnavailable'))"],
  ["setStatus('Submitting your booking...')", "setStatus(t('submitting'))"],
  ["? 'Verify your account email before booking'", "? t('errEmailNotVerified')"],
  [": 'Add all required details and photographs before booking'", ": t('errKycRequired')"],
  [": 'Select a payment method and enter the payment reference'", ": t('errDepositRequired')"],
  [": 'Plan already sold or unavailable'", ": t('errPlanUnavailable')"],
  [": 'Plan not found'", ": t('errPlanNotFound')"],
  [": 'This plan is not linked to the selected unit'", ": t('errSuiteMismatch')"],
  [": 'Unit not found'", ": t('errSuiteNotFound')"],
  [": 'This price quote expired. Review the updated total, then submit again.'", ": t('errQuoteExpired')"],
  [": 'Another booking is in progress — please try again'", ": t('errConflict')"],
  [": 'Could not complete booking. Please try again.'", ": t('errBookingFailed')"],
  [": 'Purchase failed';", ": t('errPurchaseFailed');"],
  ["setStatus('Purchase failed')", "setStatus(t('errPurchaseFailed'))"],
];

let hit = 0;
for (const [a, b] of pairs) {
  if (s.includes(a)) {
    s = s.split(a).join(b);
    hit++;
  } else console.warn('MISS', a.slice(0, 70));
}
console.log('status pairs hit', hit);

fs.writeFileSync(p, s);
console.log('plan details phase1 written', s.length);
