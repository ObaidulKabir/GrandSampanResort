const fs = require('fs');
const p = 'app/(site)/[locale]/pricing/plans/[id]/page.tsx';
let s = fs.readFileSync(p, 'utf8');

s = s.replace(
  /\? 'Hide installment options'\s*:\s*'Need smaller monthly payments\?'/,
  "? t('hideInstallments')\n                    : t('needSmaller')"
);

s = s.replace(
  /Fill this for the person the share is booked for\. After booking, other buyers see your\s+photo, name, profession, and city — so they can tell who already invested\. NID, phone,\s+and full address stay private\./,
  "{t('step2Hint')}"
);

s = s.replace(
  /<span className="sr-only">Photograph<\/span>/,
  '<span className="sr-only">{t(\'kycPic\')}</span>'
);

s = s.replace(
  /Photo\s*<br \/>\s*required/,
  "{t('photoRequired')}"
);

s = s.replace(
  /<label className="block text-sm text-ocean sm:col-span-2">\s*Email/,
  '<label className="block text-sm text-ocean sm:col-span-2">\n                {t(\'kycEmail\')}'
);

s = s.replace(
  /Send the amount due today by cheque, cash\/pay order, or bank transfer, then add the\s+reference so we can match it\./,
  "{t('step3Hint')}"
);

s = s.replace(
  /Proof of payment \{t\('optional'\)\}/,
  "{t('proofOptional')}"
);

s = s.replace(
  /Note \{t\('optional'\)\}/,
  "{t('noteOptional')}"
);

s = s.replace(
  /\{cadence === 'monthly' \? 'Monthly' : 'Quarterly'\} installment × \{installmentCount\}/,
  "{cadence === 'monthly' ? t('monthlyInstallment', { count: installmentCount }) : t('quarterlyInstallment', { count: installmentCount })}"
);

s = s.replace(
  /\{buying\s*\?\s*'Submitting\.\.\.'\s*:\s*!available\s*\?\s*'No longer available'\s*:\s*token && !emailVerified\s*\?\s*'Verify email to continue'\s*:\s*!kycComplete\s*\?\s*onlyPhotosMissing\s*\?\s*'Upload photographs to continue'\s*:\s*'Add your details to continue'\s*:\s*!depositReference\.trim\(\)\s*\?\s*'Add a payment reference'\s*:\s*'Reserve this plan'\}/,
  `{buying
              ? t('btnSubmitting')
              : !available
                ? t('btnUnavailable')
                : token && !emailVerified
                  ? t('btnVerifyContinue')
                  : !kycComplete
                    ? onlyPhotosMissing
                      ? t('btnUploadPhotos')
                      : t('btnAddDetails')
                    : !depositReference.trim()
                      ? t('btnAddRef')
                      : t('btnReserve')}`
);

s = s.replace(
  /\{showTools \? 'Hide' : 'Show'\} payment tools & returns calculator/,
  "{showTools ? t('hideTools') : t('showTools')}"
);

s = s.replace(
  /This table is the live quote for the payment plan selected in the sidebar\. The sliders below are\s+illustrative only and do not change the booking\./,
  "{t('scheduleHint')}"
);

s = s.replace(
  /Preview of the first rows\. Checkout uses booking 10% \+ downpayment 20% \+ 24-month\{\' '\}\s*\{cadence\} installments \(\{installmentCount\} payments of about \{formatMoney\(installmentAmount\)\}\)\./,
  "{t('schedulePreview', { cadence, count: installmentCount, amount: formatMoney(installmentAmount) })}"
);

s = s.replace(
  /Cadence\n/,
  "{t('cadence')}\n"
);

s = s.replace(
  />Dashboard</,
  ">{t('dashboard')}<"
);

s = s.replace(
  />Continue</,
  ">{t('mobileContinue')}<"
);

// fix Note if still English
s = s.replace(/>Note \(optional\)/, ">{t('noteOptional')}");
s = s.replace(/>Proof of payment \(optional\)/, ">{t('proofOptional')}");

fs.writeFileSync(p, s);
console.log('cleanup done');

// count remaining likely English UI
const leftovers = [];
for (const m of s.matchAll(/['"`]([A-Z][^'"`]{12,})['"`]/g)) {
  const v = m[1];
  if (/^(Booked by|Unsold|Share plan|Cheque|Cash|Online|Best fit)/.test(v)) continue;
  if (v.includes('gsr_') || v.includes('http') || v.includes('/') || v.includes('border') || v.includes('text-') || v.includes('px-') || v.includes('className')) continue;
  if (v.includes('err') || v.startsWith('use ') || v.includes('React')) continue;
  leftovers.push(v.slice(0, 80));
}
console.log('sample leftovers', [...new Set(leftovers)].slice(0, 40));
