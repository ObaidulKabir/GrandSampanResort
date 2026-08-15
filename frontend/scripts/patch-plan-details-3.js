const fs = require('fs');
const p = 'app/(site)/[locale]/pricing/plans/[id]/page.tsx';
let s = fs.readFileSync(p, 'utf8');

// Replace KYC labels const with function via regex
s = s.replace(
  /const KYC_FIELD_LABELS: Record<keyof KycForm, string> = \{[\s\S]*?\n\};/,
  `function kycFieldLabels(t: (key: string) => string): Record<keyof KycForm, string> {
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
}`
);

s = s.replace(
  /const DEPOSIT_METHOD_LABELS: Record<DepositMethod, string> = \{[\s\S]*?\n\};/,
  `function depositMethodLabels(t: (key: string) => string): Record<DepositMethod, string> {
  return {
    cheque: t('depositCheque'),
    cash_payorder: t('depositCash'),
    online_transfer: t('depositOnline')
  };
}`
);

// remaining error map
const errPairs = [
  ["? 'Add all required details and photographs before booking'", "? t('errKycRequired')"],
  ["? 'Select a payment method and enter the payment reference'", "? t('errDepositRequired')"],
  ["? 'Plan already sold or unavailable'", "? t('errPlanUnavailable')"],
  ["? 'Plan not found'", "? t('errPlanNotFound')"],
  ["? 'This plan is not linked to the selected unit'", "? t('errSuiteMismatch')"],
  ["? 'Unit not found'", "? t('errSuiteNotFound')"],
  ["? 'This price quote expired. Review the updated total, then submit again.'", "? t('errQuoteExpired')"],
  ["? 'Another booking is in progress — please try again'", "? t('errConflict')"],
  ["? 'Could not complete booking. Please try again.'", "? t('errBookingFailed')"],
];
for (const [a, b] of errPairs) {
  if (s.includes(a)) s = s.split(a).join(b);
  else console.warn('err miss', a.slice(0, 50));
}

// confirmation body leftovers
s = s.replace(
  /\{suite\?\.id \? ` on suite \$\{suite\.id\}` : ''\} is reserved\. The booking will be completed after[\s\S]*?the booking is completed\./,
  "{suite?.id ? t('confirmOnSuite', { id: suite.id }) : ''}{t('confirmBody')}"
);

s = s.replace(
  /\{depositMethodLabels\(t\)\[confirmation\.depositMethod\]\} · Ref{' '\}/,
  "{depositMethodLabels(t)[confirmation.depositMethod]}{t('refLabel')}"
);

s = s.replace(
  'Your details and payment reference were sent with this booking. Questions?',
  "{t('confirmFooter')}"
);

s = s.replace(
  /plan\s*\?\s*`\$\{plan\.daysPerMonth\} days each month · share held \$\{plan\.lockIn \?\? 36\} months`\s*:\s*'Loading\.\.\.'/,
  "plan ? t('planMeta', { days: plan.daysPerMonth, months: plan.lockIn ?? 36 }) : t('loading')"
);

fs.writeFileSync(p, s);
console.log('phase3 ok', s.includes('function kycFieldLabels'), s.includes('function depositMethodLabels'));
